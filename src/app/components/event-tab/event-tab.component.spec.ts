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
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';


import {FEATURE_FLAG_SERVICE} from '../../core/services/feature-flag.service';
import {MockFeatureFlagService} from '../../core/services/testing/mock-feature-flag.service';
import {EventTabComponent} from './event-tab.component';

describe('EventTabComponent', () => {
  let component: EventTabComponent;
  let fixture: ComponentFixture<EventTabComponent>;
  let featureFlagService: MockFeatureFlagService;
  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    featureFlagService = new MockFeatureFlagService();

    featureFlagService.isTraceEnabledResponse.next(true);

    await TestBed.configureTestingModule({
    imports: [MatDialogModule, EventTabComponent],
    providers: [
      {provide: MatDialogRef, useValue: mockDialogRef},
      {provide: FEATURE_FLAG_SERVICE, useValue: featureFlagService},
    ],
}).compileComponents();

    fixture = TestBed.createComponent(EventTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('EventTabComponent feature disabling', () => {
  let component: EventTabComponent;
  let fixture: ComponentFixture<EventTabComponent>;
  let featureFlagService: MockFeatureFlagService;
  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    featureFlagService = new MockFeatureFlagService();

    featureFlagService.isTraceEnabledResponse.next(false);

    await TestBed.configureTestingModule({
      imports: [MatDialogModule, EventTabComponent],
      providers: [
        {provide: MatDialogRef, useValue: mockDialogRef},
        {provide: FEATURE_FLAG_SERVICE, useValue: featureFlagService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventTabComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('traceData', [
      {
        trace_id: '1',
        span_id: '1',
        start_time: 1,
        end_time: 2,
        name: 'test',
      },
    ]);
    fixture.detectChanges();
  });

  it('should hide the Trace mat-button-toggle', () => {
    const traceToggle = fixture.nativeElement.querySelector(
      'mat-button-toggle[value="trace"]',
    );
    expect(traceToggle).toBeNull();
  });
});
