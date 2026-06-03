import { useState } from "react"
import type { FormEvent } from "react"
import { trpc } from "../lib/trpc"
import { authClient } from "../lib/auth-client"
import { DeploymentStatus, TDeploymentStatus } from '../server/db/schema'

type TLabelRow = { key: string; value: string }

const FINAL_STATUSES: TDeploymentStatus[] = [DeploymentStatus.DEPLOYED, DeploymentStatus.FAILED]
const isFinal = (status: TDeploymentStatus) => FINAL_STATUSES.includes(status)

const statusColor = (status: TDeploymentStatus): string => {
  if (status === DeploymentStatus.DEPLOYED) return "#1a7f37"
  if (status === DeploymentStatus.FAILED) return "#cf222e"
  return "#9a6700" // DEPLOYING
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ verticalAlign: "-2px" }} aria-label="loading">
      <circle cx="12" cy="12" r="9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <path d="M12 3 a9 9 0 0 1 9 9" fill="none" stroke="#9a6700" strokeWidth="3" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
  )
}

const inputStyle: React.CSSProperties = {
  padding: "7px 9px",
  border: "1px solid #d0d7de",
  borderRadius: 6,
  fontSize: 14,
  width: "100%",
}

const btnStyle: React.CSSProperties = {
  padding: "7px 12px",
  border: "1px solid #d0d7de",
  borderRadius: 6,
  background: "#f6f8fa",
  fontSize: 13,
  cursor: "pointer",
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }
const pageStyle: React.CSSProperties = { maxWidth: 860, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif", color: "#1f2328" }

const Req = () => <span style={{ color: "#cf222e" }}> *</span>

// ─────────────── Auth (sign in / sign up) ───────────────
function AuthGate() {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    setPending(true)
    const result =
      mode === "signup"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password })
    setPending(false)
    if (result.error) setError(result.error.message ?? "Something went wrong")
    // on success, the useSession() in Home updates and renders the dashboard
  }

  return (
    <main style={{ ...pageStyle, maxWidth: 380 }}>
      <h1 style={{ fontSize: 22 }}>Mini-Dokploy</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, border: "1px solid #d0d7de", borderRadius: 10, padding: 18 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>{mode === "signup" ? "Create account" : "Sign in"}</h2>
        {mode === "signup" && (
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
        )}
        <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
        <input style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required />
        <button type="submit" disabled={pending} style={{ ...btnStyle, background: "#1f883d", color: "#fff", border: "1px solid #1a7f37" }}>
          {pending ? "…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
        {error && <p style={{ color: "#cf222e", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} style={{ ...btnStyle, background: "none", border: "none", color: "#0969da", padding: 0, textAlign: "left" }}>
          {mode === "signup" ? "Already have an account? Sign in" : "No account? Create one"}
        </button>
      </form>
    </main>
  )
}

// ─────────────── Dashboard (deployments) ───────────────
function Dashboard({ email }: { email: string }) {
  const utils = trpc.useUtils()
  const invalidate = () => utils.deployments.list.invalidate()

  const list = trpc.deployments.list.useQuery()
  const create = trpc.deployments.create.useMutation({ onSuccess: invalidate })
  const remove = trpc.deployments.remove.useMutation({ onSuccess: invalidate })
  const redeploy = trpc.deployments.redeploy.useMutation({ onSuccess: invalidate })

  const [name, setName] = useState("")
  const [repositoryUrl, setRepositoryUrl] = useState("")
  const [dockerfilePath, setDockerfilePath] = useState("")
  const [port, setPort] = useState("")
  const [labels, setLabels] = useState<TLabelRow[]>([{ key: "", value: "" }])

  const updateLabel = (index: number, field: keyof TLabelRow, value: string) =>
    setLabels((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  const addLabel = () => setLabels((prev) => [...prev, { key: "", value: "" }])
  const removeLabel = (index: number) => setLabels((prev) => prev.filter((_, i) => i !== index))

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const customLabels = Object.fromEntries(
      labels.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value]),
    )
    create.mutate({
      serviceName: name,
      repositoryUrl,
      dockerfilePath,
      port: Number(port),
      customLabels: Object.keys(customLabels).length ? customLabels : undefined,
    })
  }

  return (
    <main style={pageStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22 }}>Mini-Dokploy</h1>
        <div style={{ fontSize: 13, color: "#656d76" }}>
          {email} · <button onClick={() => authClient.signOut()} style={{ ...btnStyle, padding: "4px 10px" }}>Sign out</button>
        </div>
      </div>

      {/* form */}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14, border: "1px solid #d0d7de", borderRadius: 10, padding: 18, marginBottom: 30 }}>
        <div>
          <label style={labelStyle}>Name<Req /></label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="my-app" required />
        </div>
        <div>
          <label style={labelStyle}>Repository URL<Req /></label>
          <input style={inputStyle} value={repositoryUrl} onChange={(e) => setRepositoryUrl(e.target.value)} placeholder="https://github.com/user/repo.git" required />
        </div>
        <div>
          <label style={labelStyle}>Dockerfile path<Req /></label>
          <input style={inputStyle} value={dockerfilePath} onChange={(e) => setDockerfilePath(e.target.value)} placeholder="Dockerfile  (e.g. Dockerfile or docker/Dockerfile)" required />
          <small style={{ display: "block", color: "#656d76", fontSize: 12, marginTop: 4 }}>
            Path to the Dockerfile (a file), relative to the repo root — not a directory.
          </small>
        </div>
        <div>
          <label style={labelStyle}>Port<Req /></label>
          <input style={inputStyle} value={port} onChange={(e) => setPort(e.target.value)} placeholder="3000" type="number" min={1} max={65535} required />
        </div>

        <div>
          <label style={labelStyle}>Custom labels <span style={{ fontWeight: 400, color: "#656d76" }}>(optional)</span></label>
          <div style={{ display: "grid", gap: 8 }}>
            {labels.map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <input style={inputStyle} value={row.key} onChange={(e) => updateLabel(i, "key", e.target.value)} placeholder="com.example.team" />
                <input style={inputStyle} value={row.value} onChange={(e) => updateLabel(i, "value", e.target.value)} placeholder="payments" />
                <button type="button" onClick={() => removeLabel(i)} style={{ ...btnStyle, flex: "none" }} aria-label="remove label">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addLabel} style={{ ...btnStyle, marginTop: 8 }}>+ Add label</button>
        </div>

        <div>
          <button type="submit" disabled={create.isPending} style={{ ...btnStyle, background: "#1f883d", color: "#fff", border: "1px solid #1a7f37", opacity: create.isPending ? 0.7 : 1 }}>
            {create.isPending ? <><Spinner /> Deploying…</> : "Deploy"}
          </button>
          {create.error && <p style={{ color: "#cf222e", fontSize: 13, marginTop: 8 }}>{create.error.message}</p>}
        </div>
      </form>

      {/* table */}
      <h2 style={{ fontSize: 16 }}>Deployments</h2>
      {list.isLoading ? (
        <p style={{ color: "#656d76" }}>Loading…</p>
      ) : (list.data ?? []).length === 0 ? (
        <p style={{ color: "#656d76" }}>No deployments yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #d0d7de" }}>
              <th style={{ padding: "8px 6px" }}>Name</th>
              <th style={{ padding: "8px 6px" }}>Status</th>
              <th style={{ padding: "8px 6px" }}>Subdomain</th>
              <th style={{ padding: "8px 6px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((d) => {
              const removingThis = remove.isPending && remove.variables?.id === d.id
              const redeployingThis = redeploy.isPending && redeploy.variables?.id === d.id
              const displayStatus = redeployingThis ? DeploymentStatus.DEPLOYING : d.status
              return (
                <tr key={d.id} style={{ borderBottom: "1px solid #eaeef2" }}>
                  <td style={{ padding: "8px 6px" }}>{d.serviceName}</td>
                  <td style={{ padding: "8px 6px", color: statusColor(displayStatus), fontWeight: 600 }}>
                    {!isFinal(displayStatus) && <Spinner />} {displayStatus}
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    <a href={`http://${d.subdomain}`} target="_blank" rel="noreferrer" style={{ color: "#0969da" }}>{d.subdomain}</a>
                  </td>
                  <td style={{ padding: "8px 6px", display: "flex", gap: 8 }}>
                    <button onClick={() => redeploy.mutate({ id: d.id })} disabled={redeployingThis} style={btnStyle}>
                      {redeployingThis ? "Redeploying…" : "Redeploy"}
                    </button>
                    <button onClick={() => remove.mutate({ id: d.id })} disabled={removingThis} style={{ ...btnStyle, color: "#cf222e" }}>
                      {removingThis ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}

export default function Home() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return <main style={pageStyle}><p style={{ color: "#656d76" }}>Loading…</p></main>
  if (!session) return <AuthGate />
  return <Dashboard email={session.user.email} />
}
