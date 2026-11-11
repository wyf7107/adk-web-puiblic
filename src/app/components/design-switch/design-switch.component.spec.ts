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

import {AccDesign, DesignSwitchComponent} from './design-switch.component';

describe('DesignSwitchComponent', () => {
  let fixture: ComponentFixture<DesignSwitchComponent>;

  initTestBed();  // required for 1p compat

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [DesignSwitchComponent]})
        .compileComponents();
    fixture = TestBed.createComponent(DesignSwitchComponent);
    fixture.detectChanges();
  });

  function options(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.design-option'));
  }

  it('offers Classic and Luminous, the current one checked', () => {
    expect(options().map((o) => o.textContent?.trim())).toEqual([
      'Classic', 'Luminous'
    ]);
    expect(options().map((o) => o.getAttribute('aria-checked'))).toEqual([
      'true', 'false'
    ]);
    fixture.componentRef.setInput('design', 'luminous');
    fixture.detectChanges();
    expect(options()[1].getAttribute('aria-checked')).toBe('true');
  });

  it('emits only a different design', () => {
    const picked: AccDesign[] = [];
    fixture.componentInstance.designChange.subscribe((d) => picked.push(d));
    options()[0].click();  // already current
    options()[1].click();
    expect(picked).toEqual(['luminous']);
  });
});
