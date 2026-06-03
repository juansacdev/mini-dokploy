import { type TCreateDeploymentInput, type IServiceCreateArgs } from "./db/definitions/deployment"
import { buildTraefikLabels, generateSubdomain, sanitizeStr } from './traefik'
import { config } from '../config'
import path from 'node:path'
import fs from 'node:fs'
import { execFile } from 'node:child_process'
import { db } from './db'
import { deployment, TDeployment, DeploymentStatus } from './db/schema'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

// step 1
export const buildCloneRepositoryArgs = (args: {
  repositoryUrl: string
  repositoryPath: string
}): string[] => {
  return [
    'clone',
    args.repositoryUrl,
    args.repositoryPath,
  ]
}

// step 2
export const buildImageArgs = (args: {
  dockerfilePath: string
  imageTag: string
  contextDir: string
}): string[] => {
  return [
    'build',
    '--file', path.join(args.contextDir, args.dockerfilePath), // dockerfilePath relative to contextDir
    '--tag', args.imageTag,
    args.contextDir, // directory from cloned repository (git clone <repositoryUrl> into a temp dir)
  ]
}

export const buildServiceCreateArgs = (args: IServiceCreateArgs): string[] => {
  const slug = sanitizeStr(args.serviceName)
  const labels = buildTraefikLabels({
    port: args.port,
    serviceName: args.serviceName,
    customLabels: args.customLabels,
  })

  const labelFlags = Object.entries(labels).flatMap(([key, value]) => ['--label', `${key}=${value}`])

  return [
    'service',
    'create',
    '--name', slug,
    '--network', config.swarmNetwork,
    ...labelFlags,
    args.image
  ]
}

const executeCommand = async (command: string, args: string[]):
  Promise<
    | { success: true, message: string, args: string[] }
    | { success: false, error: string, message: string, args: string[] }
  > => {
  return new Promise((resolve) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) {
        return resolve({
          success: false,
          error: error.message,
          message: `Failed to execute command ${command} with error: ${stderr}`,
          args: args
        })
      }

      return resolve({
        success: true,
        message: `Command ${command} executed successfully with output: ${stdout}`,
        args: args
      })
    })
  })
}

export const list = async (): Promise<TDeployment[]> => {
  return db.select().from(deployment)
}

export const deploy = async (input: TCreateDeploymentInput): Promise<TDeployment> => {
  const slug = sanitizeStr(input.serviceName)
  const imageTag = `${slug}:latest`

  const deploymentRow = db
    .insert(deployment)
    .values({
      status: DeploymentStatus.DEPLOYING,
      dockerfile: input.dockerfilePath,
      port: input.port,
      subdomain: generateSubdomain(input.serviceName),
      serviceName: slug,
      customLabels: input.customLabels,
      repositoryUrl: input.repositoryUrl,
    })
    .returning({ id: deployment.id })
    .get()

  try {
    // step 1 - idempotent clone the repository
    const tempDir = config.buildDir
    const repositoryName = path.basename(input.repositoryUrl).replace(/\.git$/, '')
    const repositoryPath = path.join(tempDir, repositoryName)

    if (fs.existsSync(repositoryPath)) {
      fs.rmSync(repositoryPath, { recursive: true, force: true })
    }

    const cloneRepositoryArgs = buildCloneRepositoryArgs({
      repositoryUrl: input.repositoryUrl,
      repositoryPath: repositoryPath
    })

    const cloneRepositoryResult = await executeCommand('git', cloneRepositoryArgs)
    if (!cloneRepositoryResult.success) throw new Error(cloneRepositoryResult.error, { cause: cloneRepositoryResult.message })

    // step 2 - build the image
    const imageArgs = buildImageArgs({
      dockerfilePath: input.dockerfilePath,
      imageTag: imageTag,
      contextDir: repositoryPath,
    })

    const buildImageResult = await executeCommand('docker', imageArgs)
    if (!buildImageResult.success) throw new Error(buildImageResult.error, { cause: buildImageResult.message })

    // step 3 - create the service
    const serviceCreateArgs = buildServiceCreateArgs({
      serviceName: slug,
      image: imageTag,
      port: input.port,
      customLabels: input.customLabels,
    })

    const serviceCreateResult = await executeCommand('docker', serviceCreateArgs)
    if (!serviceCreateResult.success) throw new Error(serviceCreateResult.error, { cause: serviceCreateResult.message })

    return db.update(deployment).set({
      status: DeploymentStatus.DEPLOYED,
    })
      .where(eq(deployment.id, deploymentRow.id))
      .returning()
      .get()

  } catch (error) {
    await db.update(deployment).set({
      status: DeploymentStatus.FAILED,
    })
      .where(eq(deployment.id, deploymentRow.id))
      .execute()

    console.error(error)

    throw error
  }
}

export const remove = async (id: string) => {
  const deploymentRow = db
    .select({ id: deployment.id, serviceName: deployment.serviceName })
    .from(deployment)
    .where(eq(deployment.id, id))
    .get()

  if (!deploymentRow) throw new TRPCError({ code: 'NOT_FOUND', message: `Deployment with id ${id} not found` })

  const removeServiceResult = await executeCommand('docker', ['service', 'rm', deploymentRow.serviceName])

  if (!removeServiceResult.success) {
    const isNotFoundError = removeServiceResult.error.includes('not found')

    if (!isNotFoundError) throw new Error(removeServiceResult.error, { cause: removeServiceResult.message })

    // Tolerate if the service is not found (it might have been removed already)
    // log the error and continue with the deletion in db
    console.error({ error: removeServiceResult.error, message: removeServiceResult.message })
  }

  return db.delete(deployment).where(eq(deployment.id, id)).run()
}

export const redeploy = async (id: string) => {
  const deploymentRow = db
    .select()
    .from(deployment)
    .where(eq(deployment.id, id))
    .get()

  if (!deploymentRow) throw new TRPCError({ code: 'NOT_FOUND', message: `Deployment with id ${id} not found` })

  await db.update(deployment).set({ status: DeploymentStatus.DEPLOYING })
    .where(eq(deployment.id, deploymentRow.id))
    .execute()

  try {
    // step 1 - idempotent clone the repository
    const tempDir = config.buildDir
    const repositoryName = path
      .basename(deploymentRow.repositoryUrl)// https://github.com/Dokploy/dokploy.git -> dokploy.git
      .replace(/\.git$/, '') // dokploy.git -> dokploy
    const repositoryPath = path.join(tempDir, repositoryName)

    if (fs.existsSync(repositoryPath)) {
      fs.rmSync(repositoryPath, { recursive: true, force: true })
    }

    const cloneRepositoryArgs = buildCloneRepositoryArgs({
      repositoryUrl: deploymentRow.repositoryUrl,
      repositoryPath: repositoryPath
    })

    const cloneRepositoryResult = await executeCommand('git', cloneRepositoryArgs)
    if (!cloneRepositoryResult.success) throw new Error(cloneRepositoryResult.error, { cause: cloneRepositoryResult.message })

    // step 2 - build the image
    const imageArgs = buildImageArgs({
      dockerfilePath: deploymentRow.dockerfile,
      imageTag: `${deploymentRow.serviceName}:latest`,
      contextDir: repositoryPath,
    })

    const buildImageResult = await executeCommand('docker', imageArgs)
    if (!buildImageResult.success) throw new Error(buildImageResult.error, { cause: buildImageResult.message })

    // step 3 - remove the service
    const removeServiceResult = await executeCommand('docker', ['service', 'rm', deploymentRow.serviceName])

    if (!removeServiceResult.success) {
      const isNotFoundError = removeServiceResult.error.includes('not found')

      if (!isNotFoundError) throw new Error(removeServiceResult.error, { cause: removeServiceResult.message })

      // Tolerate if the service is not found (it might have been removed already)
      // log the error and continue with the deletion in db
      console.error({ error: removeServiceResult.error, message: removeServiceResult.message })
    }

    // step 4 - create the service
    const createServiceArgs = buildServiceCreateArgs({
      serviceName: deploymentRow.serviceName,
      image: `${deploymentRow.serviceName}:latest`,
      port: deploymentRow.port,
      customLabels: deploymentRow.customLabels ?? {},
    })

    const createServiceResult = await executeCommand('docker', createServiceArgs)
    if (!createServiceResult.success) throw new Error(createServiceResult.error, { cause: createServiceResult.message })

    return db.update(deployment).set({
      status: DeploymentStatus.DEPLOYED,
    })
      .where(eq(deployment.id, deploymentRow.id))
      .returning()
      .get()

  } catch (error) {
    await db.update(deployment).set({
      status: DeploymentStatus.FAILED,
    })
      .where(eq(deployment.id, deploymentRow.id))
      .execute()

    console.error(error)

    throw error
  }
}
