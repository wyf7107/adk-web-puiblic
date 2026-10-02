/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** A cloud platform the dev UI can connect to. Only GCP is implemented. */
export declare type CloudProvider = 'gcp';

/** The project the dev UI works against, saved by the server. */
export declare interface CloudConnection {
  provider: CloudProvider;
  project: string;
  /** Default region: where deployments are looked for and deploys go. */
  region: string;
}

/** Whether the dev UI is connected to a cloud project, and as whom. */
export declare interface CloudStatus {
  provider: CloudProvider;
  /** A project is chosen and there are working credentials to reach it. */
  connected: boolean;
  credentialsFound: boolean;
  credentialType?: 'user'|'service_account'|null;
  account?: string|null;
  /** The connected project, or the one the credentials suggest. */
  project?: string|null;
  region?: string|null;
  message?: string|null;
}

/** A sign-in started on the server; the browser opens `authUrl`. */
export declare interface LoginStarted {
  loginId: string;
  authUrl: string;
}

export declare interface ProjectSummary {
  projectId: string;
  name?: string|null;
}

/** One session a deployed agent has stored, without its events. */
export declare interface CloudSessionSummary {
  id: string;
  userId: string;
  /** Seconds since the epoch. */
  lastUpdateTime: number;
  stateKeyCount: number;
}

export declare interface CloudSessionsResponse {
  /** Most recently updated first. */
  sessions: CloudSessionSummary[];
  /** More sessions exist than were returned; narrow by user to see them. */
  truncated: boolean;
}

export declare interface LogHttpRequest {
  method?: string;
  path?: string;
  status?: number;
  latencyMs?: number;
}

/** One Cloud Logging entry of a deployment. */
export declare interface LogEntry {
  /** Cloud Logging's insertId. */
  id: string;
  /** ISO 8601, UTC. */
  timestamp: string;
  /** DEFAULT, DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL, ALERT or EMERGENCY. */
  severity: string;
  /** The entry had no severity; this one was read from its text. */
  severityInferred?: boolean;
  message: string;
  /** Short log name, e.g. "stdout", "stderr" or "requests". */
  log?: string;
  revision?: string;
  instance?: string;
  trace?: string;
  httpRequest?: LogHttpRequest;
  payload?: unknown;
  labels?: Record<string, string>;
}

export declare interface LogsResponse {
  /** Newest first. */
  entries: LogEntry[];
  nextPageToken?: string;
  /** The Cloud Logging filter used. */
  filter: string;
  /** The same filter in Logs Explorer. */
  consoleUrl: string;
}

export declare interface LogsQuery {
  /** ISO timestamp; keep it fixed while paging. */
  start?: string;
  /** ISO timestamp; only entries strictly newer. */
  after?: string;
  severity?: string;
  query?: string;
  pageToken?: string;
}

export type MetricsRange = '1h'|'6h'|'1d'|'7d'|'30d';

export declare interface MetricPoint {
  /** End of the bucket, ISO 8601 UTC. */
  time: string;
  /** Absent where there is no data, e.g. latency with no requests. */
  value?: number;
}

export declare interface MetricSeries {
  name: string;
  /** A theme role: "primary", "success", "warning", "error", ... */
  color: string;
  points: MetricPoint[];
}

export declare interface MetricChart {
  id: string;
  title: string;
  /** "requests", "ms", "vCPU", "GiB" or "instances". */
  unit: string;
  kind: 'bars'|'lines';
  series: MetricSeries[];
  error?: string;
}

export declare interface MetricSummary {
  id: string;
  label: string;
  value?: number;
  unit: string;
  detail?: string;
}

export declare interface MetricsResponse {
  start: string;
  end: string;
  bucketSeconds: number;
  summaries: MetricSummary[];
  charts: MetricChart[];
  consoleUrl?: string;
}
