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

import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatButtonToggleHarness} from '@angular/material/button-toggle/testing';
import {MatDialog} from '@angular/material/dialog';
import {MatListHarness} from '@angular/material/list/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

import {Span} from '../../core/models/Trace';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {TRACE_SERVICE} from '../../core/services/interfaces/trace';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {MockFeatureFlagService} from '../../core/services/testing/mock-feature-flag.service';
import {MockTraceService} from '../../core/services/testing/mock-trace.service';
import {MockUiStateService} from '../../core/services/testing/mock-ui-state.service';

import {EventTabComponent} from './event-tab.component';
import {TraceChartComponent} from './trace-chart/trace-chart.component';

const MOCK_TRACE_DATA: Span[] = [
  {
    name: 'agent.act',
    start_time: 1733084700000000000,
    end_time: 1733084760000000000,
    span_id: 'span-1',
    trace_id: 'trace-1',
    attributes: {
      'event_id': 1,
      'gcp.vertex.agent.invocation_id': '21332-322222',
      'gcp.vertex.agent.llm_request':
          '{"contents":[{"role":"user","parts":[{"text":"Hello"}]},{"role":"agent","parts":[{"text":"Hi. What can I help you with?"}]},{"role":"user","parts":[{"text":"I need help with my project."}]}]}',
    },
  },
  {
    name: 'tool.invoke',
    start_time: 1733084705000000000,
    end_time: 1733084755000000000,
    span_id: 'span-2',
    parent_span_id: 'span-1',
    trace_id: 'trace-1',
    attributes: {
      'tool_name': 'project_helper',
    },
    children: [
      {
        name: 'sub-tool-1.invoke',
        start_time: 1733084710000000000,
        end_time: 1733084750000000000,
        span_id: 'span-3',
        parent_span_id: 'span-2',
        trace_id: 'trace-1',
        attributes: {
          'sub_tool_name': 'sub_project_helper_1',
        },
        children: [
          {
            name: 'sub-tool-2.invoke',
            start_time: 1733084715000000000,
            end_time: 1733084745000000000,
            span_id: 'span-4',
            parent_span_id: 'span-3',
            trace_id: 'trace-1',
            attributes: {
              'sub_tool_name': 'sub_project_helper_2',
            },
            children: [
              {
                name: 'sub-tool-3.invoke',
                start_time: 1733084720000000000,
                end_time: 1733084740000000000,
                span_id: 'span-5',
                parent_span_id: 'span-4',
                trace_id: 'trace-1',
                attributes: {
                  'sub_tool_name': 'sub_project_helper_3',
                },
                children: [],
              },
            ],
          },
        ],
      },
    ],
  }
] as Span[];

const MOCK_EVENTS_MAP = new Map<string, any>([
  ['event1', {title: 'Event 1 Title'}],
  ['event2', {title: 'Event 2 Title'}],
]);

describe('EventTabComponent', () => {
  let component: EventTabComponent;
  let fixture: ComponentFixture<EventTabComponent>;
  let featureFlagService: MockFeatureFlagService;
  let loader: HarnessLoader;
  let matDialogSpy: jasmine.SpyObj<MatDialog>;
  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    featureFlagService = new MockFeatureFlagService();
    matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    featureFlagService.isTraceEnabledResponse.next(true);

    await TestBed
        .configureTestingModule({
          imports: [EventTabComponent, NoopAnimationsModule],
          providers: [
            {provide: MatDialog, useValue: matDialogSpy},
            {provide: FEATURE_FLAG_SERVICE, useValue: featureFlagService},
            {provide: UI_STATE_SERVICE, useClass: MockUiStateService},
            {provide: TRACE_SERVICE, useClass: MockTraceService},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(EventTabComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);

    // Set required inputs
    fixture.componentRef.setInput('eventDataSize', 0);
    fixture.componentRef.setInput('selectedEvent', undefined);

    matDialogSpy.open.calls.reset();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
