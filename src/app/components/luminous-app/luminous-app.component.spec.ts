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

import {initTestBed} from '../../testing/utils';

import {LuminousAppComponent, luminousAppFragment} from './luminous-app.component';

describe('LuminousAppComponent', () => {
  let fixture: ComponentFixture<LuminousAppComponent>;
  let frameWindow: Window;
  let posted: unknown[];

  initTestBed();  // required for 1p compat

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [LuminousAppComponent]})
        .compileComponents();
    fixture = TestBed.createComponent(LuminousAppComponent);
    fixture.componentRef.setInput('theme', 'dark');
    fixture.componentRef.setInput('appName', 'billing_assistant');
    fixture.detectChanges();
    fixture.detectChanges();  // the frame loads once the view exists
    const iframe: HTMLIFrameElement =
        fixture.nativeElement.querySelector('iframe');
    frameWindow = iframe.contentWindow!;
    posted = [];
    spyOn(frameWindow, 'postMessage').and.callFake((message: unknown) => {
      posted.push(message);
    });
  });

  function fromFrame(data: unknown, origin = window.location.origin,
                     source: Window|null = frameWindow) {
    fixture.componentInstance.handleMessage(
        new MessageEvent('message', {data, origin, source}));
    fixture.detectChanges();
  }

  it('opens the hosted app with the theme and agent', () => {
    const iframe: HTMLIFrameElement =
        fixture.nativeElement.querySelector('iframe');
    expect(iframe.src).toContain('luminous-app/index.html#');
    expect(iframe.src)
        .toContain(luminousAppFragment({theme: 'dark', app: 'billing_assistant'}));
    expect(luminousAppFragment({theme: 'light', app: ''})).toContain('theme=light');
    expect(luminousAppFragment({theme: 'light', app: ''})).not.toContain('app=');
  });

  it('sends the context once the frame is ready, then theme changes', () => {
    fixture.componentRef.setInput('theme', 'light');
    fixture.detectChanges();
    expect(posted).toEqual([]);  // not ready yet

    fromFrame({type: 'acc:ready'});
    expect(posted).toEqual(
        [{type: 'acc:context', theme: 'light', app: 'billing_assistant'}]);

    fixture.componentRef.setInput('appName', 'other');
    fixture.detectChanges();
    expect(posted.length).toBe(1);  // the agent doesn't follow after the start

    fixture.componentRef.setInput('theme', 'dark');
    fixture.detectChanges();
    expect(posted[1]).toEqual({type: 'acc:context', theme: 'dark', app: 'other'});
  });

  it('ignores messages from other origins or windows', () => {
    fromFrame({type: 'acc:ready'}, 'https://evil.example');
    fromFrame({type: 'acc:ready'}, window.location.origin, window);
    expect(posted).toEqual([]);
  });
});
