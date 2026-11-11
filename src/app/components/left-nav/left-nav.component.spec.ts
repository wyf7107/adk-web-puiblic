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

import {AppView, CLOUD_VIEWS, LeftNavComponent, MANAGER_VIEWS} from './left-nav.component';

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

  function groupTitles(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.nav-group-title'))
        .map((t) => (t as HTMLElement).textContent!.trim());
  }

  it('lists every page but the Playground, in its stages', () => {
    expect(groupTitles()).toEqual(
        ['Evaluate', 'Ship', 'Operate', 'Quality', 'Govern', 'Extensions']);
    expect(item('Fleet health')).toBeTruthy();
    expect(item('Deployments')).toBeTruthy();
    expect(item('Alerts')).toBeTruthy();
    expect(item('Playground')).toBeUndefined();
  });

  it('marks the active view', () => {
    fixture.componentRef.setInput('activeView', 'fleet-health');
    fixture.detectChanges();
    expect(item('Fleet health').classList).toContain('active');
    fixture.componentRef.setInput('activeView', 'deployments');
    fixture.detectChanges();
    expect(item('Deployments').classList).toContain('active');
    expect(item('Fleet health').classList).not.toContain('active');
  });

  it('emits the view of a clicked entry', () => {
    fixture.componentRef.setInput('activeView', 'fleet-health');
    fixture.detectChanges();
    const emitted: AppView[] = [];
    fixture.componentInstance.navigate.subscribe((v) => emitted.push(v));
    item('Deployments').click();
    item('Fleet health').click();  // already active
    expect(emitted).toEqual(['deployments']);
  });

  it('shows entries that are not built yet as inert "Soon" rows', () => {
    for (const label of ['Datasets', 'Alerts', 'Agent Registry']) {
      expect(item(label).tagName).not.toBe('BUTTON');
      expect(item(label).getAttribute('aria-disabled')).toBe('true');
      expect(item(label).textContent).toContain('Soon');
    }
  });

  it('puts every page but the Playground in Manager', () => {
    expect(MANAGER_VIEWS.has('build')).toBeFalse();
    for (const view of ['fleet-health', 'deployments', 'sessions', 'logs', 'monitoring'] as AppView[]) {
      expect(MANAGER_VIEWS.has(view)).toBeTrue();
    }
  });

  it('marks cloud-only entries only while disconnected', () => {
    expect(item('Deployments').querySelector('.nav-item-cloud')).toBeNull();

    cloud.setStatus({...CONNECTED_STATUS, connected: false});
    fixture.detectChanges();
    expect(item('Deployments').querySelector('.nav-item-cloud')).not.toBeNull();
    expect(item('Fleet health').querySelector('.nav-item-cloud')).toBeNull();
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
