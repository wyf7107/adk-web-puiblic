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

import {appFromUrl, LuminousAppComponent, luminousAppFragment} from './luminous-app.component';

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
    expect(iframe.src).toContain('hostControls=1');
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
    expect(posted).toEqual([{
      type: 'acc:context',
      theme: 'light',
      app: 'billing_assistant',
      hostControls: true
    }]);

    fixture.componentRef.setInput('appName', 'other');
    fixture.detectChanges();
    expect(posted.length).toBe(1);  // the agent doesn't follow after the start

    fixture.componentRef.setInput('theme', 'dark');
    fixture.detectChanges();
    expect(posted[1]).toEqual(
        {type: 'acc:context', theme: 'dark', app: 'other', hostControls: true});
  });

  it('ignores messages from other origins or windows', () => {
    fromFrame({type: 'acc:ready'}, 'https://evil.example');
    fromFrame({type: 'acc:ready'}, window.location.origin, window);
    expect(posted).toEqual([]);
  });
  it('relays the host controls in the frame\'s top bar', () => {
    const themes: string[] = [];
    const points: Array<{x: number, y: number}> = [];
    fixture.componentInstance.themeRequested.subscribe((t) => themes.push(t));
    fixture.componentInstance.userMenuRequested.subscribe((p) => points.push(p));

    fromFrame({type: 'acc:set-theme', theme: 'light'});
    fromFrame({type: 'acc:set-theme', theme: 'blue'});  // not a theme
    fromFrame({type: 'acc:open-user-menu', x: 10, y: 20});
    fromFrame({type: 'acc:open-user-menu', x: 'a', y: 20});  // not a point

    expect(themes).toEqual(['light']);
    const box = (fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement)
                    .getBoundingClientRect();
    expect(points).toEqual([{x: box.left + 10, y: box.top + 20}]);
  });

  it('ignores host-control messages from other windows', () => {
    const themes: string[] = [];
    fixture.componentInstance.themeRequested.subscribe((t) => themes.push(t));
    fromFrame({type: 'acc:set-theme', theme: 'light'}, window.location.origin, window);
    fromFrame({type: 'acc:set-theme', theme: 'light'}, 'https://evil.example');
    expect(themes).toEqual([]);
  });
  it('reads the agent from the page URL', () => {
    expect(appFromUrl('?ui=luminous&app=billing_assistant')).toBe('billing_assistant');
    expect(appFromUrl('?ui=luminous')).toBe('');
  });
});
