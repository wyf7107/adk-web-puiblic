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

import {MetricsResponse} from '../../core/models/Cloud';
import {Deployment, DeploymentsResponse} from '../../core/models/Deploy';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {DEPLOY_SERVICE} from '../../core/services/interfaces/deploy';
import {CONNECTED_STATUS, MockCloudService} from '../../core/services/testing/mock-cloud.service';
import {fakeAsync, initTestBed, tick} from '../../testing/utils';
import {CloudConnectDialogComponent} from '../cloud-connect-dialog/cloud-connect-dialog.component';

import {CloudMonitoringComponent} from './cloud-monitoring.component';

function deployment(fields: Partial<Deployment>): Deployment {
  return {
    id: 'aaaaaaaaaaaaaaaa',
    target: 'cloud_run',
    region: 'us-central1',
    project: 'adk-demo',
    resourceName: 'my-agent',
    displayName: 'my-agent',
    consoleUrl: 'https://console.cloud.google.com/run/detail/us-central1/my-agent',
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

const METRICS: MetricsResponse = {
  start: '2026-10-01T00:00:00Z',
  end: '2026-10-02T00:00:00Z',
  bucketSeconds: 900,
  summaries: [
    {id: 'requests', label: 'Requests', value: 40, unit: 'requests'},
    {id: 'errors', label: 'Server errors', value: 5, unit: '%', detail: '2 5xx'},
    {id: 'p95', label: 'p95 latency', value: 2500, unit: 'ms'},
    {id: 'peak_instances', label: 'Peak active instances', value: 3, unit: 'instances'},
  ],
  charts: [
    {
      id: 'requests',
      title: 'Requests',
      unit: 'requests',
      kind: 'bars',
      series: [{name: '2xx', color: 'success', points: [{time: '2026-10-02T00:00:00Z', value: 38}]}],
    },
    {id: 'instances', title: 'Instances', unit: '', kind: 'lines', series: [], error: 'Quota exceeded'},
  ],
};

describe('CloudMonitoringComponent', () => {
  let fixture: ComponentFixture<CloudMonitoringComponent>;
  let cloud: MockCloudService;
  let deployService: {listDeployments: jasmine.Spy};
  let dialog: {open: jasmine.Spy};

  initTestBed();  // required for 1p compat

  function create(deployments: Deployment[] = [MINE, OTHER]) {
    deployService.listDeployments.and.returnValue(of(listing(deployments)));
    fixture = TestBed.createComponent(CloudMonitoringComponent);
    fixture.componentRef.setInput('appName', 'my_agent');
    fixture.detectChanges();
  }

  function query(selector: string): HTMLElement|null {
    return fixture.nativeElement.querySelector(selector);
  }

  function texts(selector: string): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>)
        .map((e) => e.textContent!.replace(/\s+/g, ' ').trim());
  }

  beforeEach(async () => {
    cloud = new MockCloudService();
    cloud.setStatus(CONNECTED_STATUS);
    cloud.getMetrics.and.returnValue(of(METRICS));
    deployService = {listDeployments: jasmine.createSpy('listDeployments')};
    dialog = {open: jasmine.createSpy('open')};
    await TestBed
        .configureTestingModule({
          imports: [CloudMonitoringComponent],
          providers: [
            {provide: CLOUD_SERVICE, useValue: cloud},
            {provide: DEPLOY_SERVICE, useValue: deployService},
            {provide: MatDialog, useValue: dialog},
            provideNoopAnimations(),
          ],
        })
        .compileComponents();
  });

  it('opens on this agent\'s deployment over the last day', () => {
    create();
    expect(cloud.getMetrics).toHaveBeenCalledWith('my_agent', MINE.id, '1d');
    expect(texts('.source-name')).toEqual(['my-agent']);
  });

  it('summarizes the window in tiles', () => {
    create();
    const tiles = Array.from(fixture.nativeElement.querySelectorAll('.summary') as NodeListOf<HTMLElement>)
                      .map((tile) => Array.from(tile.children).map((c) => c.textContent!.trim()).join(' '));
    expect(tiles).toEqual([
      'Requests 40 last 1 day',
      'Server errors 5% 2 5xx',
      'p95 latency 2.5 s last 1 day',
      'Peak active instances 3 last 1 day',
    ]);
    expect(query('.summary-errors')!.classList).toContain('summary-bad');
  });

  it('draws a chart per metric and shows a failed one\'s error', () => {
    create();
    expect(texts('app-metric-chart .chart-title')).toEqual(['Requests', 'Instances']);
    expect(texts('.chart-instances .chart-error')).toEqual(['Quota exceeded']);
  });

  it('changes the range on the server', () => {
    create();
    const week = Array.from(fixture.nativeElement.querySelectorAll('.segment') as NodeListOf<HTMLElement>)
                     .find((b) => b.textContent!.trim() === '7 days')!;
    week.click();
    expect(cloud.getMetrics).toHaveBeenCalledWith('my_agent', MINE.id, '7d');
  });

  it('switches to another deployment', () => {
    create();
    fixture.componentInstance.selectSource(OTHER);
    expect(cloud.getMetrics).toHaveBeenCalledWith('my_agent', OTHER.id, '1d');
  });

  it('refreshes every minute while on screen', fakeAsync(() => {
    create();
    expect(cloud.getMetrics).toHaveBeenCalledTimes(1);
    tick(60_000);
    expect(cloud.getMetrics).toHaveBeenCalledTimes(2);

    fixture.componentRef.setInput('active', false);
    fixture.detectChanges();
    tick(120_000);
    expect(cloud.getMetrics).toHaveBeenCalledTimes(2);
    fixture.destroy();
  }));

  it('reports a failure to read metrics', () => {
    cloud.getMetrics.and.returnValue(throwError(() => ({
      status: 403,
      error: {detail: 'Permission denied. Reading metrics needs the Monitoring Viewer role.'},
    })));
    create();
    expect(texts('.metrics-error')[0]).toContain('Monitoring Viewer');
    expect(query('.segmented')).not.toBeNull();
  });

  it('opens the deployment in the Cloud console', () => {
    create();
    const open = spyOn(window, 'open');
    fixture.componentInstance.openConsole();
    expect(open).toHaveBeenCalledWith(MINE.consoleUrl!, '_blank', 'noopener');
  });

  it('explains when this agent has nothing deployed', () => {
    create([OTHER]);
    expect(texts('.no-deployment')[0]).toContain('isn\'t deployed in this project yet');
    expect(cloud.getMetrics).not.toHaveBeenCalled();
  });

  it('offers to connect when not connected', () => {
    cloud.setStatus({...CONNECTED_STATUS, connected: false});
    create();
    (query('.not-connected .actions button') as HTMLButtonElement).click();
    expect(dialog.open).toHaveBeenCalledWith(CloudConnectDialogComponent, jasmine.anything());
  });
});
