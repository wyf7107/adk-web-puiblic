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
import {MatDialogRef} from '@angular/material/dialog';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {throwError} from 'rxjs';

import {CloudStatus} from '../../core/models/Cloud';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {CONNECTED_STATUS, MockCloudService} from '../../core/services/testing/mock-cloud.service';
import {MockSafeValuesService} from '../../core/services/testing/mock-safevalues.service';
import {fakeAsync, initTestBed, tick} from '../../testing/utils';

import {CloudConnectDialogComponent, highlight} from './cloud-connect-dialog.component';

const SIGNED_OUT: CloudStatus = {
  provider: 'gcp',
  connected: false,
  credentialsFound: false,
  message: 'Not signed in to Google Cloud.',
};

describe('CloudConnectDialogComponent', () => {
  let fixture: ComponentFixture<CloudConnectDialogComponent>;
  let cloud: MockCloudService;
  let dialogRef: {close: jasmine.Spy};
  let safeValues: MockSafeValuesService;

  initTestBed();  // required for 1p compat

  function create(status: CloudStatus) {
    cloud.setStatus(status);
    fixture = TestBed.createComponent(CloudConnectDialogComponent);
    fixture.detectChanges();
  }

  function query<T extends HTMLElement = HTMLElement>(selector: string): T {
    return fixture.nativeElement.querySelector(selector);
  }

  function type(selector: string, value: string) {
    const input = query<HTMLInputElement>(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    cloud = new MockCloudService();
    dialogRef = {close: jasmine.createSpy('close')};
    safeValues = new MockSafeValuesService();
    await TestBed
        .configureTestingModule({
          imports: [CloudConnectDialogComponent],
          providers: [
            {provide: CLOUD_SERVICE, useValue: cloud},
            {provide: MatDialogRef, useValue: dialogRef},
            {provide: SAFE_VALUES_SERVICE, useValue: safeValues},
            provideNoopAnimations(),
          ],
        })
        .compileComponents();
  });

  it('signs in by opening the sign-in page and taking the code', async () => {
    create(SIGNED_OUT);
    expect(query('.connect-project')).toBeNull();

    query<HTMLButtonElement>('.connect-sign-in').click();
    fixture.detectChanges();
    expect(cloud.startLogin).toHaveBeenCalled();
    expect(safeValues.windowOpen)
        .toHaveBeenCalledWith(window, 'https://auth', '_blank', 'noopener');

    await fixture.whenStable();
    type('.connect-code', '4/abc');
    query<HTMLButtonElement>('.connect-submit-code').click();
    fixture.detectChanges();

    expect(cloud.completeLogin).toHaveBeenCalledWith('login-1', '4/abc');
    expect(cloud.listProjects).toHaveBeenCalled();
    expect(query('.connect-project')).not.toBeNull();
  });

  it('connects to the chosen project and closes', async () => {
    create({...CONNECTED_STATUS, connected: false, project: null});
    await fixture.whenStable();
    type('.connect-project', 'my-project');
    query<HTMLButtonElement>('.connect-save').click();

    expect(cloud.connect).toHaveBeenCalledWith({
      provider: 'gcp',
      project: 'my-project',
      region: 'us-central1',
    });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('prefills the current connection and can disconnect', async () => {
    create(CONNECTED_STATUS);
    await fixture.whenStable();
    expect(query<HTMLInputElement>('.connect-project').value).toBe('adk-demo');

    query<HTMLButtonElement>('.connect-disconnect').click();
    expect(cloud.disconnect).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('only offers Google Cloud for now', () => {
    create(SIGNED_OUT);
    const providers: HTMLButtonElement[] =
        Array.from(fixture.nativeElement.querySelectorAll('.connect-provider'));
    expect(providers.filter((p) => !p.disabled).map((p) => p.textContent?.trim()))
        .toEqual(['Google Cloud']);
  });

  it('recommends a personal account over a service account, dismissibly',
     () => {
       create({...CONNECTED_STATUS, credentialType: 'service_account'});
       expect(query('.recommendation').textContent)
           .toContain('this machine\'s default credentials');
       const keep = Array.from<HTMLButtonElement>(
                        fixture.nativeElement.querySelectorAll(
                            '.recommendation button'))
                        .find((b) => b.textContent?.includes('Keep using'))!;
       keep.click();
       fixture.detectChanges();
       expect(query('.recommendation')).toBeNull();
     });

  it('shows why sign-in failed under the code, and starts over on Try again',
     () => {
       cloud.completeLogin.and.returnValue(throwError(
           () => ({status: 400, error: {detail: 'Sign-in failed. Bad code.'}})));
       create(SIGNED_OUT);
       query<HTMLButtonElement>('.connect-sign-in').click();
       fixture.detectChanges();
       fixture.componentInstance.code = 'bad';
       fixture.componentInstance.submitCode();
       fixture.detectChanges();

       expect(query('.code-error-text').textContent).toContain('Bad code');
       expect(query('.connect-submit-code').textContent).toContain('Try again');
       cloud.startLogin.calls.reset();
       query<HTMLButtonElement>('.connect-submit-code').click();
       expect(cloud.startLogin).toHaveBeenCalled();
     });

  it('titles the dialog for editing an existing connection', () => {
    create(CONNECTED_STATUS);
    expect(query('.connect-title').textContent).toContain('Cloud connection');
    expect(query('.connect-save').textContent).toContain('Save');
  });

  it('cancels an unfinished sign-in when closed', () => {
    create(SIGNED_OUT);
    query<HTMLButtonElement>('.connect-sign-in').click();
    fixture.destroy();
    expect(cloud.cancelLogin).toHaveBeenCalledWith('login-1');
  });

  it('searches projects on the server as the user types', fakeAsync(() => {
       create({...CONNECTED_STATUS, connected: false});
       cloud.listProjects.calls.reset();
       fixture.componentInstance.onProjectInput('ad');
       fixture.componentInstance.onProjectInput('adk');
       tick(299);
       expect(cloud.listProjects).not.toHaveBeenCalled();
       tick(1);
       expect(cloud.listProjects.calls.allArgs()).toEqual([['adk']]);
     }));

  it('lets a project be typed when projects cannot be listed', () => {
    cloud.listProjects.and.returnValue(throwError(() => ({status: 502})));
    create({...CONNECTED_STATUS, connected: false});
    expect(fixture.nativeElement.textContent).toContain('type a project ID');
    expect(query('.connect-project')).not.toBeNull();
  });

  it('highlights the searched text in project IDs', () => {
    expect(highlight('google.com:adk-demo', 'ADK-de')).toEqual({
      before: 'google.com:',
      match: 'adk-de',
      after: 'mo',
    });
    expect(highlight('other', 'adk').match).toBe('');
  });

  it('explains a server without cloud support', () => {
    cloud.refreshStatus.and.returnValue(throwError(() => ({status: 404})));
    fixture = TestBed.createComponent(CloudConnectDialogComponent);
    fixture.detectChanges();
    expect(query('.connect-banner-error').textContent)
        .toContain('local `adk web`');
  });
});

