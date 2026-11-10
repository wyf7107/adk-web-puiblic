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

import {LuminousPlaygroundComponent, LuminousSession, luminousFragment} from './luminous-playground.component';

describe('LuminousPlaygroundComponent', () => {
  let fixture: ComponentFixture<LuminousPlaygroundComponent>;
  let frameWindow: Window;
  let posted: unknown[];

  initTestBed();  // required for 1p compat

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [LuminousPlaygroundComponent]})
        .compileComponents();
    fixture = TestBed.createComponent(LuminousPlaygroundComponent);
    fixture.componentRef.setInput('appName', 'billing_assistant');
    fixture.componentRef.setInput('userId', 'user');
    fixture.componentRef.setInput('sessionId', 's1');
    fixture.componentRef.setInput('theme', 'dark');
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

  it('opens the embedded playground for the current session', () => {
    const iframe: HTMLIFrameElement =
        fixture.nativeElement.querySelector('iframe');
    expect(iframe.src).toContain('luminous/index.html#/ge-web/dev-tools/adk/playground?');
    expect(iframe.src).toContain('app=billing_assistant');
    expect(iframe.src).toContain('session=s1');
    expect(iframe.src).toContain('embed=1');
    expect(iframe.src).toContain('theme=dark');
  });

  it('waits for the app before loading the frame', async () => {
    const empty = TestBed.createComponent(LuminousPlaygroundComponent);
    empty.detectChanges();
    empty.detectChanges();
    const iframe: HTMLIFrameElement = empty.nativeElement.querySelector('iframe');
    expect(iframe.getAttribute('src')).toBeNull();

    empty.componentRef.setInput('appName', 'gear_advisor');
    empty.detectChanges();
    expect(iframe.src).toContain('app=gear_advisor');
  });

  it('builds the fragment without empty app or session', () => {
    expect(luminousFragment({app: '', userId: '', session: '', theme: 'light'}))
        .toBe('/ge-web/dev-tools/adk/playground?userId=user&embed=1&theme=light');
  });

  it('sends the context once the frame is ready, then on changes', () => {
    expect(posted).toEqual([]);
    fromFrame({type: 'acc:ready'});
    expect(posted).toEqual([{
      type: 'acc:context',
      app: 'billing_assistant',
      userId: 'user',
      session: 's1',
      theme: 'dark',
    }]);

    fixture.componentRef.setInput('theme', 'light');
    fixture.detectChanges();
    expect(posted.length).toBe(2);
    expect((posted[1] as {theme: string}).theme).toBe('light');

    // Unchanged inputs send nothing more.
    fixture.componentRef.setInput('theme', 'light');
    fixture.detectChanges();
    expect(posted.length).toBe(2);
  });

  it('reports sessions the frame moves to', () => {
    const changes: LuminousSession[] = [];
    fixture.componentInstance.sessionChange.subscribe((c) => changes.push(c));
    fromFrame({
      type: 'acc:session-changed',
      app: 'billing_assistant',
      userId: 'user',
      session: 's2',
    });
    expect(changes).toEqual(
        [{app: 'billing_assistant', userId: 'user', session: 's2'}]);
  });

  it('ignores other origins, other windows and malformed messages', () => {
    const changes: LuminousSession[] = [];
    fixture.componentInstance.sessionChange.subscribe((c) => changes.push(c));
    const change = {type: 'acc:session-changed', app: 'a', session: 's2'};
    fromFrame(change, 'https://evil.example');
    fromFrame(change, window.location.origin, window);
    fromFrame({type: 'acc:session-changed', app: 'a'});
    fromFrame('acc:ready');
    fromFrame({type: 'acc:ready'}, 'https://evil.example');
    expect(changes).toEqual([]);
    expect(posted).toEqual([]);
  });
});
