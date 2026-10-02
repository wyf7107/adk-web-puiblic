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
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {of} from 'rxjs';

import {Deployment, DeploymentsResponse} from '../../core/models/Deploy';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {DEPLOY_SERVICE} from '../../core/services/interfaces/deploy';
import {CONNECTED_STATUS, MockCloudService} from '../../core/services/testing/mock-cloud.service';
import {initTestBed} from '../../testing/utils';

import {defaultUserId, isTryable, TryDeployedDialogComponent, TryDeployedDialogData} from './try-deployed-dialog.component';

function deployment(fields: Partial<Deployment>): Deployment {
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

const RUNTIME = deployment({});
const SERVICE = deployment({
  id: 'bbbbbbbbbbbbbbbb',
  target: 'cloud_run',
  resourceName: 'my-agent',
  displayName: 'my-agent',
  serviceUrl: 'https://my-agent.a.run.app',
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

describe('TryDeployedDialogComponent', () => {
  let fixture: ComponentFixture<TryDeployedDialogComponent>;
  let dialogRef: {close: jasmine.Spy};
  let deployService: {listDeployments: jasmine.Spy};

  initTestBed();  // required for 1p compat

  async function create(data: TryDeployedDialogData, deployments = [RUNTIME, SERVICE, GKE]) {
    const cloud = new MockCloudService();
    cloud.setStatus(CONNECTED_STATUS);
    dialogRef = {close: jasmine.createSpy('close')};
    deployService = {
      listDeployments: jasmine.createSpy('listDeployments').and.returnValue(of(listing(deployments))),
    };
    await TestBed
        .configureTestingModule({
          imports: [TryDeployedDialogComponent],
          providers: [
            {provide: CLOUD_SERVICE, useValue: cloud},
            {provide: DEPLOY_SERVICE, useValue: deployService},
            {provide: MatDialogRef, useValue: dialogRef},
            {provide: MAT_DIALOG_DATA, useValue: data},
            provideNoopAnimations(),
          ],
        })
        .compileComponents();
    fixture = TestBed.createComponent(TryDeployedDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function text(selector: string): string {
    return fixture.nativeElement.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  it('says what talking to a deployed agent means', async () => {
    await create({appName: 'my_agent'});
    const consequences = text('.consequences');
    expect(consequences).toContain('production traffic');
    expect(consequences).toContain('Changes on this machine aren\'t included');
    expect(consequences).toContain('billed to adk-demo');
    expect(consequences).toContain('can change real data');
    expect(consequences).toContain('stored in the deployment\'s sessions');
  });

  it('offers only deployments it can talk to, this agent\'s first', async () => {
    await create({appName: 'my_agent'});
    expect(fixture.componentInstance.deployments()!.map((d) => d.id)).toEqual([RUNTIME.id, SERVICE.id]);
    expect(fixture.componentInstance.selectedId()).toBe(RUNTIME.id);
  });

  it('preselects the deployment it was opened for', async () => {
    await create({appName: 'my_agent', deploymentId: SERVICE.id});
    expect(text('.source-name')).toBe('my-agent');
  });

  it('suggests a user ID from the account and returns the choice', async () => {
    await create({appName: 'my_agent'});
    expect(fixture.componentInstance.userId).toBe('adk-web-dev');

    fixture.componentInstance.userId = '  tester ';
    (fixture.nativeElement.querySelector('.start-button') as HTMLButtonElement).click();
    expect(dialogRef.close).toHaveBeenCalledWith({appName: 'my_agent', deployment: RUNTIME, userId: 'tester'});
  });

  it('keeps the user ID used last time', async () => {
    await create({appName: 'my_agent', userId: 'kept'});
    expect(fixture.componentInstance.userId).toBe('kept');
  });

  it('needs a user ID', async () => {
    await create({appName: 'my_agent'});
    const input = fixture.nativeElement.querySelector('.user-field input') as HTMLInputElement;
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.start-button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('explains when there is nothing to talk to', async () => {
    await create({appName: 'my_agent'}, [GKE]);
    expect(text('.banner')).toContain('Deploy this agent to Agent Runtime or Cloud Run first');
    expect((fixture.nativeElement.querySelector('.start-button') as HTMLButtonElement).disabled).toBeTrue();
  });
});

describe('isTryable', () => {
  it('needs Agent Runtime or a Cloud Run service with a URL', () => {
    expect(isTryable(RUNTIME)).toBeTrue();
    expect(isTryable(SERVICE)).toBeTrue();
    expect(isTryable({...SERVICE, serviceUrl: null})).toBeFalse();
    expect(isTryable(GKE)).toBeFalse();
  });
});

describe('defaultUserId', () => {
  it('is named after the account', () => {
    expect(defaultUserId('wanyif@google.com')).toBe('adk-web-wanyif');
    expect(defaultUserId(null)).toBe('adk-web-dev');
  });
});
