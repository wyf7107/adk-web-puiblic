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
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {AccMode} from '../left-nav/left-nav.component';
import {initTestBed} from '../../testing/utils';

import {AccModeMenuComponent} from './acc-mode-menu.component';

describe('AccModeMenuComponent', () => {
  let fixture: ComponentFixture<AccModeMenuComponent>;

  initTestBed();  // required for 1p compat

  beforeEach(async () => {
    await TestBed
        .configureTestingModule({
          imports: [AccModeMenuComponent, NoopAnimationsModule],
        })
        .compileComponents();
    fixture = TestBed.createComponent(AccModeMenuComponent);
    fixture.detectChanges();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.mode-trigger');
  }

  function openOptions(): HTMLButtonElement[] {
    trigger().click();
    fixture.detectChanges();
    return Array.from(document.querySelectorAll('.mode-option'));
  }

  it('names the current mode', () => {
    expect(trigger().textContent).toContain('Builder');
    fixture.componentRef.setInput('mode', 'manager');
    fixture.detectChanges();
    expect(trigger().textContent).toContain('Manager');
  });

  it('lists both modes, the current one checked', () => {
    const options = openOptions();
    expect(options.map((o) => o.querySelector('.mode-option-label')!.textContent))
        .toEqual(['Builder', 'Manager']);
    expect(options.map((o) => o.getAttribute('aria-checked')))
        .toEqual(['true', 'false']);
  });

  it('emits only a different mode', () => {
    const picked: AccMode[] = [];
    fixture.componentInstance.modeChange.subscribe((m) => picked.push(m));
    openOptions()[0].click();  // Builder, already current
    openOptions()[1].click();
    expect(picked).toEqual(['manager']);
  });
});
