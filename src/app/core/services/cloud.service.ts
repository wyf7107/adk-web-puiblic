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

import {HttpClient} from '@angular/common/http';
import {inject, Injectable, signal} from '@angular/core';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

import {URLUtil} from '../../../utils/url-util';
import {CloudConnection, CloudSessionsResponse, CloudStatus, LoginStarted, LogsQuery, LogsResponse, MetricsRange, MetricsResponse, ProjectSummary} from '../models/Cloud';
import {Session} from '../models/Session';

import {CloudService as CloudServiceInterface} from './interfaces/cloud';

@Injectable({providedIn: 'root'})
export class CloudService implements CloudServiceInterface {
  private readonly http = inject(HttpClient);
  private readonly apiServerDomain = URLUtil.getApiServerBaseUrl();
  private readonly statusSignal = signal<CloudStatus|null>(null);

  readonly status = this.statusSignal.asReadonly();

  refreshStatus(): Observable<CloudStatus> {
    return this.http.get<CloudStatus>(this.url('/dev/cloud/status'))
        .pipe(tap((status) => this.statusSignal.set(status)));
  }

  startLogin(): Observable<LoginStarted> {
    return this.http.post<LoginStarted>(this.url('/dev/cloud/login'), {});
  }

  completeLogin(loginId: string, code: string): Observable<CloudStatus> {
    return this.http
        .post<CloudStatus>(
            this.url(`/dev/cloud/login/${encodeURIComponent(loginId)}/complete`),
            {code})
        .pipe(tap((status) => this.statusSignal.set(status)));
  }

  cancelLogin(loginId: string): Observable<void> {
    return this.http.delete<void>(
        this.url(`/dev/cloud/login/${encodeURIComponent(loginId)}`));
  }

  listProjects(query = ''): Observable<ProjectSummary[]> {
    return this.http.get<ProjectSummary[]>(
        this.url('/dev/cloud/projects'), {params: query ? {query} : {}});
  }

  connect(connection: CloudConnection): Observable<CloudStatus> {
    return this.http
        .put<CloudStatus>(this.url('/dev/cloud/connection'), connection)
        .pipe(tap((status) => this.statusSignal.set(status)));
  }

  disconnect(): Observable<CloudStatus> {
    return this.http.delete<CloudStatus>(this.url('/dev/cloud/connection'))
        .pipe(tap((status) => this.statusSignal.set(status)));
  }

  listSessions(appName: string, deploymentId: string, userId = ''):
      Observable<CloudSessionsResponse> {
    return this.http.get<CloudSessionsResponse>(
        this.url(`/dev/apps/${appName}/deployments/${deploymentId}/sessions`),
        {params: userId ? {'user_id': userId} : {}});
  }

  getSession(
      appName: string, deploymentId: string, sessionId: string,
      userId: string): Observable<Session> {
    return this.http.get<Session>(
        this.url(`/dev/apps/${appName}/deployments/${deploymentId}/sessions/${
            encodeURIComponent(sessionId)}`),
        {params: {'user_id': userId}});
  }

  listLogs(appName: string, deploymentId: string, query: LogsQuery = {}):
      Observable<LogsResponse> {
    const params: Record<string, string> = {};
    if (query.start) params['start'] = query.start;
    if (query.after) params['after'] = query.after;
    if (query.severity) params['severity'] = query.severity;
    if (query.query) params['query'] = query.query;
    if (query.pageToken) params['page_token'] = query.pageToken;
    return this.http.get<LogsResponse>(
        this.url(`/dev/apps/${appName}/deployments/${deploymentId}/logs`),
        {params});
  }

  getMetrics(appName: string, deploymentId: string, range: MetricsRange):
      Observable<MetricsResponse> {
    return this.http.get<MetricsResponse>(
        this.url(`/dev/apps/${appName}/deployments/${deploymentId}/metrics`),
        {params: {range}});
  }

  createTrySession(appName: string, deploymentId: string, userId: string):
      Observable<Session> {
    return this.http.post<Session>(
        this.url(`${this.tryBase(appName, deploymentId)}/sessions`), {userId});
  }

  tryRunPath(appName: string, deploymentId: string): string {
    return `${this.tryBase(appName, deploymentId)}/run_sse`;
  }

  private tryBase(appName: string, deploymentId: string): string {
    return `/dev/apps/${appName}/deployments/${deploymentId}/try`;
  }

  private url(path: string): string {
    return `${this.apiServerDomain}${path}`;
  }
}
