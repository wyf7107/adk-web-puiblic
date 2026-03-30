import {AsyncPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, effect, inject, input, output} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatTooltip} from '@angular/material/tooltip';
import {type SafeHtml} from '@angular/platform-browser';
import {NgxJsonViewerModule} from 'ngx-json-viewer';

import {Event} from '../../core/models/types';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {SidePanelMessagesInjectionToken} from '../side-panel/side-panel.component.i18n';
import {SpanNode} from '../../core/models/Trace';
import {TRACE_SERVICE} from '../../core/services/interfaces/trace';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-event-tab',
  templateUrl: './event-tab.component.html',
  styleUrls: ['./event-tab.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    MatIconButton,
    MatIcon,
    MatPaginator,
    MatProgressSpinner,
    MatTooltip,
    NgxJsonViewerModule,
  ],
})
export class EventTabComponent {
  readonly eventDataSize = input.required<number>();
  readonly selectedEventIndex = input<number | undefined>();
  readonly selectedEvent = input.required<Event | undefined>();
  readonly filteredSelectedEvent = input<any>();
  readonly renderedEventGraph = input<SafeHtml | undefined>();
  readonly rawSvgString = input<string | null>(null);
  readonly llmRequest = input<any>();
  readonly llmResponse = input<any>();
  readonly traceData = input<SpanNode[]>([]);

  readonly page = output<PageEvent>();
  readonly closeSelectedEvent = output<void>();
  readonly openImageDialog = output<string | null>();
  readonly switchToTraceView = output<void>();
  readonly showAgentStructureGraph = output<boolean>();

  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly traceService = inject(TRACE_SERVICE);
  readonly i18n = inject(SidePanelMessagesInjectionToken);

  readonly isEventRequestResponseLoadingSignal = toSignal(
      this.uiStateService.isEventRequestResponseLoading(), {initialValue: false});

  readonly associatedSpans = computed(() => {
    const ev = this.selectedEvent();
    if (!ev || !ev.id) return [];
    
    const allSpans = this.traceData();
    if (!allSpans) return [];
    
    const flatten = (arr: any[]): any[] => {
      let result: any[] = [];
      for (const item of arr) {
        result.push(item);
        if (item.children) {
          result = result.concat(flatten(item.children));
        }
      }
      return result;
    };
    
    const flatSpans = flatten(allSpans);
    return flatSpans.filter(s => s.attributes && s.attributes['gcp.vertex.agent.event_id'] === ev.id);
  });

  selectedDetailTab: 'event' | 'raw' | 'request' | 'response' | 'graph' = 'event';
  copiedId: string | null = null;

  copyToClipboard(value: string | undefined | null) {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      this.copiedId = value;
      setTimeout(() => this.copiedId = null, 2000);
    });
  }

  switchToSpan(span: any) {
    this.switchToTraceView.emit();
    this.traceService.selectedRow(span);
  }

  constructor() {
    effect(() => {
      const event = this.selectedEvent();
      if (event) {
        let isTabValid = false;
        const currentTab = this.selectedDetailTab;
        if (currentTab === 'event') {
          isTabValid = true;
        } else if (currentTab === 'raw') {
          isTabValid = true;
        } else if (currentTab === 'request') {
          isTabValid = this.isEventRequestResponseLoadingSignal() || !!(this.llmRequest() && Object.keys(this.llmRequest()!).length > 0);
        } else if (currentTab === 'response') {
          isTabValid = this.isEventRequestResponseLoadingSignal() || !!(this.llmResponse() && Object.keys(this.llmResponse()!).length > 0);
        } else if (currentTab === 'graph') {
          isTabValid = true;
        }

        if (!isTabValid) {
          this.selectedDetailTab = 'event';
        }
      }
    });
  }

  formatTime(timestamp: number | undefined): string {
    if (!timestamp) return 'N/A';
    // If timestamp is before 2286-11-20 in seconds, treat as seconds.
    const inMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    return new Date(inMs).toLocaleString();
  }

  isObject(value: any): boolean {
    return value !== null && typeof value === 'object';
  }

  protected readonly Object = Object;
}
