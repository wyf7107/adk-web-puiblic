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
import {ChangeDetectionStrategy, Component, inject, Input, output, signal, Injectable} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatPaginator, MatPaginatorIntl, PageEvent} from '@angular/material/paginator';
import {MatTooltipModule} from '@angular/material/tooltip';
import {NgxJsonViewerModule} from 'ngx-json-viewer';

import {TRACE_SERVICE} from '../../core/services/interfaces/trace';

@Injectable()
export class SpanPaginatorIntl extends MatPaginatorIntl {
  override nextPageLabel = 'Next Span';
  override previousPageLabel = 'Previous Span';
  override firstPageLabel = 'First Span';
  override lastPageLabel = 'Last Span';

  override getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0) {
      return `Span 0 of 0`;
    }
    length = Math.max(length, 0);
    const startIndex = page * pageSize;
    return `Span ${startIndex + 1} of ${length}`;
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-trace-tab',
  templateUrl: './trace-tab.component.html',
  styleUrl: './trace-tab.component.scss',
  standalone: true,
  imports: [
    MatButtonModule, MatIconModule, MatTooltipModule, NgxJsonViewerModule, MatPaginator
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: SpanPaginatorIntl }
  ]
})
export class TraceTabComponent {
  _traceData: any[] = [];
  orderedTraceData: any[] = [];

  // Input kept so we don't break side-panel binding, though not used here anymore
  @Input() set traceData(val: any[]) {
    this._traceData = val || [];
    this.orderedTraceData = this.computeOrdered(this._traceData);
  }

  get traceData(): any[] {
    return this._traceData;
  }

  computeOrdered(spans: any[]): any[] {
    const spanClones = spans.map(span => ({...span}));
    const spanMap = new Map<string, any>();
    const roots: any[] = [];

    spanClones.forEach(span => spanMap.set(span.span_id, span));
    spanClones.forEach(span => {
      if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
        const parent = spanMap.get(span.parent_span_id)!;
        parent.children = parent.children || [];
        parent.children.push(span);
      } else {
        roots.push(span);
      }
    });

    const flatten = (spansArray: any[]): any[] => {
      return spansArray.flatMap(span => [
        span,
        ...(span.children ? flatten(span.children) : [])
      ]);
    };

    return flatten(roots);
  }
  
  protected readonly traceService = inject(TRACE_SERVICE);
  selectedSpan = toSignal(this.traceService.selectedTraceRow$);
  selectedDetailTab = signal<'info' | 'raw'>('info');
  switchToEvent = output<string>();

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

  get selectedSpanIndex(): number | undefined {
    const span = this.selectedSpan();
    if (!span) return undefined;
    const index = this.orderedTraceData.findIndex(s => s.span_id === span.span_id);
    return index === -1 ? undefined : index;
  }

  onPage(event: PageEvent) {
    if (event.pageIndex >= 0 && event.pageIndex < this.orderedTraceData.length) {
      this.traceService.selectedRow(this.orderedTraceData[event.pageIndex]);
    }
  }
  
  readonly Object = Object;
}
