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

import {signal} from '@angular/core';
import {of} from 'rxjs';

import {CloudStatus} from '../../models/Cloud';
import {CloudService} from '../interfaces/cloud';

/** Signed in and connected to `adk-demo`, unless a test says otherwise. */
export const CONNECTED_STATUS: CloudStatus = {
  provider: 'gcp',
  connected: true,
  credentialsFound: true,
  credentialType: 'user',
  account: 'dev@example.com',
  project: 'adk-demo',
  region: 'us-central1',
};

/** Mock cloud service for testing; `setStatus` drives the `status` signal. */
export class MockCloudService implements CloudService {
  private readonly statusSignal = signal<CloudStatus|null>(null);
  readonly status = this.statusSignal.asReadonly();
  private nextStatus: CloudStatus = CONNECTED_STATUS;

  setStatus(status: CloudStatus) {
    this.nextStatus = status;
    this.statusSignal.set(status);
  }

  refreshStatus = jasmine.createSpy('refreshStatus').and.callFake(() => {
    this.statusSignal.set(this.nextStatus);
    return of(this.nextStatus);
  });
  startLogin = jasmine.createSpy('startLogin')
                   .and.returnValue(
                       of({loginId: 'login-1', authUrl: 'https://auth'}));
  completeLogin = jasmine.createSpy('completeLogin').and.callFake(() => {
    this.setStatus({...this.nextStatus, credentialsFound: true});
    return of(this.nextStatus);
  });
  cancelLogin = jasmine.createSpy('cancelLogin').and.returnValue(of(undefined));
  listProjects = jasmine.createSpy('listProjects').and.returnValue(of([]));
  connect = jasmine.createSpy('connect').and.callFake(() => {
    this.setStatus({...this.nextStatus, connected: true});
    return of(this.nextStatus);
  });
  disconnect = jasmine.createSpy('disconnect').and.callFake(() => {
    this.setStatus({...this.nextStatus, connected: false});
    return of(this.nextStatus);
  });
  listSessions = jasmine.createSpy('listSessions')
                     .and.returnValue(of({sessions: [], truncated: false}));
  getSession = jasmine.createSpy('getSession').and.returnValue(of({}));
  listLogs = jasmine.createSpy('listLogs').and.returnValue(
      of({entries: [], filter: '', consoleUrl: 'https://console'}));
  createTrySession = jasmine.createSpy('createTrySession')
                         .and.returnValue(of({id: 'remote-1', userId: 'dev'}));
  tryRunPath = jasmine.createSpy('tryRunPath')
                   .and.callFake((app: string, id: string) => `/dev/apps/${app}/deployments/${id}/try/run_sse`);
  getMetrics = jasmine.createSpy('getMetrics').and.returnValue(of({
    start: '2026-10-01T00:00:00Z',
    end: '2026-10-02T00:00:00Z',
    bucketSeconds: 900,
    summaries: [],
    charts: [],
  }));
}
