/**
 * @license
 * Copyright 2025 Google LLC
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
import {By} from '@angular/platform-browser';

import type {SessionState} from '../../core/models/Session';

import {StateTabComponent} from './state-tab.component';

describe('StateTabComponent', () => {
  let component: StateTabComponent;
  let fixture: ComponentFixture<StateTabComponent>;

  beforeEach(async () => {
    await TestBed
        .configureTestingModule({
          imports: [StateTabComponent],
        })
        .compileComponents();

    fixture = TestBed.createComponent(StateTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty state message when sessionState is empty', () => {
    fixture.componentRef.setInput('sessionState', undefined);
    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();
    expect(emptyState.nativeElement.textContent).toContain('State is empty');
  });

  it('should show empty state message when sessionState is an empty object',
     () => {
       fixture.componentRef.setInput('sessionState', {});
       fixture.detectChanges();

       const emptyState = fixture.debugElement.query(By.css('.empty-state'));
       expect(emptyState).toBeTruthy();
       expect(emptyState.nativeElement.textContent).toContain('State is empty');
     });

  it('should render ngx-json-viewer when sessionState is populated', () => {
    fixture.componentRef.setInput(
        'sessionState', {foo: 'bar'} as unknown as SessionState);
    fixture.detectChanges();

    const jsonViewer = fixture.debugElement.query(By.css('ngx-json-viewer'));
    expect(jsonViewer).toBeTruthy();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeFalsy();
  });
});
