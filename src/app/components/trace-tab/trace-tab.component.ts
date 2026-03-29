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
import {ChangeDetectionStrategy, Component, inject, Input, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {NgxJsonViewerModule} from 'ngx-json-viewer';

import {TRACE_SERVICE} from '../../core/services/interfaces/trace';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-trace-tab',
  templateUrl: './trace-tab.component.html',
  styleUrl: './trace-tab.component.scss',
  standalone: true,
  imports: [
    MatButtonModule, MatIconModule, MatTooltipModule, NgxJsonViewerModule
  ]
})
export class TraceTabComponent {
  // Input kept so we don't break side-panel binding, though not used here anymore
  @Input() traceData: any[] = [];
  
  protected readonly traceService = inject(TRACE_SERVICE);
  selectedSpan = toSignal(this.traceService.selectedTraceRow$);
  selectedDetailTab = signal<'info' | 'raw'>('info');

  formatTime(nanos: number | undefined): string {
    if (!nanos) return 'N/A';
    return new Date(nanos / 1_000_000).toLocaleString();
  }

  get selectedSpanChildren() {
    const span = this.selectedSpan();
    if (!span) return [];
    if (span.children && span.children.length > 0) return span.children;
    return this.traceData.filter(s => s.parent_span_id === span.span_id);
  }

  selectSpanById(id: string | undefined): void {
    if (!id) return;
    const span = this.traceData.find(s => String(s.span_id) === String(id));
    if (span) {
      this.traceService.selectedRow(span);
    }
  }
  
  readonly Object = Object;
}
