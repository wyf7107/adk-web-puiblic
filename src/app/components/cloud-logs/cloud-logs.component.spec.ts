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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {of, throwError} from 'rxjs';

import {LogEntry, LogsResponse} from '../../core/models/Cloud';
import {Deployment, DeploymentsResponse} from '../../core/models/Deploy';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {DEPLOY_SERVICE} from '../../core/services/interfaces/deploy';
import {CONNECTED_STATUS, MockCloudService} from '../../core/services/testing/mock-cloud.service';
import {fakeAsync, initTestBed, tick} from '../../testing/utils';
import {CloudConnectDialogComponent} from '../cloud-connect-dialog/cloud-connect-dialog.component';

import {CloudLogsComponent, formatLogTime, severityLevel} from './cloud-logs.component';

function deployment(fields: Partial<Deployment>): Deployment {
  return {
    id: 'aaaaaaaaaaaaaaaa',
    target: 'cloud_run',
    region: 'us-central1',
    project: 'adk-demo',
    resourceName: 'my-agent',
    displayName: 'my-agent',
    labels: {},
    matchesApp: true,
    ...fields,
  };
}

const MINE = deployment({});
const OTHER = deployment({
  id: 'bbbbbbbbbbbbbbbb',
  target: 'agent_engine',
  resourceName: 'projects/adk-demo/locations/us-central1/reasoningEngines/42',
  displayName: 'someone_else',
  matchesApp: false,
});
const GKE = deployment({id: 'cccccccccccccccc', target: 'gke'});

function listing(deployments: Deployment[]): DeploymentsResponse {
  return {
    project: 'adk-demo',
    region: 'us-central1',
    deployments,
    history: [],
    deployInProgress: false,
    errors: [],
  };
}

function entry(fields: Partial<LogEntry>): LogEntry {
  return {
    id: 'e1',
    timestamp: '2026-10-02T04:31:45.116Z',
    severity: 'INFO',
    message: 'hello',
    log: 'stdout',
    ...fields,
  };
}

function page(entries: LogEntry[], nextPageToken?: string): LogsResponse {
  return {
    entries,
    nextPageToken,
    filter: 'f',
    consoleUrl: 'https://console.cloud.google.com/logs/query;query=f',
  };
}

describe('CloudLogsComponent', () => {
  let fixture: ComponentFixture<CloudLogsComponent>;
  let cloud: MockCloudService;
  let deployService: {listDeployments: jasmine.Spy};
  let dialog: {open: jasmine.Spy};

  initTestBed();  // required for 1p compat

  function create(deployments: Deployment[] = [MINE, OTHER, GKE]) {
    deployService.listDeployments.and.returnValue(of(listing(deployments)));
    fixture = TestBed.createComponent(CloudLogsComponent);
    fixture.componentRef.setInput('appName', 'my_agent');
    fixture.detectChanges();
  }

  function query(selector: string): HTMLElement|null {
    return fixture.nativeElement.querySelector(selector);
  }

  function queryAll(selector: string): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector));
  }

  function text(selector: string): string {
    return query(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function lastQuery() {
    return cloud.listLogs.calls.mostRecent().args[2];
  }

  beforeEach(async () => {
    cloud = new MockCloudService();
    cloud.setStatus(CONNECTED_STATUS);
    cloud.listLogs.and.returnValue(of(page([
      entry({id: 'new', message: 'line one\nline two\nline three'}),
      entry({
        id: 'req',
        timestamp: '2026-10-02T04:31:44Z',
        severity: 'ERROR',
        message: 'GET /run 500',
        log: 'requests',
        httpRequest: {method: 'GET', path: '/run', status: 500, latencyMs: 12},
        revision: 'my-agent-00005',
        labels: {k: 'v'},
      }),
    ], 'next')));
    deployService = {listDeployments: jasmine.createSpy('listDeployments')};
    dialog = {open: jasmine.createSpy('open')};
    await TestBed
        .configureTestingModule({
          imports: [CloudLogsComponent],
          providers: [
            {provide: CLOUD_SERVICE, useValue: cloud},
            {provide: DEPLOY_SERVICE, useValue: deployService},
            {provide: MatDialog, useValue: dialog},
            provideNoopAnimations(),
          ],
        })
        .compileComponents();
  });

  it('opens on this agent\'s deployment and lists the last hour', () => {
    const before = Date.now();
    create();

    expect(cloud.listLogs).toHaveBeenCalledWith('my_agent', MINE.id, jasmine.anything());
    const start = Date.parse(lastQuery().start);
    expect(before - start).toBeGreaterThanOrEqual(60 * 60_000 - 1000);
    expect(before - start).toBeLessThan(60 * 60_000 + 1000);
    expect(text('.source-name')).toBe('my-agent');
    expect(queryAll('.log-entry').length).toBe(2);
  });

  it('offers Agent Runtime and Cloud Run deployments only', () => {
    create();
    expect(fixture.componentInstance.sources()!.map((d) => d.id))
        .toEqual([MINE.id, OTHER.id]);
  });

  it('shows the first line of a message and how many more there are', () => {
    create();
    const [first] = queryAll('.log-entry');
    expect(first.querySelector('.message-text')?.textContent).toBe('line one');
    expect(first.querySelector('.more-lines')?.textContent).toBe('+2 lines');
  });

  it('shows requests with their method, status and latency', () => {
    create();
    const request = queryAll('.log-entry')[1];
    expect(request.querySelector('.http-method')?.textContent).toBe('GET');
    expect(request.querySelector('.http-status')?.className).toContain('http-error');
    expect(request.querySelector('.http-latency')?.textContent).toBe('12 ms');
    expect(request.querySelector('.sev-bar')?.className).toContain('sev-error');
  });

  it('expands an entry to show everything about it', () => {
    create();
    (queryAll('.log-entry .log-row')[1]).click();
    fixture.detectChanges();

    expect(text('.detail-message')).toBe('GET /run 500');
    expect(text('.detail-facts')).toContain('my-agent-00005');
    expect(queryAll('.detail-facts dt').map((dt) => dt.textContent)).toContain('k');
  });

  it('filters by severity, time and text on the server', () => {
    create();
    fixture.componentInstance.setSeverity('WARNING');
    expect(lastQuery().severity).toBe('WARNING');

    fixture.componentInstance.setRange(
        fixture.componentInstance.timeRanges.find((r) => r.id === '15m')!);
    expect(Date.now() - Date.parse(lastQuery().start)).toBeLessThan(16 * 60_000);

    fixture.componentInstance.queryText = ' timeout ';
    fixture.componentInstance.applyQuery();
    expect(lastQuery()).toEqual(jasmine.objectContaining(
        {severity: 'WARNING', query: 'timeout'}));
  });

  it('loads older entries with the same window', () => {
    create();
    const start = lastQuery().start;
    cloud.listLogs.and.returnValue(of(page([entry({id: 'old', timestamp: '2026-10-02T04:00:00Z'})])));
    (query('.load-older') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(lastQuery()).toEqual(jasmine.objectContaining({start, pageToken: 'next'}));
    expect(queryAll('.log-entry').length).toBe(3);
    expect(query('.load-older')).toBeNull();
  });

  it('adds new entries while live, and pauses when hidden', fakeAsync(() => {
    create();
    cloud.listLogs.and.returnValue(of(page([
      entry({id: 'newer', timestamp: '2026-10-02T04:32:00Z', message: 'fresh'}),
      entry({id: 'new', message: 'line one\nline two\nline three'}),
    ])));
    fixture.componentInstance.toggleLive();
    fixture.detectChanges();
    tick();

    const live = lastQuery();
    expect(live.start).toBeUndefined();
    // Re-reads a little before the newest entry, for late arrivals.
    expect(live.after).toBe('2026-10-02T04:31:30.116Z');
    fixture.detectChanges();
    expect(queryAll('.log-entry').length).toBe(3);
    expect(queryAll('.message-text')[0].textContent).toBe('fresh');
    expect(text('.page-refresh')).toContain('Live');

    const calls = cloud.listLogs.calls.count();
    tick(5_000);
    expect(cloud.listLogs.calls.count()).toBe(calls + 1);

    fixture.componentRef.setInput('active', false);
    fixture.detectChanges();
    tick(15_000);
    expect(cloud.listLogs.calls.count()).toBe(calls + 1);

    fixture.componentInstance.toggleLive();
    fixture.detectChanges();
  }));

  it('explains an empty window and offers a longer one', () => {
    cloud.listLogs.and.returnValue(of(page([])));
    create();
    expect(text('.list-empty')).toContain('No log entries in the last hour');
    (query('.list-empty button') as HTMLButtonElement).click();
    expect(fixture.componentInstance.rangeId()).toBe('7d');
  });

  it('reports a failure to read logs without hiding the controls', () => {
    cloud.listLogs.and.returnValue(throwError(() => ({
      status: 403,
      error: {detail: 'Permission denied. Reading logs needs the Logs Viewer role.'},
    })));
    create();
    fixture.detectChanges();
    expect(text('.logs-error')).toContain('Logs Viewer');
    expect(query('.segmented')).not.toBeNull();
  });

  it('opens the same query in Logs Explorer', () => {
    create();
    const open = spyOn(window, 'open');
    fixture.componentInstance.openConsole();
    expect(open).toHaveBeenCalledWith(
        'https://console.cloud.google.com/logs/query;query=f', '_blank', 'noopener');
  });

  it('explains when this agent has nothing deployed', () => {
    create([OTHER]);
    expect(text('.no-deployment')).toContain('isn\'t deployed in this project yet');
    expect(cloud.listLogs).not.toHaveBeenCalled();
  });

  it('offers to connect when not connected', () => {
    cloud.setStatus({...CONNECTED_STATUS, connected: false});
    create();
    (query('.not-connected .actions button') as HTMLButtonElement).click();
    expect(dialog.open).toHaveBeenCalledWith(
        CloudConnectDialogComponent, jasmine.anything());
  });
});

describe('severityLevel', () => {
  it('groups Cloud Logging severities', () => {
    expect(['DEFAULT', 'DEBUG', 'INFO', 'NOTICE', 'WARNING', 'ERROR', 'ALERT']
               .map(severityLevel))
        .toEqual(['debug', 'debug', 'info', 'info', 'warning', 'error', 'error']);
  });
});

describe('formatLogTime', () => {
  it('shows only the time for today, and the day otherwise', () => {
    const now = new Date(2026, 9, 2, 12, 0, 0);
    expect(formatLogTime(new Date(2026, 9, 2, 4, 5, 6, 7).toISOString(), now))
        .toBe('04:05:06.007');
    expect(formatLogTime(new Date(2026, 9, 1, 4, 5, 6, 7).toISOString(), now))
        .toMatch(/1.*04:05:06\.007$/);
  });
});
