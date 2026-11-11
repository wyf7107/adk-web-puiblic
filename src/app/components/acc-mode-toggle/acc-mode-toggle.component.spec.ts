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

import {AccModeToggleComponent} from './acc-mode-toggle.component';

describe('AccModeToggleComponent', () => {
  let fixture: ComponentFixture<AccModeToggleComponent>;

  initTestBed();  // required for 1p compat

  beforeEach(async () => {
    await TestBed
        .configureTestingModule({
          imports: [AccModeToggleComponent, NoopAnimationsModule],
        })
        .compileComponents();
    fixture = TestBed.createComponent(AccModeToggleComponent);
    fixture.detectChanges();
  });

  function options(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.mode-option button'));
  }

  function checked(): boolean[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.mode-option'))
        .map((t) => (t as HTMLElement).classList.contains('mat-button-toggle-checked'));
  }

  it('offers Build and Manage, the current one selected', () => {
    expect(options().map((o) => o.textContent?.trim())).toEqual(['Build', 'Manage']);
    expect(checked()).toEqual([true, false]);
    fixture.componentRef.setInput('mode', 'manager');
    fixture.detectChanges();
    expect(checked()).toEqual([false, true]);
  });

  it('emits only a different mode', () => {
    const picked: AccMode[] = [];
    fixture.componentInstance.modeChange.subscribe((m) => picked.push(m));
    options()[0].click();  // Build, already current
    options()[1].click();
    expect(picked).toEqual(['manager']);
  });
});
