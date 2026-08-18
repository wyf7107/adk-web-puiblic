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
import {MatExpansionPanelHarness} from '@angular/material/expansion/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

import {Span, SpanValidator} from '../../core/models/Trace';
import {TRACE_SERVICE} from '../../core/services/interfaces/trace';

import {MockTraceService} from './../../core/services/testing/mock-trace.service';
import {TraceTabComponent} from './trace-tab.component';

/**
 * Helper that builds a `Span` by routing a raw OTel-shaped object through
 * `SpanValidator`. Required because the validator strips the raw
 * `attributes` bag in favor of typed `attr*` promoted fields.
 */
function makeSpan(raw: unknown): Span {
  const result = SpanValidator.safeParse(raw);
  if (!result.success) {
    throw new Error(`Failed to build test span: ${result.error.message}`);
  }
  return result.data;
}

const MOCK_TRACE_DATA: Span[] = [
  makeSpan({
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
  }),
  makeSpan({
    name: 'tool.invoke',
    start_time: 1733084705000000000,
    end_time: 1733084755000000000,
    span_id: 'span-2',
    parent_span_id: 'span-1',
    trace_id: 'trace-1',
    attributes: {
      'tool_name': 'project_helper',
    },
  }),
];

describe('TraceTabComponent', () => {
  let component: TraceTabComponent;
  let fixture: ComponentFixture<TraceTabComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed
        .configureTestingModule({
          imports: [TraceTabComponent, NoopAnimationsModule],
          providers: [
            {provide: TRACE_SERVICE, useClass: MockTraceService},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(TraceTabComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

});
