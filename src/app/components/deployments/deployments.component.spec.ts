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
import {NEVER, of, throwError} from 'rxjs';

import {DeployHistoryEntry, Deployment, DeploymentLive, DeploymentsResponse} from '../../core/models/Deploy';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {DEPLOY_SERVICE} from '../../core/services/interfaces/deploy';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {CONNECTED_STATUS, MockCloudService} from '../../core/services/testing/mock-cloud.service';
import {MockSafeValuesService} from '../../core/services/testing/mock-safevalues.service';
import {initTestBed} from '../../testing/utils';
import {CloudConnectDialogComponent} from '../cloud-connect-dialog/cloud-connect-dialog.component';

import {DeploymentsComponent, describeLookupError, duration, relativeTime, shortDate} from './deployments.component';

function deployment(fields: Partial<Deployment>): Deployment {
  return {
    id: 'aaaaaaaaaaaaaaaa',
    target: 'cloud_run',
    region: 'us-central1',
    project: 'adk-demo',
    resourceName: 'my-agent',
    displayName: 'my-agent',
    serviceUrl: 'https://my-agent.a.run.app',
    consoleUrl: 'https://console.cloud.google.com/run/detail/x',
    updateTime: '2026-01-02T00:00:00Z',
    state: 'ready',
    labels: {},
    matchesApp: true,
    matchReason: 'name',
    ...fields,
  };
}

const MINE = deployment({});
const OTHER = deployment({
  id: 'bbbbbbbbbbbbbbbb',
  target: 'agent_engine',
  resourceName: 'projects/adk-demo/locations/us-central1/reasoningEngines/7',
  displayName: 'someone_else',
  serviceUrl: null,
  matchesApp: false,
  matchReason: null,
});

function entry(fields: Partial<DeployHistoryEntry>): DeployHistoryEntry {
  return {
    target: 'cloud_run',
    status: 'succeeded',
    startedAt: '2026-01-02T00:00:00+00:00',
    finishedAt: '2026-01-02T00:00:00+00:00',
    region: 'us-central1',
    project: 'adk-demo',
    resourceName: 'my-agent',
    serviceName: 'my-agent',
    deploymentId: MINE.id,
    ...fields,
  };
}

const RESPONSE: DeploymentsResponse = {
  project: 'adk-demo',
  region: 'us-central1',
  deployments: [MINE, OTHER],
  history: [
    entry({}),
    entry({
      status: 'failed',
      message: 'adk deploy exited with status 1.',
      finishedAt: '2026-01-01T00:00:00+00:00',
    }),
    entry({
      target: 'agent_engine',
      status: 'failed',
      resourceName: null,
      serviceName: null,
      deploymentId: null,
      message: 'nothing was deployed',
    }),
  ],
  deployInProgress: false,
  errors: [],
};

const LIVE: DeploymentLive = {
  supported: true,
  state: 'ready',
  latestRevision: 'my-agent-2',
  revisions: [
    {name: 'my-agent-2', trafficPercent: 100, ready: true},
    {name: 'my-agent-1', trafficPercent: 0, ready: true},
  ],
};

describe('DeploymentsComponent', () => {
  let fixture: ComponentFixture<DeploymentsComponent>;
  let cloud: MockCloudService;
  let dialog: {open: jasmine.Spy};
  let deployService: {
    listDeployments: jasmine.Spy,
    getDeploymentLive: jasmine.Spy,
  };
  let safeValues: MockSafeValuesService;

  initTestBed();  // required for 1p compat

  function create(response: DeploymentsResponse = RESPONSE) {
    deployService.listDeployments.and.returnValue(of(response));
    fixture = TestBed.createComponent(DeploymentsComponent);
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

  beforeEach(async () => {
    cloud = new MockCloudService();
    cloud.setStatus(CONNECTED_STATUS);
    dialog = {
      open: jasmine.createSpy('open').and.returnValue(
          {afterClosed: () => of(undefined)}),
    };
    deployService = {
      listDeployments: jasmine.createSpy('listDeployments'),
      getDeploymentLive:
          jasmine.createSpy('getDeploymentLive').and.returnValue(of(LIVE)),
    };
    safeValues = new MockSafeValuesService();
    await TestBed
        .configureTestingModule({
          imports: [DeploymentsComponent],
          providers: [
            {provide: DEPLOY_SERVICE, useValue: deployService},
            {provide: CLOUD_SERVICE, useValue: cloud},
            {provide: SAFE_VALUES_SERVICE, useValue: safeValues},
            {provide: MatDialog, useValue: dialog},
            provideNoopAnimations(),
          ],
        })
        .compileComponents();
  });

  it('offers to connect when not connected, and loads nothing', () => {
    cloud.setStatus({...CONNECTED_STATUS, connected: false});
    create();

    expect(text('.not-connected')).toContain('Connect to Google Cloud');
    expect(text('.connection-chip')).toContain('Not connected');
    expect(deployService.listDeployments).not.toHaveBeenCalled();
    (query('.not-connected .actions button') as HTMLButtonElement).click();
    expect(dialog.open).toHaveBeenCalledWith(
        CloudConnectDialogComponent, jasmine.anything());
  });

  it('goes back to the playground on request', () => {
    cloud.setStatus({...CONNECTED_STATUS, connected: false});
    create();
    let back = 0;
    fixture.componentInstance.backToPlayground.subscribe(() => back++);
    queryAll('.not-connected .actions button')
        .find((b) => b.textContent?.includes('Back to Playground'))!.click();
    expect(back).toBe(1);
  });

  it('loads once a connection is made', () => {
    cloud.setStatus({...CONNECTED_STATUS, connected: false});
    create();
    cloud.setStatus(CONNECTED_STATUS);
    fixture.detectChanges();

    expect(deployService.listDeployments).toHaveBeenCalledWith('my_agent');
    expect(queryAll('.deployment-card').length).toBe(1);
  });

  it('shows this agent\'s deployments as cards', () => {
    create();

    expect(text('.connection-chip')).toContain('adk-demo');
    expect(text('.page-refresh')).toContain('Updated');
    expect(queryAll('.deployment-card').length).toBe(1);
    expect(text('.deployment-name')).toBe('my-agent');
    expect(text('.deployment-meta')).toContain('Cloud Run');
    expect(text('.deployment-meta')).toContain('https://my-agent.a.run.app');
    expect(text('.match-chip')).toContain('Named after this agent');
    expect(text('.status-live')).toBe('Live');
    // Revisions are only fetched for an expanded card.
    expect(deployService.getDeploymentLive).not.toHaveBeenCalled();
  });

  it('lists the rest of the project in a collapsible table', () => {
    create();

    expect(queryAll('.other-row').length).toBe(1);
    expect(text('.other-row')).toContain('someone_else');
    queryAll('.section-toggle')
        .find((b) => b.textContent?.includes('Rest of project'))!.click();
    fixture.detectChanges();
    expect(queryAll('.other-row').length).toBe(0);
  });

  it('shows revisions with the traffic split on expand', () => {
    create();
    (query('.deployment-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(deployService.getDeploymentLive)
        .toHaveBeenCalledWith('my_agent', MINE.id);
    expect(queryAll('.revision-row').length).toBe(2);
    expect(query('.revision-row.serving')?.textContent).toContain('my-agent-2');
    expect(queryAll('.traffic-segment').length).toBe(1);
  });

  it('shows an Agent Runtime\'s deploys from adk web on expand', () => {
    const runtime = deployment({
      id: 'cccccccccccccccc',
      target: 'agent_engine',
      resourceName: 'projects/adk-demo/locations/us-central1/reasoningEngines/9',
      serviceUrl: null,
    });
    deployService.getDeploymentLive.and.returnValue(
        of({supported: true, state: 'ready', revisions: []}));
    create({
      ...RESPONSE,
      deployments: [runtime],
      history: [entry({target: 'agent_engine', deploymentId: runtime.id})],
    });
    (query('.deployment-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(text('.deployment-details')).toContain('Deploys from adk web');
    expect(queryAll('.history-row').length).toBe(1);
    expect(text('.deployment-meta')).toContain('reasoningEngines/9');
  });

  it('lists every deploy in Deploy activity, tagging ones that created nothing',
     () => {
       create();

       expect(queryAll('.activity-row').length).toBe(3);
       expect(queryAll('.nothing-tag').length).toBe(1);
       expect(text('.activity')).toContain('nothing was deployed');
     });

  it('notes when the last deploy from adk web failed', () => {
    create({
      ...RESPONSE,
      deployments: [{...MINE, lastDeployStatus: 'failed'}],
      history: [entry({status: 'failed', message: 'Build failed'})],
    });

    expect(text('.last-failed')).toContain('Last deploy from adk web failed');
    expect(text('.last-failed')).toContain('Build failed');
  });

  it('reports failed lookups neutrally, with a hint and a retry', () => {
    create({
      ...RESPONSE,
      errors: [{
        target: 'agent_engine',
        region: 'us-central1',
        message: 'Agent Platform API has not been used in project adk-demo',
      }],
    });

    expect(text('.discovery-errors')).toContain('1 lookup didn\'t complete');
    expect(text('.discovery-error')).toContain('Agent Runtime · us-central1');
    expect(text('.lookup-hint')).toContain('Enable the API');
    expect(query('.incomplete-note')).not.toBeNull();
    deployService.listDeployments.calls.reset();
    (query('.discovery-error button') as HTMLButtonElement).click();
    expect(deployService.listDeployments).toHaveBeenCalled();
  });

  it('explains where it looked when nothing belongs to this agent', () => {
    create({...RESPONSE, deployments: [OTHER]});

    expect(text('.empty-card')).toContain('my_agent isn\'t deployed');
    expect(text('.empty-card')).toContain('adk-demo · us-central1');
  });

  it('opens the console through the safe values service', () => {
    create();
    (query('.card-actions button[aria-label="Open in Cloud console"]') as HTMLButtonElement).click();

    expect(safeValues.windowOpen)
        .toHaveBeenCalledWith(
            window, MINE.consoleUrl, '_blank', 'noopener');
  });

  it('offers to try a deployment from the Playground', () => {
    create();
    const tried: Deployment[] = [];
    fixture.componentInstance.tryDeployment.subscribe((d) => tried.push(d));
    (query('.card-actions .try-button') as HTMLButtonElement).click();

    expect(tried.length).toBe(1);
    expect(tried[0].id).toBe(MINE.id);
  });

  it('flags a deleted deployment once its live state says so', () => {
    deployService.getDeploymentLive.and.returnValue(
        of({supported: true, state: 'not_found', revisions: []}));
    create();
    (query('.deployment-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(text('.status-deleted')).toBe('delete Deleted');
  });

  it('reports a running deploy', () => {
    create({...RESPONSE, deployInProgress: true});

    expect(text('.in-progress')).toContain('Deploying my_agent');
  });

  it('keeps the data on screen while refreshing', () => {
    create();
    deployService.listDeployments.and.returnValue(NEVER);
    fixture.componentInstance.refresh();
    fixture.detectChanges();

    expect(queryAll('.deployment-card').length).toBe(1);
    expect(query('.header-progress')).not.toBeNull();
    expect(text('.page-refresh')).toContain('Refreshing');
  });

  it('shows skeletons on first load', () => {
    deployService.listDeployments.and.returnValue(NEVER);
    fixture = TestBed.createComponent(DeploymentsComponent);
    fixture.componentRef.setInput('appName', 'my_agent');
    fixture.detectChanges();

    expect(queryAll('.skeleton-card').length).toBe(3);
  });

  it('resyncs the connection when the server says it is gone', () => {
    deployService.listDeployments.and.returnValue(
        throwError(() => ({status: 409})));
    fixture = TestBed.createComponent(DeploymentsComponent);
    fixture.componentRef.setInput('appName', 'my_agent');
    fixture.detectChanges();

    expect(cloud.refreshStatus).toHaveBeenCalled();
  });

  it('asks for an app when none is selected', () => {
    fixture = TestBed.createComponent(DeploymentsComponent);
    fixture.detectChanges();

    expect(text('.select-app-prompt')).toContain('Select an agent');
    expect(text('.page-subtitle')).toBe('No agent selected');
    expect(deployService.listDeployments).not.toHaveBeenCalled();
  });

  it('reloads when a different app is selected', () => {
    create();
    deployService.listDeployments.calls.reset();
    fixture.componentRef.setInput('appName', 'other_agent');
    fixture.detectChanges();

    expect(deployService.listDeployments).toHaveBeenCalledWith('other_agent');
  });
});

describe('describeLookupError', () => {
  it('turns known errors into actionable hints', () => {
    expect(describeLookupError({
             target: 'cloud_run',
             region: 'europe-west1',
             message: 'Permission denied: run.services.list',
           }).hint)
        .toContain('Cloud Run Viewer');
    expect(describeLookupError({
             target: 'agent_engine',
             region: 'us-central1',
             message: 'Something odd',
           }).scope)
        .toBe('Agent Runtime · us-central1');
  });
});

describe('time formatting', () => {
  const now = Date.parse('2026-01-10T12:00:00Z');

  it('formats durations', () => {
    expect(duration('2026-01-10T11:00:00Z', '2026-01-10T11:03:12Z'))
        .toBe('3m 12s');
    expect(duration('2026-01-10T11:00:00Z', '2026-01-10T11:00:22Z'))
        .toBe('22s');
    expect(duration(null, '2026-01-10T11:00:22Z')).toBe('');
  });

  it('formats short dates, adding the year only when it differs', () => {
    expect(shortDate('2026-09-12T12:00:00Z', now)).toBe('Sep 12');
    expect(shortDate('2024-09-12T12:00:00Z', now)).toBe('Sep 12, 2024');
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-01-10T12:00:00Z');

  it('formats recent and older times', () => {
    expect(relativeTime('2026-01-10T11:59:50Z', now)).toBe('just now');
    expect(relativeTime('2026-01-10T11:55:00Z', now)).toBe('5 minutes ago');
    expect(relativeTime('2026-01-10T11:00:00Z', now)).toBe('1 hour ago');
    expect(relativeTime('2026-01-08T12:00:00Z', now)).toBe('2 days ago');
  });

  it('returns nothing for a missing or invalid time', () => {
    expect(relativeTime(null, now)).toBe('');
    expect(relativeTime('not a date', now)).toBe('');
  });
});
