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
import {AsyncPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnInit, Output, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatIconButton} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatIcon} from '@angular/material/icon';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatTab, MatTabGroup} from '@angular/material/tabs';
import {SafeHtml} from '@angular/platform-browser';
import {CustomJsonViewerComponent} from '../../custom-json-viewer/custom-json-viewer.component';
import {tap} from 'rxjs/operators';

import {OPERATION_GENERATE_CONTENT, Span} from '../../../core/models/Trace';
import {EVENT_SERVICE} from '../../../core/services/interfaces/event';
import {FEATURE_FLAG_SERVICE} from '../../../core/services/interfaces/feature-flag';
import {GRAPH_SERVICE} from '../../../core/services/interfaces/graph';
import {SAFE_VALUES_SERVICE} from '../../../core/services/interfaces/safevalues';
import {TRACE_SERVICE} from '../../../core/services/interfaces/trace';
import {UI_STATE_SERVICE} from '../../../core/services/interfaces/ui-state';
import {ViewImageDialogComponent} from '../../view-image-dialog/view-image-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-trace-event',
  templateUrl: './trace-event.component.html',
  styleUrl: './trace-event.component.scss',
  imports: [
    MatTabGroup, MatTab, CustomJsonViewerComponent, MatIconButton, MatIcon,
    MatProgressSpinner, AsyncPipe
  ]
})
export class TraceEventComponent implements OnInit {
  @Input() userId: string = '';
  @Input() sessionId: string = '';
  @Input() appName: string = '';
  @Output() panelClosed = new EventEmitter<boolean>;

  renderedEventGraph: SafeHtml|undefined;
  eventData: Map<string, any>|undefined;
  selectedRow: Span|undefined = undefined;
  rawSvgString: string|null = null;

  llmRequest: any = undefined;
  llmResponse: any = undefined;

  private readonly dialog = inject(MatDialog);
  private readonly traceService = inject(TRACE_SERVICE);
  private readonly eventService = inject(EVENT_SERVICE);
  private readonly graphService = inject(GRAPH_SERVICE);
  private readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  private readonly sanitizer = inject(SAFE_VALUES_SERVICE);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);

  private readonly isEventFilteringEnabled = toSignal(
      this.featureFlagService.isEventFilteringEnabled(),
  );

  constructor() {}

  ngOnInit() {
    this.traceService.selectedTraceRow$.subscribe(span => {
      this.selectedRow = span;
      const eventId = this.getEventIdFromSpan();
      if (eventId) {
        const io = this.selectedRow?.io;
        this.llmRequest = io?.inputs;
        this.llmResponse = io?.outputs;
        this.getEventGraph(eventId);
      }
    });
    this.traceService.eventData$.subscribe(e => this.eventData = e);
  }

  openViewImageDialog(imageData: string|null) {
    const dialogRef = this.dialog.open(ViewImageDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        imageData,
      },
    });
  }

  getEventDetails() {
    if (this.eventData && this.selectedRow) {
      const eventId = this.getEventIdFromSpan();
      return eventId ? this.eventData.get(eventId) : undefined;
    } else {
      return undefined;
    }
  }

  getEventIdFromSpan() {
    return this.selectedRow?.attrEventId;
  }

  getEventGraph(eventId: string) {
    this.eventService
        .getEvent(
            this.userId,
            this.appName,
            this.sessionId,
            eventId,
            )
        .subscribe(async (res) => {
          if (!res.dotSrc) {
            this.renderedEventGraph = undefined;
            return;
          }
          const graphSrc = res.dotSrc;
          const svg = await this.graphService.render(graphSrc);
          this.rawSvgString = svg;
          this.renderedEventGraph = this.sanitizer.bypassSecurityTrustHtml(svg);
        });
  }

  closePanel() {
    this.panelClosed.emit(true);
  }
}
