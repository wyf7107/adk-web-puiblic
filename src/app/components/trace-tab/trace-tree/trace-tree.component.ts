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
import {ChangeDetectionStrategy, Component, inject, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';

import {Span} from '../../../core/models/Trace';
import {TRACE_SERVICE} from '../../../core/services/interfaces/trace';
import {UiEvent} from '../../../core/models/UiEvent';
import {HtmlTooltipDirective} from '../../../directives/html-tooltip.directive';
import {EventContentComponent} from '../../event-content/event-content.component';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-trace-tree',
  templateUrl: './trace-tree.component.html',
  styleUrl: './trace-tree.component.scss',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, HtmlTooltipDirective, EventContentComponent]
})
export class TraceTreeComponent implements OnInit, OnChanges {
  @Input() spans: any[] = [];
  @Input() invocationId: string = '';
  @Input() uiEvents: UiEvent[] = [];
  tree: Span[] = [];
  baseStartTimeMs = 0;
  totalDurationMs = 1;
  rootLatencyNanos = 0;
  flatTree: {span: Span; level: number}[] = [];
  traceLabelIconMap = new Map<string, string>([
    ['Invocation', 'start'],
    // TODO: Remove agent_run mapping once all ADKs span names follow OTLP GenAI semconv.
    ['agent_run', 'robot'],
    ['invoke_agent', 'robot_2'],
    ['tool', 'build'],
    ['execute_tool', 'build'],
    ['call_llm', 'chat'],
  ]);
  selectedRow: Span|undefined = undefined;
  private readonly traceService = inject(TRACE_SERVICE);

  constructor() {}

  selectRootSpan() {
    if (this.tree && this.tree.length > 0) {
      if (this.selectedRow && this.selectedRow.span_id === this.tree[0].span_id) {
        return;
      }
      this.traceService.selectedRow(this.tree[0]);
      this.traceService.setHoveredMessages(this.tree[0], this.invocationId);
    }
  }

  isRootSpanSelected() {
    if (!this.selectedRow || !this.tree || this.tree.length === 0) return false;
    return String(this.selectedRow.span_id) === String(this.tree[0].span_id);
  }



  ngOnInit(): void {
    this.rebuildTree();
    this.traceService.selectedTraceRow$.subscribe(span => {
      this.selectedRow = span;
      if (span) {
        setTimeout(() => {
          const element = document.getElementById('trace-node-' + span.span_id);
          if (element) {
            element.scrollIntoView({behavior: 'smooth', block: 'nearest'});
          }
        }, 50);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['spans'] && !changes['spans'].isFirstChange()) {
      this.rebuildTree();
    }
  }

  rebuildTree() {
    if (!this.spans || this.spans.length === 0) {
      this.tree = [];
      this.flatTree = [];
      this.rootLatencyNanos = 0;
      return;
    }
    this.tree = this.buildSpanTree(this.spans);
    this.flatTree = [];
    this.tree.forEach(root => {
      if (root.children) {
        this.flatTree.push(...this.flattenTree(root.children, 0));
      }
    });
    
    const times = this.getGlobalTimes(this.spans);
    this.baseStartTimeMs = times.start;
    this.totalDurationMs = times.duration;
    
    if (this.tree && this.tree.length > 0) {
      this.rootLatencyNanos = this.tree[0].end_time - this.tree[0].start_time;
    } else {
      this.rootLatencyNanos = 0;
    }
  }


  buildSpanTree(spans: Span[]): Span[] {
    const spanClones = spans.map(span => ({...span}));
    const spanMap = new Map<string, Span>();
    const roots: Span[] = [];

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

    return roots;
  }

  getGlobalTimes(spans: Span[]) {
    const start = Math.min(...spans.map(s => this.toMs(s.start_time)));
    const end = Math.max(...spans.map(s => this.toMs(s.end_time)));
    return {start, duration: end - start};
  }

  toMs(nanos: number): number {
    return nanos / 1_000_000;
  }

  formatDuration(nanos: number): string {
    if (nanos === 0) return '0us';
    if (nanos < 1000) return `${nanos}ns`;
    if (nanos < 1_000_000) return `${(nanos / 1000).toFixed(2)}us`;
    if (nanos < 1_000_000_000) return `${(nanos / 1_000_000).toFixed(2)}ms`;
    if (nanos < 60_000_000_000) return `${(nanos / 1_000_000_000).toFixed(2)}s`;
    
    const minutes = Math.floor(nanos / 60_000_000_000);
    const seconds = ((nanos % 60_000_000_000) / 1_000_000_000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }

  getRelativeStart(span: Span): number {
    return ((this.toMs(span.start_time) - this.baseStartTimeMs) /
            this.totalDurationMs) *
        100;
  }

  getRelativeWidth(span: Span): number {
    return ((this.toMs(span.end_time) - this.toMs(span.start_time)) /
            this.totalDurationMs) *
        100;
  }

  flattenTree(spans: Span[], level: number = 0): any[] {
    const tree = spans.flatMap(
        span =>
            [{span, level},
             ...(span.children ? this.flattenTree(span.children, level + 1) :
                                 [])]);
    return tree
  }

  getSpanIcon(label: string) {
    for (const [key, value] of this.traceLabelIconMap.entries()) {
      if (label.startsWith(key)) {
        return value;
      }
    }
    return 'start';
  }

  formatSpanName(name: string): string {
    if (name.startsWith('invoke_agent ')) {
      return name.substring('invoke_agent '.length);
    }
    if (name.startsWith('execute_tool ')) {
      return name.substring('execute_tool '.length);
    }
    return name;
  }

  getArray(n: number): number[] {
    return Array.from({length: n});
  }

  selectRow(node: any) {
    if (this.selectedRow && this.selectedRow.span_id == node.span.span_id) {
      return;
    }
    this.traceService.selectedRow(node.span);
    this.traceService.setHoveredMessages(node.span, this.invocationId)
  }

  rowSelected(node: any) {
    if (!this.selectedRow || !node?.span) return false;
    return String(this.selectedRow.span_id) === String(node.span.span_id);
  }

  isEventRow(node: any) {
    if (!node.span.attributes) {
      return false;
    }
    const eventId = node?.span.attributes['gcp.vertex.agent.event_id'];
    if (eventId && this.uiEvents && this.uiEvents.length > 0) {
      return this.uiEvents.some(e => e.event?.id === eventId);
    }
    return false;
  }

  getEventId(node: any): string {
    return node?.span?.attributes?.['gcp.vertex.agent.event_id'] ?? '';
  }

  getUiEvent(node: any): UiEvent | null {
    const eventId = this.getEventId(node);
    if (eventId && this.uiEvents && this.uiEvents.length > 0) {
      return this.uiEvents.find(e => e.event?.id === eventId) || null;
    }
    return null;
  }

  onHover(n: any) {
    this.traceService.setHoveredMessages(n.span, this.invocationId)
  }

  onHoverOut() {
    this.traceService.setHoveredMessages(undefined, this.invocationId);
    if (this.selectedRow) {
      this.traceService.setHoveredMessages(this.selectedRow, this.invocationId);
    }
  }
}
