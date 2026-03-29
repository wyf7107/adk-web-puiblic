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
import {KeyValuePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, inject, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {MatDialogTitle} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';

import {LlmRequest} from '../../core/models/types';

import {TraceTabMessagesInjectionToken} from './trace-tab.component.i18n';
import {TraceTreeComponent} from './trace-tree/trace-tree.component';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-trace-tab',
  templateUrl: './trace-tab.component.html',
  styleUrl: './trace-tab.component.scss',
  standalone: true,
  imports: [
    MatDialogTitle, TraceTreeComponent, KeyValuePipe,
    MatFormFieldModule, MatSelectModule
  ]
})

export class TraceTabComponent implements OnInit, OnChanges {
  @Input() traceData: any = [];
  invocTraces = new Map<string, any[]>();
  invocToUserMsg = new Map<string, string>();
  protected readonly i18n = inject(TraceTabMessagesInjectionToken);

  selectedTraceId: string | undefined;

  constructor() {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    if ('traceData' in changes) {
      this.rebuildTrace();
    }
  }

  rebuildTrace() {
    this.invocTraces = this.traceData.reduce((map: any, item: any) => {
      const key = item.trace_id;
      const group = map.get(key);
      if (group) {
        group.push(item);
        group.sort((a: any, b: any) => a.start_time - b.start_time);
      } else {
        map.set(key, [item]);
      }
      return map;
    }, new Map<string, any[]>());

    for (const [key, value] of this.invocTraces) {
      this.invocToUserMsg.set(key, this.findUserMsgFromInvocGroup(value))
    }

    if (!this.selectedTraceId && this.invocTraces.size > 0) {
      // Auto-select the last invocation
      this.selectedTraceId = Array.from(this.invocTraces.keys()).at(-1);
    }
  }


  getArray(n: number): number[] {
    return Array.from({length: n});
  }

  findUserMsgFromInvocGroup(group: any[]) {
    // Find a span that has both invocation_id and llm_request
    // The invocation_id is present on multiple spans, but llm_request
    // is only on the call_llm span
    const eventItem = group?.find(
        item => item.attributes !== undefined &&
            'gcp.vertex.agent.invocation_id' in item.attributes &&
            'gcp.vertex.agent.llm_request' in item.attributes)

    if (!eventItem) {
      return '[no invocation id found]';
    }

    try {
      const requestJson =
          JSON.parse(eventItem.attributes['gcp.vertex.agent.llm_request']) as
          LlmRequest
      const userContent =
          requestJson.contents.filter((c: any) => c.role == 'user').at(-1)
      return userContent?.parts[0]?.text ?? '[attachment]';
    } catch {
      return '[error parsing request]';
    }
  }

  findInvocIdFromTraceId(traceId: string) {
    const group = this.invocTraces.get(traceId);
    return group
        ?.find(
            item => item.attributes !== undefined &&
                'gcp.vertex.agent.invocation_id' in item.attributes)
        .attributes['gcp.vertex.agent.invocation_id']
  }

  mapOrderPreservingSort = (a: any, b: any): number => 0;
}
