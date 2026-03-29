import {AsyncPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, effect, inject, input, output} from '@angular/core';
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
import {ArtifactTabComponent} from '../artifact-tab/artifact-tab.component';

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
    ArtifactTabComponent,
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
  readonly artifactDeltaArray = input<any[]>([]);

  readonly page = output<PageEvent>();
  readonly closeSelectedEvent = output<void>();
  readonly openImageDialog = output<string | null>();

  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  readonly i18n = inject(SidePanelMessagesInjectionToken);

  readonly isEventRequestResponseLoadingSignal = toSignal(
      this.uiStateService.isEventRequestResponseLoading(), {initialValue: false});

  selectedDetailTab: 'event' | 'request' | 'response' | 'state' | 'artifact' | 'graph' = 'event';

  constructor() {
    effect(() => {
      const event = this.selectedEvent();
      if (event) {
        let isTabValid = false;
        const currentTab = this.selectedDetailTab;
        if (currentTab === 'event') {
          isTabValid = true;
        } else if (currentTab === 'request') {
          isTabValid = this.isEventRequestResponseLoadingSignal() || !!(this.llmRequest() && Object.keys(this.llmRequest()!).length > 0);
        } else if (currentTab === 'response') {
          isTabValid = this.isEventRequestResponseLoadingSignal() || !!(this.llmResponse() && Object.keys(this.llmResponse()!).length > 0);
        } else if (currentTab === 'state') {
          isTabValid = !!(event?.actions?.stateDelta && Object.keys(event.actions.stateDelta).length > 0);
        } else if (currentTab === 'artifact') {
          isTabValid = !!(event?.actions?.artifactDelta && Object.keys(event.actions.artifactDelta).length > 0);
        } else if (currentTab === 'graph') {
          isTabValid = !!(event?.author !== 'user' && this.renderedEventGraph());
        }

        if (!isTabValid) {
          this.selectedDetailTab = 'event';
        }
      }
    });
  }

  protected readonly Object = Object;
}
