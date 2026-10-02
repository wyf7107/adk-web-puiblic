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

import {InjectionToken, Signal} from '@angular/core';
import {Observable} from 'rxjs';

import {CloudConnection, CloudSessionsResponse, CloudStatus, LoginStarted, LogsQuery, LogsResponse, MetricsRange, MetricsResponse, ProjectSummary} from '../../models/Cloud';
import {Session} from '../../models/Session';

/**
 * Connects the dev UI to a cloud project.
 *
 * Backed by dev-only endpoints: the server holds the credentials and makes
 * every cloud call, so nothing here ever sees a cloud token.
 */
export declare abstract class CloudService {
  /** The latest known status; null until first fetched. */
  abstract readonly status: Signal<CloudStatus|null>;

  /** Fetches the status, updating `status`. */
  abstract refreshStatus(): Observable<CloudStatus>;

  /**
   * Starts signing in. Open `authUrl`; the page it leads to ends with a
   * verification code for `completeLogin`.
   */
  abstract startLogin(): Observable<LoginStarted>;

  abstract completeLogin(loginId: string, code: string):
      Observable<CloudStatus>;

  abstract cancelLogin(loginId: string): Observable<void>;

  /**
   * Up to 50 projects the signed-in account can see, matching `query` by ID
   * or name when given. Searched on the server: large organizations have far
   * too many projects to list.
   */
  abstract listProjects(query?: string): Observable<ProjectSummary[]>;

  /** Saves the connection for every agent, updating `status`. */
  abstract connect(connection: CloudConnection): Observable<CloudStatus>;

  /** Forgets the project, updating `status`. Does not sign out. */
  abstract disconnect(): Observable<CloudStatus>;

  /**
   * Sessions an Agent Runtime deployment has stored, newest first, optionally
   * only one user's. `deploymentId` comes from the deployments listing.
   */
  abstract listSessions(appName: string, deploymentId: string, userId?: string):
      Observable<CloudSessionsResponse>;

  /**
   * One stored session with its events, in the same shape as a local session
   * (its app name is the local agent's), so it can be replayed read-only.
   */
  abstract getSession(
      appName: string, deploymentId: string, sessionId: string,
      userId: string): Observable<Session>;

  /** A deployment's Cloud Logging entries, newest first, a page at a time. */
  abstract listLogs(appName: string, deploymentId: string, query?: LogsQuery):
      Observable<LogsResponse>;

  /**
   * Starts a session on a deployed agent, as `userId`. It is stored in the
   * deployment's session store like any other conversation.
   */
  abstract createTrySession(
      appName: string, deploymentId: string, userId: string): Observable<Session>;

  /**
   * The server route that sends a message to a deployed agent and streams
   * its events, for `AgentService.runSse`.
   */
  abstract tryRunPath(appName: string, deploymentId: string): string;

  /** A deployment's request, latency and resource charts over `range`. */
  abstract getMetrics(
      appName: string, deploymentId: string,
      range: MetricsRange): Observable<MetricsResponse>;
}

/** Injection token for the cloud service. */
export const CLOUD_SERVICE = new InjectionToken<CloudService>('CloudService');
