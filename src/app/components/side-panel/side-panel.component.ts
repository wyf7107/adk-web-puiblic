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

import {AsyncPipe, NgComponentOutlet} from '@angular/common';
import {AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, EnvironmentInjector, inject, input, output, runInInjectionContext, Type, viewChild, ViewContainerRef} from '@angular/core';
import {MatIconButton, MatMiniFabButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatTab, MatTabChangeEvent, MatTabGroup, MatTabLabel} from '@angular/material/tabs';
import {MatTooltip} from '@angular/material/tooltip';
import {type SafeHtml} from '@angular/platform-browser';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {Observable, of} from 'rxjs';
import {first} from 'rxjs/operators';

import {EvalCase} from '../../core/models/Eval';
import {Session, SessionState} from '../../core/models/Session';
import {SpanNode} from '../../core/models/Trace';
import {Blob, Event, LlmRequest, LlmResponse} from '../../core/models/types';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {LOGO_COMPONENT} from '../../injection_tokens';
import {ArtifactTabComponent, getMediaTypeFromMimetype} from '../artifact-tab/artifact-tab.component';
import {EVAL_TAB_COMPONENT, EvalTabComponent} from '../eval-tab/eval-tab.component';
import {StateTabComponent} from '../state-tab/state-tab.component';
import {TraceTabComponent} from '../trace-tab/trace-tab.component';

import {SidePanelMessagesInjectionToken} from './side-panel.component.i18n';

/**
 * Side panel component.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-side-panel',
  templateUrl: './side-panel.component.html',
  styleUrls: ['./side-panel.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    NgComponentOutlet,
    MatTooltip,
    MatTabGroup,
    MatTab,
    MatTabLabel,
    TraceTabComponent,
    StateTabComponent,
    ArtifactTabComponent,
    MatPaginator,
    MatMiniFabButton,
    MatIcon,
    MatIconButton,
    NgxJsonViewerModule,
    MatProgressSpinner,
  ],
})
export class SidePanelComponent implements AfterViewInit {
  protected readonly Object = Object;

  appName = input('');
  userId = input('');
  sessionId = input('');
  traceData = input<SpanNode[]>([]);
  eventData = input(new Map<string, Event>());
  currentSessionState = input<SessionState|undefined>();
  artifacts = input<Blob[]>([]);
  selectedEvent = input<Event|undefined>();
  selectedEventIndex = input<number|undefined>();
  renderedEventGraph = input<SafeHtml|undefined>();
  rawSvgString = input<string|null>(null);
  llmRequest = input<LlmRequest|undefined>();
  llmResponse = input<LlmResponse|undefined>();
  showSidePanel = input(false);
  isApplicationSelectorEnabledObs = input<Observable<boolean>>(of(false));
  readonly isBuilderMode = input<boolean>(false);
  readonly disableBuilderIcon = input<boolean>(false);

  readonly closePanel = output<void>();
  readonly tabChange = output<MatTabChangeEvent>();
  readonly sessionSelected = output<Session>();
  readonly sessionReloaded = output<Session>();
  readonly evalCaseSelected = output<EvalCase>();
  readonly evalSetIdSelected = output<string>();
  readonly returnToSession = output<boolean>();
  readonly evalNotInstalled = output<string>();
  readonly page = output<PageEvent>();
  readonly closeSelectedEvent = output<void>();
  readonly openImageDialog = output<string|null>();
  readonly openAddItemDialog = output<boolean>();
  readonly enterBuilderMode = output<boolean>();
  readonly showAgentStructureGraph = output<boolean>();

  readonly sessionTabComponent = undefined;
  readonly evalTabComponent = viewChild(EvalTabComponent);
  readonly evalTabContainer =
      viewChild('evalTabContainer', {read: ViewContainerRef});

  readonly logoComponent: Type<Component>|null = inject(LOGO_COMPONENT, {
    optional: true,
  });
  readonly i18n = inject(SidePanelMessagesInjectionToken);
  readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  readonly evalTabComponentClass = inject(EVAL_TAB_COMPONENT, {optional: true});
  private readonly environmentInjector = inject(EnvironmentInjector);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);

  // Feature flag references for use in template.
  readonly isAlwaysOnSidePanelEnabledObs =
      this.featureFlagService.isAlwaysOnSidePanelEnabled();
  readonly isTraceEnabledObs = this.featureFlagService.isTraceEnabled();
  readonly isArtifactsTabEnabledObs =
      this.featureFlagService.isArtifactsTabEnabled();
  readonly isEvalEnabledObs = this.featureFlagService.isEvalEnabled();
  readonly isTokenStreamingEnabledObs =
      this.featureFlagService.isTokenStreamingEnabled();
  readonly isMessageFileUploadEnabledObs =
      this.featureFlagService.isMessageFileUploadEnabled();
  readonly isManualStateUpdateEnabledObs =
      this.featureFlagService.isManualStateUpdateEnabled();
  readonly isBidiStreamingEnabledObs =
      this.featureFlagService.isBidiStreamingEnabled;

  readonly artifactDeltaArray = computed(() => {
    const artifactDelta = this.selectedEvent()?.actions?.artifactDelta;
    if (!artifactDelta || Object.keys(artifactDelta).length === 0) {
      return [];
    }

    const artifacts: Array<{
      id: string; versionId: number; data: string; mimeType: string;
      mediaType: string
    }> = [];
    for (const [id, artifactData] of Object.entries(artifactDelta)) {
      const data = artifactData as {
        data?: string;
        mimeType?: string
      };
      artifacts.push({
        id,
        versionId: 1,
        data: data.data || '',
        mimeType: data.mimeType || '',
        mediaType: getMediaTypeFromMimetype(data.mimeType || ''),
      });
    }
    return artifacts;
  });

  readonly filteredSelectedEvent = computed(() => {
    return this.selectedEvent() as Event | undefined;
  });

  ngAfterViewInit() {
    // Wait one tick until the eval tab container is ready.
    setTimeout(() => {
      this.initEvalTab();
    }, 500);
  }

  /**
   * Dynamically create the eval tab. We must do this programmatically until
   * ngComponentOutlet supports input/output bindings:
   * https://github.com/angular/angular/issues/63099
   */
  private initEvalTab() {
    this.isEvalEnabledObs.pipe(first()).subscribe((isEvalEnabled) => {
      if (isEvalEnabled) {
        const evalTabComponent = this.evalTabContainer()?.createComponent(
            this.evalTabComponentClass ?? EvalTabComponent, {
              environmentInjector: this.environmentInjector,
            });
        if (!evalTabComponent) return;

        runInInjectionContext(this.environmentInjector, () => {
          // Ensure inputs are updated dynamically using effect.
          effect(() => {
            evalTabComponent.setInput('appName', this.appName());
            evalTabComponent.setInput('userId', this.userId());
            evalTabComponent.setInput('sessionId', this.sessionId());
          });
        });
        evalTabComponent.instance.sessionSelected.subscribe(
            (session: Session) => {
              this.sessionSelected.emit(session);
            });
        evalTabComponent.instance.evalCaseSelected.subscribe(
            (evalCase: EvalCase) => {
              this.evalCaseSelected.emit(evalCase);
            });
        evalTabComponent.instance.evalSetIdSelected.subscribe(
            (evalSetId: string) => {
              this.evalSetIdSelected.emit(evalSetId);
            });
        evalTabComponent.instance.shouldReturnToSession.subscribe(
            (returnToSession: boolean) => {
              this.returnToSession.emit(returnToSession);
            });
        evalTabComponent.instance.evalNotInstalledMsg.subscribe(
            (message: string) => {
              this.evalNotInstalled.emit(message);
            });
      }
    });
  }
}
