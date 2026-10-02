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
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {CONNECTED_STATUS, MockCloudService} from '../../core/services/testing/mock-cloud.service';
import {initTestBed} from '../../testing/utils';

import {AppView, CLOUD_VIEWS, LeftNavComponent} from './left-nav.component';

describe('LeftNavComponent', () => {
  let fixture: ComponentFixture<LeftNavComponent>;
  let cloud: MockCloudService;

  initTestBed();  // required for 1p compat

  beforeEach(async () => {
    cloud = new MockCloudService();
    await TestBed
        .configureTestingModule({
          imports: [LeftNavComponent],
          providers: [{provide: CLOUD_SERVICE, useValue: cloud}],
        })
        .compileComponents();
    fixture = TestBed.createComponent(LeftNavComponent);
    fixture.detectChanges();
  });

  function item(label: string): HTMLElement {
    const items: HTMLElement[] =
        Array.from(fixture.nativeElement.querySelectorAll('.nav-item'));
    return items.find((b) => b.textContent?.includes(label))!;
  }

  function footer(): string {
    return fixture.nativeElement.querySelector('.nav-footer')
               ?.textContent?.replace(/\s+/g, ' ')
               .trim() ??
        '';
  }

  it('marks the active view', () => {
    expect(item('Playground').classList).toContain('active');
    fixture.componentRef.setInput('activeView', 'deployments');
    fixture.detectChanges();
    expect(item('Deployments').classList).toContain('active');
    expect(item('Playground').classList).not.toContain('active');
  });

  it('emits the view of a clicked entry', () => {
    const emitted: AppView[] = [];
    fixture.componentInstance.navigate.subscribe((v) => emitted.push(v));
    item('Deployments').click();
    item('Playground').click();  // already active
    expect(emitted).toEqual(['deployments']);
  });

  it('shows entries that are not built yet as inert "Soon" rows', () => {
    expect(item('Datasets').tagName).not.toBe('BUTTON');
    expect(item('Datasets').getAttribute('aria-disabled')).toBe('true');
    expect(item('Datasets').textContent).toContain('Soon');
  });

  it('marks cloud-only entries only while disconnected', () => {
    expect(item('Deployments').querySelector('.nav-item-cloud')).toBeNull();

    cloud.setStatus({...CONNECTED_STATUS, connected: false});
    fixture.detectChanges();
    expect(item('Deployments').querySelector('.nav-item-cloud')).not.toBeNull();
    expect(item('Playground').querySelector('.nav-item-cloud')).toBeNull();
    expect(CLOUD_VIEWS.has('deployments')).toBeTrue();
    expect(CLOUD_VIEWS.has('build')).toBeFalse();
  });

  it('re-emits an active cloud entry while disconnected, to prompt again',
     () => {
       cloud.setStatus({...CONNECTED_STATUS, connected: false});
       fixture.componentRef.setInput('activeView', 'deployments');
       fixture.detectChanges();
       const emitted: AppView[] = [];
       fixture.componentInstance.navigate.subscribe((v) => emitted.push(v));
       item('Deployments').click();
       expect(emitted).toEqual(['deployments']);
     });

  it('shows the connection in the footer and opens it on click', () => {
    expect(cloud.refreshStatus).toHaveBeenCalled();
    expect(footer()).toContain('Google Cloud');
    expect(footer()).toContain('adk-demo');
    expect(footer()).toContain('us-central1');

    cloud.setStatus({...CONNECTED_STATUS, connected: false});
    fixture.detectChanges();
    expect(footer()).toContain('Not connected');

    let clicks = 0;
    fixture.componentInstance.manageCloud.subscribe(() => clicks++);
    (fixture.nativeElement.querySelector('.nav-cloud-connect') as
     HTMLButtonElement)
        .click();
    expect(clicks).toBe(1);
  });
});
