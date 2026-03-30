import {AsyncPipe, DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, effect, inject, input, output, ViewChild, ElementRef} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatTooltip} from '@angular/material/tooltip';
import {MatMenuModule, MatMenuTrigger} from '@angular/material/menu';
import {type SafeHtml} from '@angular/platform-browser';
import {NgxJsonViewerModule} from 'ngx-json-viewer';

import {Event} from '../../core/models/types';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {SidePanelMessagesInjectionToken} from '../side-panel/side-panel.component.i18n';
import {SpanNode} from '../../core/models/Trace';
import {TRACE_SERVICE} from '../../core/services/interfaces/trace';
import {addSvgNodeHoverEffects} from '../../utils/svg-interaction.utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-event-tab',
  templateUrl: './event-tab.component.html',
  styleUrls: ['./event-tab.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    MatIconButton,
    MatIcon,
    MatPaginator,
    MatProgressSpinner,
    MatTooltip,
    MatMenuModule,
    NgxJsonViewerModule,
  ],
})
export class EventTabComponent {
  readonly eventDataSize = input.required<number>();
  readonly eventDataMap = input<Map<string, any>>(new Map());
  readonly selectedEventIndex = input<number | undefined>();
  readonly selectedEvent = input.required<Event | undefined>();
  readonly filteredSelectedEvent = input<any>();
  readonly renderedEventGraph = input<SafeHtml | undefined>();
  readonly rawSvgString = input<string | null>(null);
  readonly llmRequest = input<any>();
  readonly llmResponse = input<any>();
  readonly traceData = input<SpanNode[]>([]);
  readonly appName = input<string>('');
  readonly selectedEventGraphPath = input<string>('');

  readonly breadcrumbs = computed(() => {
    const path = this.selectedEventGraphPath();
    if (!path) return [];
    return path.split('/').filter(s => s);
  });

  readonly page = output<PageEvent>();
  readonly closeSelectedEvent = output<void>();
  readonly openImageDialog = output<string | null>();
  readonly switchToTraceView = output<void>();
  readonly showAgentStructureGraph = output<boolean>();
  readonly drillDownNodePath = output<string>();
  readonly selectEventById = output<string>();

  @ViewChild('eventMenuTrigger') eventMenuTrigger!: MatMenuTrigger;
  @ViewChild('graphContainer') graphContainer!: ElementRef;

  menuEvents: any[] = [];
  menuPos = { x: 0, y: 0 };

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

  private _selectedDetailTab: 'event' | 'raw' | 'request' | 'response' | 'graph' = 'event';
  
  get selectedDetailTab() {
    return this._selectedDetailTab;
  }
  
  set selectedDetailTab(tab: 'event' | 'raw' | 'request' | 'response' | 'graph') {
    this._selectedDetailTab = tab;
    if (tab === 'graph') {
      setTimeout(() => {
        if (this.graphContainer?.nativeElement) {
          addSvgNodeHoverEffects(this.graphContainer.nativeElement, (nodeName: string, mouseEvent?: MouseEvent) => {
            this.handleNodeClick(nodeName, mouseEvent);
          });
        }
      }, 50);
    }
  }

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
      const svgTree = this.renderedEventGraph();
      const currentTab = this._selectedDetailTab;
      if (svgTree && currentTab === 'graph') {
        setTimeout(() => {
          if (this.graphContainer?.nativeElement) {
            addSvgNodeHoverEffects(this.graphContainer.nativeElement, (nodeName: string, mouseEvent?: MouseEvent) => {
              this.handleNodeClick(nodeName, mouseEvent);
            });
          }
        }, 50);
      }
    });

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

  handleNodeClick(nodeName: string, mouseEvent?: MouseEvent) {
    const allEvents = Array.from(this.eventDataMap().values());
    
    const travelsForNode: any[][] = [];
    let currentTravel: any[] = [];
    let lastNodeName = '';

    allEvents.forEach(ev => {
      let np = ev.nodeInfo?.path;
      if (ev.author === 'user') {
        np = '__START__';
      }
      if (!np) return;

      const segments = np.split('/');
      let evNodeName = segments[segments.length - 1];
      let evGraphPath = '';

      if (segments.length >= 2 && segments[segments.length - 1] === 'call_llm' && segments[segments.length - 2] === ev.author) {
        evNodeName = segments[segments.length - 2];
        evGraphPath = segments.slice(1, -2).join('/');
      } else {
        evGraphPath = segments.slice(1, -1).join('/');
      }
      
      if (evGraphPath === this.selectedEventGraphPath()) {
        if (evNodeName !== lastNodeName) {
           if (lastNodeName === nodeName && currentTravel.length > 0) {
             travelsForNode.push(currentTravel);
           }
           lastNodeName = evNodeName;
           currentTravel = [];
        }
        
        if (evNodeName === nodeName) {
           currentTravel.push(ev);
        }
      }
    });

    if (lastNodeName === nodeName && currentTravel.length > 0) {
       travelsForNode.push(currentTravel);
    }

    if (travelsForNode.length === 0) {
      return;
    } else if (travelsForNode.length === 1) {
      this.selectEventById.emit(travelsForNode[0][0].id);
    } else {
      this.menuEvents = travelsForNode.map((travel, index) => ({
        id: travel[0].id,
        runIndex: index + 1,
        timestamp: travel[0].timestamp
      }));
      if (mouseEvent) {
        this.menuPos = { x: mouseEvent.clientX, y: mouseEvent.clientY };
      }
      this.eventMenuTrigger.openMenu();
    }
  }

  handleMenuSelection(event: any) {
    this.selectEventById.emit(event.id);
  }

  protected readonly Object = Object;
}
