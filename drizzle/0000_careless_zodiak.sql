CREATE TABLE `deployments` (
	`id` text PRIMARY KEY NOT NULL,
	`repository_url` text NOT NULL,
	`dockerfile` text NOT NULL,
	`port` integer NOT NULL,
	`subdomain` text NOT NULL,
	`service_name` text NOT NULL,
	`custom_labels` text,
	`status` text DEFAULT 'DEPLOYING' NOT NULL,
	`created_at` integer NOT NULL
);
