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

import {Deployment, DeploymentsResponse} from '../../core/models/Deploy';
import {Session} from '../../core/models/Session';
import {Event} from '../../core/models/types';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {DEPLOY_SERVICE} from '../../core/services/interfaces/deploy';
import {CONNECTED_STATUS, MockCloudService} from '../../core/services/testing/mock-cloud.service';
import {initTestBed} from '../../testing/utils';
import {CloudConnectDialogComponent} from '../cloud-connect-dialog/cloud-connect-dialog.component';
import {deploymentShortId} from '../deployment-picker/deployment-picker.component';

import {CloudSessionsComponent, OpenSessionRequest, overview, parseError, transcript} from './cloud-sessions.component';

function runtime(fields: Partial<Deployment>): Deployment {
  return {
    id: 'aaaaaaaaaaaaaaaa',
    target: 'agent_engine',
    region: 'us-central1',
    project: 'adk-demo',
    resourceName: 'projects/adk-demo/locations/us-central1/reasoningEngines/42',
    displayName: 'my_agent',
    labels: {},
    matchesApp: true,
    ...fields,
  };
}

const MINE = runtime({});
const OTHER = runtime({
  id: 'bbbbbbbbbbbbbbbb',
  displayName: 'someone_else',
  matchesApp: false,
});
const CLOUD_RUN = runtime({
  id: 'cccccccccccccccc',
  target: 'cloud_run',
  resourceName: 'my-agent',
  displayName: 'my-agent',
  serviceUrl: 'https://my-agent.a.run.app',
});
const CLOUD_RUN_NO_URL = runtime({
  id: 'dddddddddddddddd',
  target: 'cloud_run',
  resourceName: 'broken',
  serviceUrl: null,
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

function event(fields: Partial<Event>): Event {
  return {id: 'e', content: {role: 'model', parts: []}, ...fields} as Event;
}

const SESSION: Session = {
  id: 's-new',
  appName: 'my_agent',
  userId: 'bob',
  state: {city: 'Paris'},
  events: [
    event({author: 'user', content: {role: 'user', parts: [{text: 'Weather?'}]}}),
    event({
      author: 'root_agent',
      content: {
        role: 'model',
        parts: [{functionCall: {name: 'get_weather', args: {city: 'Paris'}}}],
      },
    }),
    event({
      author: 'root_agent',
      content: {
        role: 'user',
        parts: [{functionResponse: {name: 'get_weather', response: {t: 21}}}],
      },
    }),
    event({
      author: 'root_agent',
      content: {role: 'model', parts: [{text: 'It is 21°C.'}]},
    }),
  ],
};

describe('CloudSessionsComponent', () => {
  let fixture: ComponentFixture<CloudSessionsComponent>;
  let cloud: MockCloudService;
  let deployService: {listDeployments: jasmine.Spy};
  let dialog: {open: jasmine.Spy};

  initTestBed();  // required for 1p compat

  function create(deployments: Deployment[] = [MINE, OTHER, CLOUD_RUN]) {
    deployService.listDeployments.and.returnValue(of(listing(deployments)));
    fixture = TestBed.createComponent(CloudSessionsComponent);
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
    cloud.listSessions.and.returnValue(of({
      sessions: [
        {id: 's-new', userId: 'bob', lastUpdateTime: 200, stateKeyCount: 1},
        {id: 's-old', userId: 'alice', lastUpdateTime: 100, stateKeyCount: 0},
      ],
      truncated: false,
    }));
    cloud.getSession.and.returnValue(of(SESSION));
    deployService = {listDeployments: jasmine.createSpy('listDeployments')};
    dialog = {open: jasmine.createSpy('open')};
    await TestBed
        .configureTestingModule({
          imports: [CloudSessionsComponent],
          providers: [
            {provide: CLOUD_SERVICE, useValue: cloud},
            {provide: DEPLOY_SERVICE, useValue: deployService},
            {provide: MatDialog, useValue: dialog},
            provideNoopAnimations(),
          ],
        })
        .compileComponents();
  });

  it('opens on this agent\'s Agent Runtime and lists its sessions', () => {
    create();

    expect(cloud.listSessions).toHaveBeenCalledWith('my_agent', MINE.id, '');
    expect(text('.source-picker')).toContain('my_agent');
    expect(queryAll('.session-row').length).toBe(2);
    expect(text('.session-row')).toContain('bob');
    expect(text('.list-meta')).toContain('2 sessions');
  });

  it('offers Agent Runtime and reachable Cloud Run deployments', () => {
    create([MINE, OTHER, CLOUD_RUN, CLOUD_RUN_NO_URL]);
    expect(fixture.componentInstance.sources()!.map((d) => d.id)).toEqual([
      MINE.id,
      OTHER.id,
      CLOUD_RUN.id,
    ]);
    expect(text('.source-count')).toBe('3 deployments available');
  });

  it('prefers this agent\'s Agent Runtime over its Cloud Run service', () => {
    create([CLOUD_RUN, MINE]);
    expect(fixture.componentInstance.selectedSourceId()).toBe(MINE.id);
  });

  it('reads Cloud Run one user at a time', () => {
    create([CLOUD_RUN]);

    expect(text('.source-meta')).toContain('Cloud Run');
    expect(query('.cloud-run-note')).not.toBeNull();
    expect(text('.user-prompt')).toContain('Enter a user ID');
    expect(cloud.listSessions).not.toHaveBeenCalled();

    fixture.componentInstance.userFilter = 'bob';
    fixture.componentInstance.applyFilter();
    fixture.detectChanges();
    expect(cloud.listSessions)
        .toHaveBeenCalledWith('my_agent', CLOUD_RUN.id, 'bob');
    expect(queryAll('.session-row').length).toBe(2);
  });

  it('opens a clicked session in the Playground', () => {
    create();
    const opened: OpenSessionRequest[] = [];
    fixture.componentInstance.openSession.subscribe((r) => opened.push(r));
    cloud.getSession.calls.reset();
    queryAll('.session-row')[0].click();

    // Already fetched for the table's preview.
    expect(cloud.getSession).not.toHaveBeenCalled();
    expect(opened.length).toBe(1);
    expect(opened[0].session).toBe(SESSION);
    expect(opened[0].label).toBe('my_agent · bob');
  });

  it('fetches a session without a preview before opening it', () => {
    cloud.getSession.and.returnValue(throwError(() => ({status: 500})));
    create();
    const opened: OpenSessionRequest[] = [];
    fixture.componentInstance.openSession.subscribe((r) => opened.push(r));
    cloud.getSession.and.returnValue(of(SESSION));
    queryAll('.session-row')[0].click();

    expect(cloud.getSession)
        .toHaveBeenCalledWith('my_agent', MINE.id, 's-new', 'bob');
    expect(opened.length).toBe(1);
  });

  it('reports a session that cannot be opened', () => {
    cloud.getSession.and.returnValue(throwError(
        () => ({status: 502, error: {detail: 'Session is gone'}})));
    create();
    const opened: OpenSessionRequest[] = [];
    fixture.componentInstance.openSession.subscribe((r) => opened.push(r));
    queryAll('.session-row')[0].click();
    fixture.detectChanges();

    expect(opened.length).toBe(0);
    expect(text('.open-error')).toContain('Session is gone');
  });

  it('previews each listed session in the table', () => {
    create();

    expect(cloud.getSession).toHaveBeenCalledTimes(2);
    const rows = queryAll('.session-row');
    expect(rows[0].querySelector('.conv-title')?.textContent).toBe('Weather?');
    expect(rows[0].querySelector('.outcome')?.textContent).toContain('Replied');
  });

  it('marks sessions whose preview failed', () => {
    cloud.getSession.and.returnValue(throwError(() => ({status: 500})));
    create();
    expect(text('.session-row .conv-title')).toBe('Preview unavailable');
  });

  it('shows sessions a page at a time', () => {
    const sessions = Array.from({length: 30}, (_, i) => ({
      id: `s${i}`,
      userId: 'u',
      lastUpdateTime: 100 - i,
      stateKeyCount: 0,
    }));
    cloud.listSessions.and.returnValue(of({sessions, truncated: false}));
    create();

    expect(queryAll('.session-row').length).toBe(25);
    expect(cloud.getSession).toHaveBeenCalledTimes(25);
    expect(text('.show-more')).toBe('Show 5 more');
    (query('.show-more') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(queryAll('.session-row').length).toBe(30);
    expect(cloud.getSession).toHaveBeenCalledTimes(30);
  });

  it('filters to a user from their row without opening it', () => {
    create();
    const opened: OpenSessionRequest[] = [];
    fixture.componentInstance.openSession.subscribe((r) => opened.push(r));
    (queryAll('.user-chip')[1]).click();
    expect(opened.length).toBe(0);
    fixture.detectChanges();

    expect(cloud.listSessions).toHaveBeenCalledWith('my_agent', MINE.id, 'alice');
  });

  it('filters by user on the server', () => {
    create();
    fixture.componentInstance.userFilter = 'alice';
    fixture.componentInstance.applyFilter();
    fixture.detectChanges();

    expect(cloud.listSessions).toHaveBeenCalledWith('my_agent', MINE.id, 'alice');
  });

  it('says when the list was cut short', () => {
    cloud.listSessions.and.returnValue(of({
      sessions: [{id: 's', userId: 'u', lastUpdateTime: 1, stateKeyCount: 0}],
      truncated: true,
    }));
    create();
    expect(text('.list-meta')).toContain('filter by user to find older ones');
  });

  it('explains an empty session store', () => {
    cloud.listSessions.and.returnValue(of({sessions: [], truncated: false}));
    create();
    expect(text('.list-empty')).toContain('No sessions stored yet');
  });

  it('explains when this agent has nothing deployed to read from', () => {
    create([OTHER, {...CLOUD_RUN, matchesApp: false}]);

    expect(text('.no-runtime')).toContain('isn\'t deployed in this project yet');
    // The rest of the project can still be browsed.
    expect(text('.source-name')).toBe('Choose a deployment');
    expect(cloud.listSessions).not.toHaveBeenCalled();
    let deployments = 0;
    fixture.componentInstance.goToDeployments.subscribe(() => deployments++);
    (query('.no-runtime .actions button') as HTMLButtonElement).click();
    expect(deployments).toBe(1);
  });

  it('tells same-named sources apart by the end of their id', () => {
    create();
    expect(text('.source-id')).toBe('42');
    expect(deploymentShortId(
               runtime({resourceName: 'projects/p/locations/l/reasoningEngines/4679325224989097984'})))
        .toBe('…097984');
  });

  it('switches to another Agent Runtime', () => {
    create();
    cloud.listSessions.calls.reset();
    fixture.componentInstance.selectSource(OTHER);
    fixture.detectChanges();

    expect(cloud.listSessions).toHaveBeenCalledWith('my_agent', OTHER.id, '');
    expect(text('.source-picker')).toContain('someone_else');
  });

  it('reports a failure to list sessions', () => {
    cloud.listSessions.and.returnValue(throwError(
        () => ({status: 502, error: {detail: 'Permission denied'}})));
    create();
    expect(text('.list-error')).toContain('Permission denied');
  });

  it('offers to connect when not connected', () => {
    cloud.setStatus({...CONNECTED_STATUS, connected: false});
    create();

    expect(text('.not-connected')).toContain('Connect to Google Cloud');
    expect(deployService.listDeployments).not.toHaveBeenCalled();
    (query('.not-connected .actions button') as HTMLButtonElement).click();
    expect(dialog.open).toHaveBeenCalledWith(
        CloudConnectDialogComponent, jasmine.anything());
  });
});

describe('transcript', () => {
  it('skips thoughts and surfaces errors', () => {
    const items = transcript([
      event({
        author: 'a',
        content: {role: 'model', parts: [{text: 'hmm', thought: true}]},
      }),
      event({author: 'a', errorMessage: 'Quota exceeded'}),
    ]);
    expect(items).toEqual([
      jasmine.objectContaining({kind: 'error', text: 'Quota exceeded'}),
    ]);
  });

  it('truncates long tool values', () => {
    const [item] = transcript([event({
      author: 'a',
      content: {
        role: 'model',
        parts: [{functionCall: {name: 'f', args: {x: 'y'.repeat(500)}}}],
      },
    })]);
    expect(item.text.length).toBeLessThan(160);
    expect(item.text.endsWith('…)')).toBeTrue();
  });
});

describe('parseError', () => {
  it('pulls the message out of an API error', () => {
    expect(parseError(
               '404 NOT_FOUND. {\'error\': {\'code\': 404, \'message\': ' +
               '\'Model `m` was not found.\', \'status\': \'NOT_FOUND\'}}'))
        .toEqual({code: '404 NOT_FOUND', message: 'Model `m` was not found.'});
  });

  it('keeps other text as the message', () => {
    expect(parseError('Quota exceeded'))
        .toEqual({code: '', message: 'Quota exceeded'});
  });
});

describe('overview', () => {
  function session(events: Event[]): Session {
    return {id: 's', appName: 'a', userId: 'u', state: {}, events};
  }

  it('titles a session by its first user message', () => {
    const o = overview(SESSION);
    expect(o.title).toBe('Weather?');
    expect(o.eventCount).toBe(4);
    expect(o.outcome).toBe('replied');
  });

  it('reports errors and unanswered messages', () => {
    expect(overview(session([
             event({author: 'user', content: {role: 'user', parts: [{text: 'Hi'}]}}),
             event({author: 'a', errorMessage: '500 INTERNAL. boom'}),
           ])))
        .toEqual(jasmine.objectContaining(
            {outcome: 'error', errorMessage: 'boom'}));
    expect(overview(session([
             event({author: 'user', content: {role: 'user', parts: [{text: 'Hi'}]}}),
           ])).outcome)
        .toBe('no-reply');
    expect(overview(session([])))
        .toEqual(jasmine.objectContaining({title: '', outcome: 'empty'}));
  });
});
