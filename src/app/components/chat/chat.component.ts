/**
 * @license
 * Copyright 2026 Google LLC
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

import { AsyncPipe, DOCUMENT, NgClass, NgComponentOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, inject, Injectable, OnDestroy, OnInit, Renderer2, signal, Type, viewChild, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton, MatIconButton, MatFabButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatDrawer, MatDrawerContainer } from '@angular/material/sidenav';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { MatToolbar } from '@angular/material/toolbar';
import { SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { combineLatest, firstValueFrom, Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, first, map, shareReplay, startWith, switchMap, take, tap } from 'rxjs/operators';

import { URLUtil } from '../../../utils/url-util';
import { AgentRunRequest } from '../../core/models/AgentRunRequest';
import { EvalCase } from '../../core/models/Eval';
import { Session, SessionState } from '../../core/models/Session';
import { Event as AdkEvent, Part } from '../../core/models/types';
import { UiEvent } from '../../core/models/UiEvent';
import { AGENT_SERVICE } from '../../core/services/interfaces/agent';
import { AGENT_BUILDER_SERVICE } from '../../core/services/interfaces/agent-builder';
import { ARTIFACT_SERVICE } from '../../core/services/interfaces/artifact';
import { DOWNLOAD_SERVICE } from '../../core/services/interfaces/download';
import { EVAL_SERVICE } from '../../core/services/interfaces/eval';
import { EVENT_SERVICE } from '../../core/services/interfaces/event';
import { FEATURE_FLAG_SERVICE } from '../../core/services/interfaces/feature-flag';
import { GRAPH_SERVICE } from '../../core/services/interfaces/graph';
import { LOCAL_FILE_SERVICE } from '../../core/services/interfaces/localfile';
import { SAFE_VALUES_SERVICE } from '../../core/services/interfaces/safevalues';
import { SESSION_SERVICE } from '../../core/services/interfaces/session';
import { STREAM_CHAT_SERVICE } from '../../core/services/interfaces/stream-chat';
import { STRING_TO_COLOR_SERVICE } from '../../core/services/interfaces/string-to-color';
import { TRACE_SERVICE } from '../../core/services/interfaces/trace';
import { THEME_SERVICE } from '../../core/services/interfaces/theme';
import { LOGO_COMPONENT } from '../../injection_tokens';
import { ListResponse } from '../../core/services/interfaces/types';
import { UI_STATE_SERVICE } from '../../core/services/interfaces/ui-state';
import { LOCATION_SERVICE } from '../../core/services/location.service';
import { ResizableBottomDirective } from '../../directives/resizable-bottom.directive';
import { ResizableDrawerDirective } from '../../directives/resizable-drawer.directive';
import { AddItemDialogComponent } from '../add-item-dialog/add-item-dialog.component';
import { AgentStructureGraphDialogComponent } from '../agent-structure-graph-dialog/agent-structure-graph-dialog';
import { getMediaTypeFromMimetype, MediaType } from '../artifact-tab/artifact-tab.component';
import { BuilderTabsComponent } from '../builder-tabs/builder-tabs.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { ChatPanelComponent } from '../chat-panel/chat-panel.component';
import { EditJsonDialogComponent } from '../edit-json-dialog/edit-json-dialog.component';
import { EvalTabComponent } from '../eval-tab/eval-tab.component';
import { DeleteSessionDialogComponent, DeleteSessionDialogData, } from '../session-tab/delete-session-dialog/delete-session-dialog.component';
import { SessionTabComponent } from '../session-tab/session-tab.component';
import { SidePanelComponent } from '../side-panel/side-panel.component';
import { TraceEventComponent } from '../trace-tab/trace-event/trace-event.component';
import { ViewImageDialogComponent } from '../view-image-dialog/view-image-dialog.component';

import { ChatMessagesInjectionToken } from './chat.component.i18n';
import { SidePanelMessagesInjectionToken } from '../side-panel/side-panel.component.i18n';

const ROOT_AGENT = 'root_agent';
/** Query parameter for pre-filling user input. */
export const INITIAL_USER_INPUT_QUERY_PARAM = 'q';
/** Query parameter for hiding the side panel. */
export const HIDE_SIDE_PANEL_QUERY_PARAM = 'hideSidePanel';


/** A2A data part markers */
const A2A_DATA_PART_START_TAG = '<a2a_datapart_json>';
const A2A_DATA_PART_END_TAG = '</a2a_datapart_json>';
const A2UI_MIME_TYPE = 'application/json+a2ui';

function fixBase64String(base64: string): string {
  // Replace URL-safe characters if they exist
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/');

  // Fix base64 padding
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  return base64;
}

@Injectable()
class CustomPaginatorIntl extends MatPaginatorIntl {
  override nextPageLabel = 'Next Event';
  override previousPageLabel = 'Previous Event';
  override firstPageLabel = 'First Event';
  override lastPageLabel = 'Last Event';

  override getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0) {
      return `Event 0 of ${length}`;
    }

    length = Math.max(length, 0);
    const startIndex = page * pageSize;

    return `Event ${startIndex + 1} of ${length}`;
  };
}

const BIDI_STREAMING_RESTART_WARNING =
  'Restarting bidirectional streaming is not currently supported. Please refresh the page or start a new session.';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  providers: [
    { provide: MatPaginatorIntl, useClass: CustomPaginatorIntl },
  ],
  imports: [
    MatDrawerContainer,
    MatTooltip,
    MatDrawer,
    ResizableDrawerDirective,
    FormsModule,
    ReactiveFormsModule,
    MatIcon,
    NgxJsonViewerModule,
    MatButton,
    MatIconButton,
    MatMenuModule,
    MatCard,
    MatToolbar,
    NgComponentOutlet,
    ResizableBottomDirective,
    MatFormField,
    MatInput,
    MatProgressSpinner,
    TraceEventComponent,
    AsyncPipe,
    ChatPanelComponent,
    SidePanelComponent,
    CanvasComponent,
    BuilderTabsComponent,
    SessionTabComponent,
  ],
})
export class ChatComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly i18n = inject(ChatMessagesInjectionToken);
  protected readonly sidePanelI18n = inject(SidePanelMessagesInjectionToken);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly agentService = inject(AGENT_SERVICE);
  private readonly artifactService = inject(ARTIFACT_SERVICE);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);
  private readonly document = inject(DOCUMENT);
  private readonly downloadService = inject(DOWNLOAD_SERVICE);
  private readonly evalService = inject(EVAL_SERVICE);
  private readonly eventService = inject(EVENT_SERVICE);
  private readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  private readonly graphService = inject(GRAPH_SERVICE);
  private readonly localFileService = inject(LOCAL_FILE_SERVICE);
  private readonly location = inject(LOCATION_SERVICE);
  private readonly renderer = inject(Renderer2);
  private readonly router = inject(Router);
  private readonly safeValuesService = inject(SAFE_VALUES_SERVICE);
  private readonly sessionService = inject(SESSION_SERVICE);
  private readonly streamChatService = inject(STREAM_CHAT_SERVICE);
  private readonly stringToColorService = inject(STRING_TO_COLOR_SERVICE);
  private readonly traceService = inject(TRACE_SERVICE);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly agentBuilderService = inject(AGENT_BUILDER_SERVICE);
  protected readonly themeService = inject(THEME_SERVICE);
  protected readonly logoComponent: Type<Component>|null = inject(LOGO_COMPONENT, {
    optional: true,
  });

  chatPanel = viewChild.required(ChatPanelComponent);
  canvasComponent = viewChild.required(CanvasComponent);
  sideDrawer = viewChild.required<MatDrawer>('sideDrawer');
  sidePanel = viewChild.required(SidePanelComponent);
  drawerSessionTab = viewChild<SessionTabComponent>('drawerSessionTab');
  evalTab = viewChild(EvalTabComponent);
  bottomPanelRef = viewChild.required<ElementRef>('bottomPanel');
  enableSseIndicator = signal(false);
  isChatMode = signal(true);
  isEvalCaseEditing = signal(false);
  hasEvalCaseChanged = signal(false);
  isEvalEditMode = signal(false);
  isBuilderMode = signal(false);  // Default to builder mode off
  videoElement!: HTMLVideoElement;
  currentMessage = '';
  uiEvents = signal<UiEvent[]>([]);
  lastTextChunk: string = '';
  streamingTextMessage: UiEvent | null = null;
  latestThought: string = '';
  artifacts: any[] = [];
  userInput: string = '';
  userEditEvalCaseMessage: string = '';
  userId = 'user';
  userIdDraft = '';
  isEditingUserId = false;
  appName = '';
  isEditingSessionName = false;
  sessionNameDraft = '';
  sessionId = ``;
  sessionIdOfLoadedMessages = '';
  evalCase: EvalCase | null = null;
  updatedEvalCase: EvalCase | null = null;
  evalSetId = '';
  isAudioRecording = false;
  isVideoRecording = false;
  longRunningEvents: any[] = [];
  functionCallEventId = '';
  redirectUri = URLUtil.getBaseUrlWithoutPath();
  showSidePanel = window.localStorage.getItem('adk-side-panel-visible') !== 'false';
  showBuilderAssistant = true;
  showAppSelectorDrawer = false;
  showSessionSelectorDrawer = false;
  useSse = false;
  currentSessionState: SessionState | undefined = {};
  root_agent = ROOT_AGENT;
  updatedSessionState: WritableSignal<any> = signal(null);

  protected readonly canEditSession = signal(true);

  // TODO: Remove this once backend supports restarting bidi streaming.
  sessionHasUsedBidi = new Set<string>();

  eventData = new Map<string, any>();
  traceData: any[] = [];
  renderedEventGraph: SafeHtml | undefined;
  rawSvgString: string | null = null;
  agentGraphData: any = null;
  agentReadme: string = '';

  selectedEvent: any = undefined;
  selectedEventIndex: any = undefined;
  selectedMessageIndex: number | undefined = undefined;
  llmRequest: any = undefined;
  llmResponse: any = undefined;
  llmRequestKey = 'gcp.vertex.agent.llm_request';
  llmResponseKey = 'gcp.vertex.agent.llm_response';

  getMediaTypeFromMimetype = getMediaTypeFromMimetype;

  selectedFiles: { file: File; url: string }[] = [];

  protected MediaType = MediaType;

  // Sync query params with value from agent picker.
  protected readonly selectedAppControl = new FormControl<string>('', {
    nonNullable: true,
  });

  // App selector drawer
  protected readonly appDrawerSearchControl = new FormControl('', { nonNullable: true });

  protected openBase64InNewTab(data: string, mimeType: string) {
    this.safeValuesService.openBase64InNewTab(data, mimeType);
  }

  // Load apps
  protected isLoadingApps: WritableSignal<boolean> = signal(false);
  loadingError: WritableSignal<string> = signal('');
  protected readonly apps$: Observable<string[] | undefined> = of([]).pipe(
    tap(() => {
      this.isLoadingApps.set(true);
      this.selectedAppControl.disable();
    }),
    switchMap(
      () => this.agentService.listApps().pipe(
        catchError((err: HttpErrorResponse) => {
          this.loadingError.set(err.message);
          return of(undefined);
        }),
      ),
    ),
    take(1),
    tap((app) => {
      this.isLoadingApps.set(false);
      this.selectedAppControl.enable();
      if (app?.length == 1) {
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { app: app[0] },
          queryParamsHandling: 'merge',
        });
      }
    }),
    shareReplay(),
  );

  protected readonly filteredDrawerApps$: Observable<string[] | undefined> = this.apps$.pipe(
    switchMap(apps =>
      combineLatest([
        of(apps),
        this.appDrawerSearchControl.valueChanges.pipe(startWith('')),
      ])
    ),
    map(([apps, searchTerm]) => {
      if (!apps) return apps;
      if (!searchTerm || searchTerm.trim() === '') return apps;
      const lower = searchTerm.toLowerCase().trim();
      return apps.filter(app => app.toLowerCase().includes(lower));
    }),
  );

  // Feature flag references for use in template.
  readonly importSessionEnabledObs: Observable<boolean> =
    this.featureFlagService.isImportSessionEnabled();
  readonly isEditFunctionArgsEnabledObs: Observable<boolean> =
    this.featureFlagService.isEditFunctionArgsEnabled();
  readonly isSessionUrlEnabledObs: Observable<boolean> =
    this.featureFlagService.isSessionUrlEnabled();
  readonly isApplicationSelectorEnabledObs: Observable<boolean> =
    this.featureFlagService.isApplicationSelectorEnabled();
  readonly isTokenStreamingEnabledObs: Observable<boolean> =
    this.featureFlagService.isTokenStreamingEnabled();
  readonly isExportSessionEnabledObs: Observable<boolean> =
    this.featureFlagService.isExportSessionEnabled();
  readonly isEventFilteringEnabled =
    toSignal(this.featureFlagService.isEventFilteringEnabled());
  readonly isApplicationSelectorEnabled =
    toSignal(this.featureFlagService.isApplicationSelectorEnabled());
  readonly isDeleteSessionEnabledObs: Observable<boolean> =
    this.featureFlagService.isDeleteSessionEnabled();
  readonly isUserIdOnToolbarEnabledObs: Observable<boolean> =
    this.featureFlagService.isUserIdOnToolbarEnabled();
  readonly isDeveloperUiDisclaimerEnabledObs: Observable<boolean> =
    this.featureFlagService.isDeveloperUiDisclaimerEnabled();

  // Trace detail
  bottomPanelVisible = false;
  hoveredEventMessageIndices: number[] = [];

  // Builder
  disableBuilderSwitch = false;

  constructor() { }

  ngOnInit(): void {
    this.syncSelectedAppFromUrl();
    this.updateSelectedAppUrl();
    this.hideSidePanelIfNeeded();

    combineLatest([
      this.agentService.getApp(),
      this.activatedRoute.queryParams,
    ])
      .pipe(
        filter(
          ([app, params]) =>
            !!app && !!params[INITIAL_USER_INPUT_QUERY_PARAM],
        ),
        first(),
        map(([, params]) => params[INITIAL_USER_INPUT_QUERY_PARAM]))
      .subscribe((initialUserInput) => {
        // Use `setTimeout` to ensure the userInput is set after the current
        // change detection cycle is complete.
        setTimeout(() => {
          this.userInput = initialUserInput;
        });
      });

    this.streamChatService.onStreamClose().subscribe((closeReason) => {
      const error =
        'Please check server log for full details: \n' + closeReason;
      this.openSnackBar(error, 'OK');
    });

    // OAuth HACK: Opens oauth poup in a new window. If the oauth callback
    // is successful, the new window acquires the auth token, state and
    // optionally the scope. Send this back to the main window.
    const location = new URL(window.location.href);
    const searchParams = location.searchParams;
    if (searchParams.has('code')) {
      const authResponseUrl = window.location.href;
      // Send token to the main window
      window.opener?.postMessage({ authResponseUrl }, window.origin);
      // Close the popup
      window.close();
    }

    this.agentService.getApp().subscribe((app) => {
      this.appName = app;
    });



    this.traceService.selectedTraceRow$.subscribe(node => {
      const eventId = node?.attributes['gcp.vertex.agent.event_id'];

      if (eventId && this.eventData.has(eventId)) {
        this.bottomPanelVisible = true;
      } else {
        this.bottomPanelVisible = false;
      }
    });

    this.traceService.hoveredMessageIndices$.subscribe(
      i => this.hoveredEventMessageIndices = i);

    this.featureFlagService.isInfinityMessageScrollingEnabled()
      .pipe(first())
      .subscribe((enabled) => {
        if (enabled) {
          this.uiStateService.onNewMessagesLoaded().subscribe(
            (response: ListResponse<any> & { isBackground?: boolean }) => {
              this.populateMessages(
                response.items, true, !response.isBackground);
              this.loadTraceData();
            });

          this.uiStateService.onNewMessagesLoadingFailed().subscribe(
            (error: { message: string }) => {
              this.openSnackBar(error.message, 'OK');
            });
        }
      });
  }

  get sessionTab() {
    return this.drawerSessionTab();
  }

  ngAfterViewInit() {
    if (this.showSidePanel) {
      this.sideDrawer()?.open();
    }

    if (!this.isApplicationSelectorEnabled()) {
      this.loadSessionByUrlOrReset();
    }
  }

  selectApp(appName: string) {
    if (appName != this.appName) {
      const isInitialLoad = !this.appName;
      this.agentService.setApp(appName);

      if (isInitialLoad) {
        // On initial load, honour any session ID in the URL.
        this.loadSessionByUrlOrReset();
      } else {
        // When switching agents, start fresh — the URL session belongs
        // to the previous agent.
        this.createSessionAndReset();
      }
    }
  }

  private loadSessionByUrlOrReset() {
    this.isSessionUrlEnabledObs.subscribe((sessionUrlEnabled) => {
      const queryParams = this.activatedRoute.snapshot.queryParams;
      const sessionUrl = queryParams['session'];
      const userUrl = queryParams['userId'];

      if (userUrl) {
        this.userId = userUrl;
      }

      if (!sessionUrlEnabled || !sessionUrl) {
        this.createSessionAndReset();

        return;
      }

      if (sessionUrl) {
        this.sessionService.getSession(this.userId, this.appName, sessionUrl)
          .pipe(take(1), catchError((error) => {
            this.openSnackBar(
              'Cannot find specified session. Creating a new one.',
              'OK');
            this.createSessionAndReset();
            return of(null);
          }))
          .subscribe((session) => {
            if (session) {
              this.updateWithSelectedSession(session);
            }
          });
      }
    });
  }

  private hideSidePanelIfNeeded() {
    this.activatedRoute.queryParams
      .pipe(
        filter((params) => params[HIDE_SIDE_PANEL_QUERY_PARAM] === 'true'),
        take(1),
      )
      .subscribe(() => {
        this.showSidePanel = false;
        this.sideDrawer()?.close();
      });
  }

  private createSessionAndReset() {
    this.resetToNewSession();
    this.eventData = new Map<string, any>();
    this.uiEvents.set([]);
    this.artifacts = [];
    this.userInput = '';
    this.longRunningEvents = [];
    this.selectedEvent = undefined;
    this.selectedEventIndex = undefined;
    this.selectedMessageIndex = undefined;
  }

  private resetToNewSession() {
    this.sessionId = '';
    this.currentSessionState = {};
    this.sessionTab?.refreshSession();
    this.clearSessionUrl();
  }

  createSession() {
    this.uiStateService.setIsSessionListLoading(true);

    this.sessionService.createSession(this.userId, this.appName)
      .subscribe(
        (res) => {
          this.currentSessionState = res.state;
          this.sessionId = res.id ?? '';
          this.sessionTab?.refreshSession();
          this.sessionTab?.reloadSession(this.sessionId);

          this.isSessionUrlEnabledObs.subscribe((enabled) => {
            if (enabled) {
              this.updateSelectedSessionUrl();
            }
          });
        },
        () => {
          this.uiStateService.setIsSessionListLoading(false);
        });
  }

  async handleChatInput(event: Event) {
    event.preventDefault();
    if (!this.userInput.trim() && this.selectedFiles.length <= 0) return;

    if (event instanceof KeyboardEvent) {
      // support for japanese IME
      if (event.isComposing || event.keyCode === 229) {
        return;
      }
    }

    const content = {
      role: 'user',
      parts: await this.getUserMessageParts()
    };

    // Clear input
    this.userInput = '';
    this.selectedFiles = [];

    // Clear the query param for the initial user input once it is sent.
    const updatedUrl = this.router.parseUrl(this.location.path());
    if (updatedUrl.queryParams[INITIAL_USER_INPUT_QUERY_PARAM]) {
      delete updatedUrl.queryParams[INITIAL_USER_INPUT_QUERY_PARAM];
      this.location.replaceState(updatedUrl.toString());
    }

    await this.sendMessage(content);
  }

  async sendMessage(content: any) {
    // Lazily create a real session on first message send.
    if (!this.sessionId) {
      try {
        let displayName = '';
        if (content.parts && content.parts[0]?.text) {
           displayName = content.parts[0].text;
           if (displayName.length > 30) {
             displayName = displayName.substring(0, 27) + '...';
           }
        }
        const initialState = displayName ? { __adk_metadata__: { displayName: displayName } } : undefined;
        const res = await firstValueFrom(
          this.sessionService.createSession(this.userId, this.appName, initialState));
        this.currentSessionState = res.state;
        this.sessionId = res.id ?? '';
        this.sessionTab?.refreshSession();
        this.sessionTab?.reloadSession(this.sessionId);
        this.isSessionUrlEnabledObs.pipe(first()).subscribe((enabled) => {
          if (enabled) {
            this.updateSelectedSessionUrl();
          }
        });
      } catch {
        this.openSnackBar('Failed to create session', 'OK');
        return;
      }
    }

    const functionCallEventId = content.functionCallEventId;
    if (functionCallEventId) {
      delete content.functionCallEventId;
    }

    const userEventId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiEvent = {
        id: userEventId,
        author: content.role || 'user',
        content: content
    };

    const userUiEvent = this.buildUiEventFromEvent(apiEvent);
    this.uiEvents.update(uiEvents => [...uiEvents, userUiEvent]);
    setTimeout(() => this.changeDetectorRef.detectChanges(), 0);

    this.eventData.set(userEventId, apiEvent);
    this.eventData = new Map(this.eventData);

    const req: AgentRunRequest = {
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
      newMessage: content,
      streaming: this.useSse,
      stateDelta: this.updatedSessionState(),
    };
    if (functionCallEventId) {
      req.functionCallEventId = functionCallEventId;
    }

    this.submitAgentRunRequest(req);
    this.changeDetectorRef.detectChanges();
  }

  submitAgentRunRequest(req: AgentRunRequest) {
    this.streamingTextMessage = null;
    this.agentService.runSse(req).subscribe({
      next: async (chunkJson: any) => {
        if (chunkJson.error) {
          this.openSnackBar(chunkJson.error, 'OK');
          return;
        }
        if (chunkJson.content) {
          let parts = this.combineTextParts(chunkJson.content.parts);
          if (this.isEventA2aResponse(chunkJson)) {
            parts = this.combineA2uiDataParts(parts);
          }

          for (let part of parts) {
            this.processPart(chunkJson, part);
            this.traceService.setEventData(this.eventData);
          }
        } else if (chunkJson.errorMessage) {
          this.processErrorMessage(chunkJson);
        } else {
          // Store events without content (so they render like on reload)
          if (chunkJson.id && !this.eventData.has(chunkJson.id)) {
            this.eventData.set(chunkJson.id, chunkJson);
            this.eventData = new Map(this.eventData);

            // Create a message entry for the event
            const uiEvent = new UiEvent({
              role: chunkJson.author === 'user' ? 'user' : 'bot',
              event: chunkJson
            });
            this.insertOrUpdateMessage(uiEvent);
          }
        }
        if (chunkJson.actions) {
          this.processActionArtifact(chunkJson);
          this.processActionStateDelta(chunkJson);
        }
        this.changeDetectorRef.detectChanges();
      },
      error: (err) => {
        console.error('Send message error:', err);
        this.openSnackBar(err, 'OK');
      },
      complete: () => {
        if (this.updatedSessionState()) {
          this.currentSessionState = this.updatedSessionState();
          this.updatedSessionState.set(null);
        }
        this.streamingTextMessage = null;
        this.featureFlagService.isSessionReloadOnNewMessageEnabled()
          .pipe(first())
          .subscribe((enabled) => {
            if (enabled) {
              this.sessionTab?.reloadSession(this.sessionId);
            }
          });
        this.eventService.getTrace(this.sessionId)
          .pipe(first(), catchError((error) => {
            return of([]);
          }))
          .subscribe((res) => {
            this.traceData = res;
            this.changeDetectorRef.detectChanges();
          });
        this.traceService.setMessages(this.uiEvents());
        this.changeDetectorRef.detectChanges();
      },
    });
  }

  private processErrorMessage(chunkJson: any) {
    this.storeEvents(chunkJson, chunkJson);
    this.insertOrUpdateMessage(
      new UiEvent({ text: chunkJson.errorMessage, role: 'bot', event: { id: chunkJson.id } as any }))
  }

  private processPart(chunkJson: any, part: any) {
    const renderedContent =
      chunkJson.groundingMetadata?.searchEntryPoint?.renderedContent;

    if (part.text) {

      const newChunk = part.text;
      if (part.thought) {
        if (newChunk !== this.latestThought) {
          this.storeEvents(part, chunkJson);
          let thoughtUiEvent = new UiEvent({
            role: 'bot',
            text: this.processThoughtText(newChunk),
            thought: true,
            event: { id: chunkJson.id } as any
          });

          this.insertOrUpdateMessage(thoughtUiEvent);
        }
        this.latestThought = newChunk;
      } else if (!this.streamingTextMessage) {
        this.streamingTextMessage = new UiEvent({
          role: 'bot',
          text: this.processThoughtText(newChunk),
          thought: part.thought ? true : false,
          event: { id: chunkJson.id } as any
        });

        if (renderedContent) {
          this.streamingTextMessage.renderedContent =
            chunkJson.groundingMetadata.searchEntryPoint.renderedContent;
        }

        if (!this.useSse) {
          this.insertOrUpdateMessage(this.streamingTextMessage);
          this.storeEvents(part, chunkJson);
          this.streamingTextMessage = null;
          return;
        } else {
          this.insertOrUpdateMessage(this.streamingTextMessage);
        }
      } else {
        if (renderedContent) {
          this.streamingTextMessage.renderedContent =
            chunkJson.groundingMetadata.searchEntryPoint.renderedContent;
        }

        if (newChunk == this.streamingTextMessage.text) {
          // Final chunk arrived - update the existing message's eventId
          const oldEventId = this.streamingTextMessage.event.id;
          this.uiEvents.update((uiEvents) => {
            if (uiEvents.length > 0) {
              const lastIndex = uiEvents.length - 1;
              const lastMessage = uiEvents[lastIndex];
              if (lastMessage.event.id === oldEventId && lastMessage.role === 'bot') {
                const updatedMessages = [...uiEvents];
                updatedMessages[lastIndex] = new UiEvent({ ...lastMessage, event: { id: chunkJson.id } as any });
                return updatedMessages;
              }
            }
            return uiEvents;
          });
          this.storeEvents(part, chunkJson);
          this.streamingTextMessage = null;
          return;
        }
        // Update the streaming text and insert to trigger UI update
        this.streamingTextMessage.text += newChunk;
        this.insertOrUpdateMessage(this.streamingTextMessage);
      }
    } else if (!part.thought) {
      // Skip partial events for non-text parts to avoid duplicates
      if (this.useSse && chunkJson.partial) {
        return;
      }

      // If the part is an A2A DataPart, display it as a message (e.g., A2UI or
      // Json)
      if (this.isA2aDataPart(part)) {
        const parsedObject = this.extractA2aDataPartJson(part);
        const isA2uiDataPart = parsedObject && parsedObject.kind === 'data' &&
          parsedObject.metadata?.mimeType === A2UI_MIME_TYPE;
        const displayPart =
          isA2uiDataPart ? { a2ui: parsedObject.data } : { text: parsedObject };

        this.storeEvents(part, chunkJson);
        this.storeMessage(
          displayPart, chunkJson,
          chunkJson.author === 'user' ? 'user' : 'bot');
        return;
      }


      this.storeEvents(part, chunkJson);

      // If we have a streamingTextMessage, append inlineData to it
      if (this.streamingTextMessage && part.inlineData) {
        this.processPartIntoMessage(part, chunkJson, this.streamingTextMessage);
        this.insertOrUpdateMessage(this.streamingTextMessage);
        this.changeDetectorRef.detectChanges();
        return;
      }

      const role = chunkJson.author === 'user' ? 'user' : 'bot';
      const existingMessages = this.uiEvents();
      const lastMessageIndex = existingMessages.length - 1;
      const lastMessage = existingMessages.length > 0 ? existingMessages[lastMessageIndex] : undefined;

      if (lastMessage && lastMessage.event.id === chunkJson.id && lastMessage.role === role) {
        // Update existing message by adding this part
        this.uiEvents.update(uiEvents => {
          const updatedMessages = [...uiEvents];
          const updatedMessage = new UiEvent({ ...lastMessage });
          this.processPartIntoMessage(part, chunkJson, updatedMessage);
          updatedMessages[lastMessageIndex] = updatedMessage;
          return updatedMessages;
        });
        this.changeDetectorRef.detectChanges();
      } else {
        this.storeMessage(part, chunkJson, role);
      }
    }
  }

  async getUserMessageParts() {
    let parts: any = [];

    if (!!this.userInput.trim()) {
      parts.push({ text: `${this.userInput}` });
    }

    if (this.selectedFiles.length > 0) {
      for (const file of this.selectedFiles) {
        parts.push(
          await this.localFileService.createMessagePartFromFile(file.file));
      }
    }
    return parts;
  }

  private processActionArtifact(e: AdkEvent) {
    if (e.actions && e.actions.artifactDelta &&
      Object.keys(e.actions.artifactDelta).length > 0) {
      this.storeEvents(null, e);
      this.storeMessage(null, e, 'bot');
    }
  }

  private processActionStateDelta(e: AdkEvent) {
    if (e.actions && e.actions.stateDelta &&
      Object.keys(e.actions.stateDelta).length > 0) {
      this.currentSessionState = e.actions.stateDelta;
    }
  }

  /**
   * Collapse consecutive text parts into a single part. Preserves relative
   * order of other parts.
   */
  private combineTextParts(parts: Part[]) {
    const result: Part[] = [];
    let combinedTextPart: Part | undefined;

    for (const part of parts) {
      if (part.text && !part.thought) {
        if (!combinedTextPart) {
          combinedTextPart = { text: part.text };
          result.push(combinedTextPart);
        } else {
          combinedTextPart.text += part.text;
        }
      } else {
        combinedTextPart = undefined;
        result.push(part);
      }
    }

    return result;
  }

  // Returns true if the event is an A2A response.
  private isEventA2aResponse(event: any) {
    return !!event?.customMetadata?.['a2a:response'];
  }

  private isA2aDataPart(part: Part) {
    if (!part.inlineData || part.inlineData.mimeType !== 'text/plain') {
      return false;
    }

    const dataPartText = atob(fixBase64String(part.inlineData.data));
    return dataPartText.startsWith(A2A_DATA_PART_START_TAG) &&
      dataPartText.endsWith(A2A_DATA_PART_END_TAG);
  }

  private isA2uiDataPart(part: Part) {
    const parsedObject = this.extractA2aDataPartJson(part);
    return parsedObject && parsedObject.kind === 'data' &&
      parsedObject.metadata?.mimeType === A2UI_MIME_TYPE;
  }

  private extractA2aDataPartJson(part: Part) {
    if (!this.isA2aDataPart(part)) {
      return null;
    }

    const dataPartText = atob(fixBase64String(part.inlineData!.data));
    const jsonContent = dataPartText.substring(
      A2A_DATA_PART_START_TAG.length,
      dataPartText.length - A2A_DATA_PART_END_TAG.length);
    let parsedObject: any;
    try {
      parsedObject = JSON.parse(jsonContent);
    } catch (e) {
      return null;
    }
    return parsedObject;
  }

  // Combine A2UI data parts into a single part so that A2UI message that
  // consists of 3 A2A DataParts can be displayed as a single message bubble.
  private combineA2uiDataParts(parts: Part[]): Part[] {
    const result: Part[] = [];
    const combinedA2uiJson: any[] = [];
    let combinedDataPart: Part | undefined;

    for (const part of parts) {
      if (this.isA2uiDataPart(part)) {
        combinedA2uiJson.push(this.extractA2aDataPartJson(part));
        // Insert the combined data part into the result array here so that the
        // order of the a2ui components is preserved.
        if (!combinedDataPart) {
          combinedDataPart = {
            inlineData: { mimeType: 'text/plain', data: part.inlineData!.data }
          };
          result.push(combinedDataPart);
        }
      } else {
        result.push(part);
      }
    }

    // If there are any A2UI data parts, reconstruct the combined data part into
    // a valid A2A DataPart.
    if (combinedDataPart?.inlineData) {
      const a2aDataPartJson = {
        kind: 'data',
        metadata: {
          mimeType: A2UI_MIME_TYPE,
        },
        data: combinedA2uiJson,
      };
      const inlineData = A2A_DATA_PART_START_TAG +
        JSON.stringify(a2aDataPartJson) + A2A_DATA_PART_END_TAG;
      combinedDataPart.inlineData.data = btoa(inlineData);
    }

    return result;
  }

  private processA2uiPartIntoMessage(part: any): any {
    const a2uiData: any = {};
    part.a2ui.forEach((dataPart: any) => {
      if (dataPart.data.beginRendering) {
        a2uiData.beginRendering = dataPart.data;
      } else if (dataPart.data.surfaceUpdate) {
        a2uiData.surfaceUpdate = dataPart.data;
      } else if (dataPart.data.dataModelUpdate) {
        a2uiData.dataModelUpdate = dataPart.data;
      }
    });
    return a2uiData;
  }

  private updateRedirectUri(urlString: string, newRedirectUri: string): string {
    try {
      const url = new URL(urlString);
      const searchParams = url.searchParams;
      searchParams.set('redirect_uri', newRedirectUri);
      return url.toString();
    } catch (error) {
      console.warn('Failed to update redirect URI: ', error);
      return urlString;
    }
  }

  private storeMessage(
    part: any, e: any, role: string, invocationIndex?: number,
    additionalIndices?: any, prepend: boolean = false) {
    if (e?.longRunningToolIds && e.longRunningToolIds.length > 0) {
      const startIndex = this.longRunningEvents.length;
      this.getAsyncFunctionsFromParts(
        e.longRunningToolIds, e.content.parts, e.invocationId);

      // Store event ID for later reference
      this.functionCallEventId = e.id;

      // Check all newly added events for OAuth requirements
      for (let i = startIndex; i < this.longRunningEvents.length; i++) {
        const func = this.longRunningEvents[i].function;
        if (func.args.authConfig &&
          func.args.authConfig.exchangedAuthCredential &&
          func.args.authConfig.exchangedAuthCredential.oauth2) {
          // for OAuth
          const authUri =
            func.args.authConfig.exchangedAuthCredential.oauth2.authUri;
          const updatedAuthUri = this.updateRedirectUri(
            authUri,
            this.redirectUri,
          );
          this.openOAuthPopup(updatedAuthUri)
            .then((authResponseUrl) => {
              this.sendOAuthResponse(func, authResponseUrl, this.redirectUri);
            })
            .catch((error) => {
              console.error('OAuth Error:', error);
            });
          break;  // Handle one OAuth at a time
        }
      }
    }
    if (e?.actions && e.actions.artifactDelta) {
      for (const key in e.actions.artifactDelta) {
        if (e.actions.artifactDelta.hasOwnProperty(key)) {
          this.renderArtifact(key, e.actions.artifactDelta[key], prepend);
        }
      }
    }

    if (e?.evalStatus) {
      this.isChatMode.set(false);
    }

    let message: any = {
      role,
      evalStatus: e?.evalStatus,
      failedMetric: e?.failedMetric,
      evalScore: e?.evalScore,
      evalThreshold: e?.evalThreshold,
      actualInvocationToolUses: e?.actualInvocationToolUses,
      expectedInvocationToolUses: e?.expectedInvocationToolUses,
      actualFinalResponse: e?.actualFinalResponse,
      expectedFinalResponse: e?.expectedFinalResponse,
      invocationIndex: invocationIndex !== undefined ? invocationIndex :
        undefined,
      finalResponsePartIndex:
        additionalIndices?.finalResponsePartIndex !== undefined ?
          additionalIndices.finalResponsePartIndex :
          undefined,
      toolUseIndex: additionalIndices?.toolUseIndex !== undefined ?
        additionalIndices.toolUseIndex :
        undefined,
    };

    // Process the part and add its content to the message
    if (part) {
      if (part.inlineData) {
        const base64Data = this.formatBase64Data(
          part.inlineData.data, part.inlineData.mimeType);
        message.inlineData = {
          displayName: part.inlineData.displayName,
          data: base64Data,
          mimeType: part.inlineData.mimeType,
        };
      } else if (part.a2ui) {
        message.a2uiData = this.processA2uiPartIntoMessage(part);
      } else if (part.text) {
        message.text = part.text;
        message.thought = part.thought ? true : false;
        if (e?.groundingMetadata && e.groundingMetadata.searchEntryPoint &&
          e.groundingMetadata.searchEntryPoint.renderedContent) {
          message.renderedContent =
            e.groundingMetadata.searchEntryPoint.renderedContent;
        }
        message.event = e as any;
      } else if (part.functionCall) {
        // Enrich function call with long-running metadata if applicable
        const isLongRunning =
          e?.longRunningToolIds?.includes(part.functionCall.id);
        const enrichedFunctionCall = {
          ...part.functionCall,
          ...(isLongRunning && {
            isLongRunning: true,
            invocationId: e.invocationId,
            functionCallEventId: e.id,
            needsResponse: true,
            responseStatus: 'pending',
            userResponse: '',
          }),
        };
        message.functionCalls = [enrichedFunctionCall];
        message.event = e as any;
      } else if (part.functionResponse) {
        message.functionResponses = [part.functionResponse];
        message.event = e as any;
      } else if (part.executableCode) {
        message.executableCode = part.executableCode;
      } else if (part.codeExecutionResult) {
        message.codeExecutionResult = part.codeExecutionResult;
        if (e.actions && e.actions.artifact_delta) {
          for (const key in e.actions.artifact_delta) {
            if (e.actions.artifact_delta.hasOwnProperty(key)) {
              this.renderArtifact(key, e.actions.artifact_delta[key], prepend);
            }
          }
        }
      }
    }

    if (part && Object.keys(part).length > 0) {
      if (prepend) {
        this.uiEvents.update((uiEvents) => [message, ...uiEvents]);
      } else {
        this.insertOrUpdateMessage(message);
      }
    }
  }

  private insertOrUpdateMessage(message: any) {
    this.uiEvents.update((uiEvents) => {
      // If SSE streaming is enabled and this is a text message with eventId
      if (this.useSse && message.text && message.event.id &&
        message.role === 'bot') {
        if (uiEvents.length > 0) {
          const lastIndex = uiEvents.length - 1;
          const lastMessage = uiEvents[lastIndex];
          if (lastMessage.event.id === message.event.id && lastMessage.role === 'bot') {
            const updatedMessages = [...uiEvents];
            // Replace with the new message to preserve all fields (including inlineData)
            updatedMessages[lastIndex] = message;
            return updatedMessages;
          }
        }
      }

      // Default behavior: insert new message
      return [...uiEvents, message];
    });
  }

  private formatBase64Data(data: string, mimeType: string) {
    const fixedBase64Data = fixBase64String(data);
    return `data:${mimeType};base64,${fixedBase64Data}`;
  }

  private processPartIntoMessage(part: any, event: any, uiEvent: UiEvent) {
    if (!part) return;

    if (event) {
      uiEvent.event = event;
    }

    if (part.text) {
      uiEvent.text = part.text;
      uiEvent.thought = part.thought ? true : false;
      if (event?.groundingMetadata && event.groundingMetadata.searchEntryPoint &&
        event.groundingMetadata.searchEntryPoint.renderedContent) {
        uiEvent.renderedContent =
          event.groundingMetadata.searchEntryPoint.renderedContent;
      }
      if (event?.id) {
        uiEvent.event = event as any;
      }
    } else if (part.inlineData) {
      const base64Data = this.formatBase64Data(
        part.inlineData.data, part.inlineData.mimeType);
      const mediaType = getMediaTypeFromMimetype(part.inlineData.mimeType);
      uiEvent.inlineData = {
        displayName: part.inlineData.displayName,
        data: base64Data,
        mimeType: part.inlineData.mimeType,
        mediaType,
      };
      if (uiEvent.role === 'user' && event?.id) {
        uiEvent.event = event as any;
      }
    } else if (part.functionCall) {
      if (!uiEvent.functionCalls) {
        uiEvent.functionCalls = [];
      }
      uiEvent.functionCalls.push(part.functionCall);
      if (event?.id) {
        uiEvent.event = event as any;
      }
    } else if (part.functionResponse) {
      if (!uiEvent.functionResponses) {
        uiEvent.functionResponses = [];
      }
      uiEvent.functionResponses.push(part.functionResponse);
      if (event?.id) {
        uiEvent.event = event as any;
      }
    } else if (part.executableCode) {
      uiEvent.executableCode = part.executableCode;
    } else if (part.codeExecutionResult) {
      uiEvent.codeExecutionResult = part.codeExecutionResult;
    } else if (part.a2ui) {
      uiEvent.a2uiData = this.processA2uiPartIntoMessage(part);
    }
  }

  private handleArtifactFetchFailure(
    uiEvent: any, artifactId: string, versionId: string) {
    this.openSnackBar(
      'Failed to fetch artifact data',
      'OK',
    );
    // Remove placeholder message and artifact on failure
    uiEvent.error = { errorMessage: 'Failed to fetch artifact data' };
    this.changeDetectorRef.detectChanges();
    this.artifacts = this.artifacts.filter(
      a => a.id !== artifactId || a.versionId !== versionId);
  }

  private renderArtifact(
    artifactId: string, versionId: string, prepend: boolean = false) {
    // If artifact/version already exists, do nothing.
    const artifactExists = this.artifacts.some(
      (artifact) =>
        artifact.id === artifactId && artifact.versionId === versionId,
    );
    if (artifactExists) {
      return;
    }

    // Add a placeholder message for the artifact
    // Feed the placeholder with the artifact data after it's fetched
    let uiEvent = new UiEvent({
      role: 'bot',
      event: { id: 'artifact-' + artifactId } as any,
      inlineData: {
        data: '',
        mimeType: 'image/png',
      },
    });
    if (prepend) {
      this.uiEvents.update((uiEvents) => [uiEvent, ...uiEvents]);
    } else {
      this.insertOrUpdateMessage(uiEvent);
    }

    // Add placeholder artifact.
    const placeholderArtifact = {
      id: artifactId,
      versionId,
      data: '',
      mimeType: 'image/png',
      mediaType: MediaType.IMAGE,
    };
    this.artifacts = [...this.artifacts, placeholderArtifact];

    this.artifactService
      .getArtifactVersion(
        this.userId,
        this.appName,
        this.sessionId,
        artifactId,
        versionId,
      )
      .subscribe({
        next: (res) => {
          const { mimeType, data } = res.inlineData ?? {};
          if (!mimeType || !data) {
            this.handleArtifactFetchFailure(uiEvent, artifactId, versionId);
            return;
          }
          const base64Data = this.formatBase64Data(data, mimeType);

          const mediaType = getMediaTypeFromMimetype(mimeType);

          const inlineData = {
            name: this.createDefaultArtifactName(mimeType),
            data: base64Data,
            mimeType: mimeType,
            mediaType,
          };

          uiEvent.inlineData = inlineData;
          this.changeDetectorRef.detectChanges();

          // Update placeholder artifact with fetched data.
          this.artifacts = this.artifacts.map(artifact => {
            if (artifact.id === artifactId &&
              artifact.versionId === versionId) {
              return {
                id: artifactId,
                versionId,
                data: base64Data,
                mimeType,
                mediaType,
              };
            }
            return artifact;
          });
        },
        error: (err) => {
          this.handleArtifactFetchFailure(uiEvent, artifactId, versionId);
        }
      });
  }

  private storeEvents(part: any, e: any) {
    let title = '';
    if (part == null && e.actions.artifactDelta) {
      title += 'eventAction: artifact';
    } else if (part) {
      if (part.text) {
        title += 'text:' + part.text;
      } else if (part.functionCall) {
        title += 'functionCall:' + part.functionCall.name;
      } else if (part.functionResponse) {
        title += 'functionResponse:' + part.functionResponse.name;
      } else if (part.executableCode) {
        title += 'executableCode:' + part.executableCode.code.slice(0, 10);
      } else if (part.codeExecutionResult) {
        title += 'codeExecutionResult:' + part.codeExecutionResult.outcome;
      } else if (part.errorMessage) {
        title += 'errorMessage:' + part.errorMessage
      }
    }

    e.title = title;

    this.eventData.set(e.id, e);
    this.eventData = new Map(this.eventData);
  }

  private sendOAuthResponse(
    func: any,
    authResponseUrl: string,
    redirectUri: string,
  ) {
    this.longRunningEvents.pop();

    var authConfig = structuredClone(func.args.authConfig);
    authConfig.exchangedAuthCredential.oauth2.authResponseUri = authResponseUrl;
    authConfig.exchangedAuthCredential.oauth2.redirectUri = redirectUri;

    const content = {
      role: 'user',
      parts: [
        {
          functionResponse: {
            id: func.id,
            name: func.name,
            response: authConfig,
          },
        }
      ],
      functionCallEventId: this.functionCallEventId
    };

    this.sendMessage(content);
  }

  clickEvent(i: number) {
    const message = this.uiEvents()[i];
    const key = message.event.id;

    if (!key) {
      return;
    }

    // If clicking the already selected event, deselect it
    if (this.selectedMessageIndex === i) {
      this.selectedEvent = undefined;
      this.selectedEventIndex = undefined;
      this.selectedMessageIndex = undefined;
      return;
    }

    // For user messages, clear LLM request/response since they don't have those
    if (message.role === 'user') {
      this.selectedEvent = this.eventData.get(key);
      this.selectedEventIndex = this.getIndexOfKeyInMap(key);
      this.selectedMessageIndex = i;
      this.llmRequest = undefined;
      this.llmResponse = undefined;
      this.sideDrawer()?.open();
      this.showSidePanel = true;
      window.localStorage.setItem('adk-side-panel-visible', 'true');
      return;
    }

    this.sideDrawer()?.open();
    this.showSidePanel = true;
    window.localStorage.setItem('adk-side-panel-visible', 'true');
    this.selectEvent(key, i);
  }

  ngOnDestroy(): void {
    this.streamChatService.closeStream();
  }

  onAppSelection(event: any) {
    if (this.isAudioRecording) {
      this.stopAudioRecording();
      this.isAudioRecording = false;
    }
    if (this.isVideoRecording) {
      this.stopVideoRecording();
      this.isVideoRecording = false;
    }
    this.evalTab()?.resetEvalResults();
    this.traceData = [];
    this.bottomPanelVisible = false;
  }

  toggleAudioRecording() {
    this.isAudioRecording ? this.stopAudioRecording() :
      this.startAudioRecording();
  }

  startAudioRecording() {
    if (this.sessionHasUsedBidi.has(this.sessionId)) {
      this.openSnackBar(BIDI_STREAMING_RESTART_WARNING, 'OK');
      return;
    }

    this.isAudioRecording = true;
    this.streamChatService.startAudioChat({
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
    });
    this.uiEvents.update(
      uiEvents =>
        [...uiEvents,
        new UiEvent({ role: 'user', text: 'Speaking...', event: { id: 'speaking-user' } as any }),
        new UiEvent({ role: 'bot', text: 'Speaking...', event: { id: 'speaking-bot' } as any }),
        ]);
    this.sessionHasUsedBidi.add(this.sessionId);
  }

  stopAudioRecording() {
    this.streamChatService.stopAudioChat();
    this.isAudioRecording = false;
  }

  toggleVideoRecording() {
    this.isVideoRecording ? this.stopVideoRecording() :
      this.startVideoRecording();
  }

  startVideoRecording() {
    if (this.sessionHasUsedBidi.has(this.sessionId)) {
      this.openSnackBar(BIDI_STREAMING_RESTART_WARNING, 'OK');
      return;
    }
    const videoContainer = this.chatPanel()?.videoContainer;
    if (!videoContainer) {
      return;
    }
    this.isVideoRecording = true;
    this.streamChatService.startVideoChat({
      appName: this.appName,
      userId: this.userId,
      sessionId: this.sessionId,
      videoContainer,
    });
    this.uiEvents.update(
      uiEvents => [...uiEvents, new UiEvent({ role: 'user', text: 'Speaking...', event: { id: 'speaking-user' } as any })]);
    this.sessionHasUsedBidi.add(this.sessionId);
  }

  stopVideoRecording() {
    const videoContainer = this.chatPanel()?.videoContainer;
    if (!videoContainer) {
      return;
    }
    this.streamChatService.stopVideoChat(videoContainer);
    this.isVideoRecording = false;
  }

  private getAsyncFunctionsFromParts(
    pendingIds: any[], parts: any[], invocationId: string) {
    for (const part of parts) {
      if (part.functionCall && pendingIds.includes(part.functionCall.id)) {
        this.longRunningEvents.push(
          { function: part.functionCall, invocationId: invocationId });
      }
    }
  }

  private openOAuthPopup(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Open OAuth popup
      const popup = this.safeValuesService.windowOpen(
        window, url, 'oauthPopup', 'width=600,height=700');

      if (!popup) {
        reject('Popup blocked!');
        return;
      }

      // Listen for messages from the popup
      const listener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;  // Ignore messages from unknown sources
        }
        const { authResponseUrl } = event.data;
        if (authResponseUrl) {
          resolve(authResponseUrl);
          window.removeEventListener('message', listener);
        } else {
          console.log('OAuth failed', event);
        }
      };

      window.addEventListener('message', listener);
    });
  }

  toggleSidePanel() {
    if (this.showSidePanel) {
      this.sideDrawer()?.close();
      // Clear selected event when closing the drawer
      this.selectedEvent = undefined;
      this.selectedEventIndex = undefined;
      this.selectedMessageIndex = undefined;
    } else {
      this.sideDrawer()?.open();
    }
    this.showSidePanel = !this.showSidePanel;
    window.localStorage.setItem('adk-side-panel-visible', this.showSidePanel.toString());
  }

  toggleAppSelectorDrawer() {
    this.showSessionSelectorDrawer = false;
    this.showAppSelectorDrawer = !this.showAppSelectorDrawer;
    if (this.showAppSelectorDrawer) {
      this.appDrawerSearchControl.setValue('');
    }
  }

  onAppSelectorDrawerClosed() {
    this.showAppSelectorDrawer = false;
  }

  toggleSessionSelectorDrawer() {
    this.showAppSelectorDrawer = false;
    this.showSessionSelectorDrawer = !this.showSessionSelectorDrawer;
  }

  onSessionSelectorDrawerClosed() {
    this.showSessionSelectorDrawer = false;
  }

  onSelectorDrawerClosed() {
    this.showAppSelectorDrawer = false;
    this.showSessionSelectorDrawer = false;
  }

  onSessionSelectedFromDrawer(session: Session) {
    this.showSessionSelectorDrawer = false;
    this.updateWithSelectedSession(session);
  }

  selectAppFromDrawer(app: string) {
    this.selectedAppControl.setValue(app);
    this.showAppSelectorDrawer = false;
  }

  protected handleTabChange(event: any) {
    if (!this.isChatMode()) {
      this.resetEditEvalCaseVars();
      this.handleReturnToSession(true);
    }
  }

  protected handleReturnToSession(event: boolean) {
    this.sessionTab?.getSession(this.sessionId);
    this.evalTab()?.resetEvalCase();
    this.isChatMode.set(true);
  }

  protected handleEvalNotInstalled(errorMsg: string) {
    if (errorMsg) {
      this.openSnackBar(errorMsg, 'OK');
    }
  }

  private resetEventsAndMessages({ keepMessages }: {
    keepMessages?:
    boolean
  } = {}) {
    if (!keepMessages) {
      this.eventData.clear();
      this.uiEvents.set([]);
    }
    this.artifacts = [];
  }

  private loadTraceData() {
    this.eventService.getTrace(this.sessionId)
      .pipe(first(), catchError(() => of([])))
      .subscribe(res => {
        this.traceData = res;
        this.traceService.setEventData(this.eventData);
        this.traceService.setMessages(this.uiEvents());
      });
    this.bottomPanelVisible = false;
    this.changeDetectorRef.detectChanges();
  }

  private buildUiEventFromEvent(event: any, reverseOrder: boolean = false): UiEvent {
    const isA2aResponse = this.isEventA2aResponse(event);
    const parts = isA2aResponse ?
      this.combineA2uiDataParts(event.content?.parts) :
      event.content?.parts || [];
    const partsToProcess = reverseOrder ? [...parts].reverse() : parts;

    const role = event.author === 'user' ? 'user' : 'bot';
    const uiEvent = new UiEvent({
      role,
      event
    });

    if (event.errorCode || event.errorMessage) {
      uiEvent.error = {
        errorCode: event.errorCode,
        errorMessage: event.errorMessage
      };
    }

    partsToProcess.forEach((part: any) => {
      if (role === 'bot' && isA2aResponse && this.isA2uiDataPart(part)) {
        part = { a2ui: this.extractA2aDataPartJson(part).data };
      }
      this.processPartIntoMessage(part, event, uiEvent);
    });

    return uiEvent;
  }


  private populateMessages(
    events: any[], reverseOrder: boolean = false,
    keepOldMessages: boolean = false) {
    this.resetEventsAndMessages({
      keepMessages:
        keepOldMessages && this.sessionIdOfLoadedMessages === this.sessionId
    });

    const newUiEvents: UiEvent[] = [];
    events.forEach((event: any) => {
      const uiEvent = this.buildUiEventFromEvent(event, reverseOrder);

      if (reverseOrder) {
        newUiEvents.unshift(uiEvent);
      } else {
        newUiEvents.push(uiEvent);
      }

      const isBot = event.author !== 'user';
      if (isBot && event.actions?.artifactDelta) {
        for (const key in event.actions.artifactDelta) {
          if (event.actions.artifactDelta.hasOwnProperty(key)) {
            this.renderArtifact(
              key, event.actions.artifactDelta[key], reverseOrder);
          }
        }
      }

      // Store the event in eventData
      if (!this.eventData.has(event.id)) {
        this.eventData.set(event.id, event);
        this.eventData = new Map(this.eventData);
      }

    });

    if (newUiEvents.length > 0) {
      this.uiEvents.update(uiEvents => reverseOrder ? [...newUiEvents, ...uiEvents] : [...uiEvents, ...newUiEvents]);
    }

    this.sessionIdOfLoadedMessages = this.sessionId;
  }

  private restorePendingLongRunningCalls() {
    const messages = this.uiEvents();
    const functionResponses = new Set<string>();

    // Collect all function response IDs
    this.uiEvents().forEach(msg => {
      if (msg.functionResponses) {
        msg.functionResponses.forEach((fr: any) => {
          if (fr.id) {
            functionResponses.add(fr.id);
          }
        });
      }
    });

    // Check each function call to see if it has a response
    this.uiEvents().forEach(msg => {
      if (msg.functionCalls) {
        msg.functionCalls.forEach((fc: any) => {
          // Get the event for this message to check longRunningToolIds
          const event = msg.event.id ? this.eventData.get(msg.event.id) : null;
          const isLongRunning = fc.isLongRunning ||
            event?.longRunningToolIds?.includes(fc.id);

          // Only restore if it's long-running AND doesn't have a response yet
          if (isLongRunning && !functionResponses.has(fc.id)) {
            fc.isLongRunning = true;
            fc.invocationId = event?.invocationId;
            fc.functionCallEventId = msg.event.id || "";
            fc.needsResponse = true;
            fc.responseStatus = 'pending';
            fc.userResponse = fc.userResponse || '';
          }
        });
      }
    });
  }

  protected updateWithSelectedSession(session: Session) {
    if (!session || !session.id || !session.events || !session.state) {
      return;
    }
    this.traceService.resetTraceService();
    this.sessionId = session.id;
    this.currentSessionState = session.state;
    this.evalCase = null;
    this.isChatMode.set(true);

    this.isSessionUrlEnabledObs.subscribe((enabled) => {
      if (enabled) {
        this.updateSelectedSessionUrl();
      }
    });

    this.resetEventsAndMessages();

    session.events.forEach((event: any) => {
      const uiEvent = this.buildUiEventFromEvent(event, false);
      this.uiEvents.update((uiEvents) => [...uiEvents, uiEvent]);

      const isBot = event.author !== 'user';
      if (isBot && event.actions?.artifactDelta) {
        for (const key in event.actions.artifactDelta) {
          if (event.actions.artifactDelta.hasOwnProperty(key)) {
            this.renderArtifact(key, event.actions.artifactDelta[key]);
          }
        }
      }

      // Store the event in eventData
      if (!this.eventData.has(event.id)) {
        this.eventData.set(event.id, event);
        this.eventData = new Map(this.eventData);
      }
    });

    this.restorePendingLongRunningCalls();
    this.changeDetectorRef.detectChanges();

    this.eventService.getTrace(this.sessionId)
      .pipe(first(), catchError(() => of([])))
      .subscribe(res => {
        this.traceData = res;
        this.traceService.setEventData(this.eventData);
        this.traceService.setMessages(this.uiEvents());
      });

    this.sessionService.canEdit(this.userId, session)
      .pipe(first(), catchError(() => of(true)))
      .subscribe((canEdit) => {
        this.chatPanel()?.canEditSession.set(canEdit);
        this.canEditSession.set(canEdit);
      });

    this.featureFlagService.isInfinityMessageScrollingEnabled()
      .pipe(first())
      .subscribe((isInfinityMessageScrollingEnabled) => {
        if (!isInfinityMessageScrollingEnabled) {
          this.populateMessages(session.events || []);
        }
        this.loadTraceData();
      });
  }

  protected updateWithSelectedEvalCase(evalCase: EvalCase) {
    this.evalCase = evalCase;
    this.isChatMode.set(false);

    this.resetEventsAndMessages();
    let invocationIndex = 0;

    for (const invocation of evalCase.conversation) {
      if (invocation.userContent?.parts) {
        for (const part of invocation.userContent.parts) {
          this.storeMessage(part, null, 'user');
        }
      }

      if (invocation.intermediateData?.toolUses) {
        let toolUseIndex = 0;
        for (const toolUse of invocation.intermediateData.toolUses) {
          const functionCallPart = {
            functionCall: { name: toolUse.name, args: toolUse.args },
          };
          this.storeMessage(
            functionCallPart, null, 'bot', invocationIndex, { toolUseIndex });
          toolUseIndex++;

          const functionResponsePart = { functionResponse: { name: toolUse.name } };
          this.storeMessage(functionResponsePart, null, 'bot');
        }
      }

      if (invocation.finalResponse?.parts) {
        let finalResponsePartIndex = 0;
        for (const part of invocation.finalResponse.parts) {
          this.storeMessage(
            part, null, 'bot', invocationIndex, { finalResponsePartIndex });
          finalResponsePartIndex++;
        }
      }
      invocationIndex++;
    }
  }

  protected updateSelectedEvalSetId(evalSetId: string) {
    this.evalSetId = evalSetId;
  }

  protected editEvalCaseMessage(message: any) {
    this.isEvalCaseEditing.set(true);
    this.userEditEvalCaseMessage = message.text;
    message.isEditing = true;
    setTimeout(() => {
      const textarea = this.chatPanel()?.textarea?.nativeElement;
      if (!textarea) {
        return;
      }
      textarea.focus();
      let textLength = textarea.value.length;
      if (message.text.charAt(textLength - 1) === '\n') {
        textLength--;
      }
      textarea.setSelectionRange(textLength, textLength);
    }, 0);
  }

  protected editFunctionArgs(message: any) {
    this.isEvalCaseEditing.set(true);
    const dialogRef = this.dialog.open(EditJsonDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        dialogHeader: 'Edit function arguments',
        functionName: message.functionCall.name,
        jsonContent: message.functionCall.args,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.isEvalCaseEditing.set(false);
      if (result) {
        this.hasEvalCaseChanged.set(true);
        message.functionCall.args = result;

        this.updatedEvalCase = structuredClone(this.evalCase!);
        this.updatedEvalCase!.conversation[message.invocationIndex]
          .intermediateData!.toolUses![message.toolUseIndex]
          .args = result;
      }
    });
  }

  protected saveEvalCase() {
    this.evalService
      .updateEvalCase(
        this.appName, this.evalSetId, this.updatedEvalCase!.evalId,
        this.updatedEvalCase!)
      .subscribe((res) => {
        this.openSnackBar('Eval case updated', 'OK');
        this.resetEditEvalCaseVars();
      });
  }

  protected cancelEditEvalCase() {
    this.resetEditEvalCaseVars();
    this.updateWithSelectedEvalCase(this.evalCase!);
  }

  private resetEditEvalCaseVars() {
    this.hasEvalCaseChanged.set(false);
    this.isEvalCaseEditing.set(false);
    this.isEvalEditMode.set(false);
    this.updatedEvalCase = null;
  }

  protected cancelEditMessage(message: any) {
    message.isEditing = false;
    this.isEvalCaseEditing.set(false);
  }

  protected saveEditMessage(message: any) {
    this.hasEvalCaseChanged.set(true);
    this.isEvalCaseEditing.set(false);
    message.isEditing = false;
    message.text =
      this.userEditEvalCaseMessage ? this.userEditEvalCaseMessage : ' ';

    this.updatedEvalCase = structuredClone(this.evalCase!);
    this.updatedEvalCase!.conversation[message.invocationIndex]
      .finalResponse!.parts![message.finalResponsePartIndex] = {
      text: this.userEditEvalCaseMessage
    };

    this.userEditEvalCaseMessage = '';
  }

  protected handleKeydown(event: KeyboardEvent, message: any) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEditMessage(message);
    } else if (event.key === 'Escape') {
      this.cancelEditMessage(message);
    }
  }

  protected deleteEvalCaseMessage(message: any, index: number) {
    this.hasEvalCaseChanged.set(true);
    this.uiEvents.update((uiEvents) => uiEvents.filter((m, i) => i !== index));

    this.updatedEvalCase = structuredClone(this.evalCase!);
    this.updatedEvalCase!.conversation[message.invocationIndex]
      .finalResponse!.parts!.splice(message.finalResponsePartIndex, 1);
  }

  protected editEvalCase() {
    this.isEvalEditMode.set(true);
  }

  protected deleteEvalCase() {
    const dialogData: DeleteSessionDialogData = {
      title: 'Confirm delete',
      message: `Are you sure you want to delete ${this.evalCase!.evalId}?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const dialogRef = this.dialog.open(DeleteSessionDialogComponent, {
      width: '600px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.evalTab()?.deleteEvalCase(this.evalCase!.evalId);
        this.openSnackBar('Eval case deleted', 'OK');
      }
    });
  }

  onNewSessionClick() {
    this.resetToNewSession();
    this.eventData.clear();
    this.uiEvents.set([]);
    this.artifacts = [];
    this.traceData = [];
    this.bottomPanelVisible = false;

    // Clear selected event
    this.selectedEvent = undefined;
    this.selectedEventIndex = undefined;
    this.selectedMessageIndex = undefined;

    // Close eval history if opened
    if (!!this.evalTab()?.showEvalHistory) {
      this.evalTab()?.toggleEvalHistoryButton();
    }
  }

  getToolbarSessionId() {
    if (!this.sessionId) {
      return 'NEW SESSION';
    }

    const meta = this.currentSessionState?.['__adk_metadata__'] as any;
    if (meta?.displayName) {
      const shortId = this.sessionId.substring(0, 4);
      return `[${shortId}] ${meta.displayName}`;
    }
    return this.sessionId;
  }

  getCurrentSessionDisplayName() {
    if (!this.sessionId) {
      return 'NEW SESSION';
    }
    
    const meta = this.currentSessionState?.['__adk_metadata__'] as any;
    return meta?.displayName || this.sessionId;
  }

  async copySessionId() {
    if (!this.sessionId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.sessionId);
      this.openSnackBar(this.i18n.sessionIdCopiedMessage, 'OK');
    } catch {
      this.openSnackBar(this.i18n.copySessionIdFailedMessage, 'OK');
    }
  }

  startSessionNameEdit() {
    const meta = this.currentSessionState?.['__adk_metadata__'] as any;
    this.sessionNameDraft = meta?.displayName || '';
    this.isEditingSessionName = true;
  }

  cancelSessionNameEdit() {
    this.isEditingSessionName = false;
  }

  saveSessionName() {
    if (!this.sessionId) return;
    
    const updatedState = {
      ...this.currentSessionState,
      __adk_metadata__: {
        ...(this.currentSessionState?.['__adk_metadata__'] || {}),
        displayName: this.sessionNameDraft
      }
    };
    
    this.currentSessionState = updatedState;
    this.isEditingSessionName = false;
    
    this.sessionService.updateSession(this.userId, this.appName, this.sessionId, { stateDelta: updatedState }).subscribe({
      next: () => {
        if (this.sessionTab) {
          this.sessionTab.reloadSession(this.sessionId!);
        }
        if (this.drawerSessionTab()) {
          this.drawerSessionTab()!.reloadSession(this.sessionId!);
        }
      }
    });
  }

  handleSessionNameInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.saveSessionName();
    } else if (event.key === 'Escape') {
      this.cancelSessionNameEdit();
    }
  }

  startUserIdEdit() {
    this.userIdDraft = this.userId;
    this.isEditingUserId = true;
  }

  cancelUserIdEdit() {
    this.userIdDraft = '';
    this.isEditingUserId = false;
  }

  saveUserId() {
    const updatedUserId = this.userIdDraft.trim();
    if (!updatedUserId) {
      this.openSnackBar(this.i18n.invalidUserIdMessage, 'OK');
      return;
    }

    this.userId = updatedUserId;
    this.isEditingUserId = false;
    this.isSessionUrlEnabledObs.pipe(take(1)).subscribe((enabled) => {
      if (enabled) {
        this.updateSelectedSessionUrl();
      }
    });
  }

  handleUserIdInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveUserId();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelUserIdEdit();
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const url = this.safeValuesService.createObjectUrl(file);
        this.selectedFiles.push({ file, url });
      }
    }
    input.value = '';
  }

  removeFile(index: number) {
    URL.revokeObjectURL(this.selectedFiles[index].url);
    this.selectedFiles.splice(index, 1);
  }

  toggleSse() {
    this.useSse = !this.useSse;
    this.enableSseIndicator.set(this.useSse);
  }

  enterBuilderMode() {
    const url = this.router
      .createUrlTree([], {
        queryParams: { mode: 'builder' },
        queryParamsHandling: 'merge',
      })
      .toString();
    this.location.replaceState(url);
    this.isBuilderMode.set(true);

    // Load existing agent configuration if app is selected
    if (this.appName) {
      this.loadExistingAgentConfiguration();
    }
  }


  private loadExistingAgentConfiguration() {
    this.agentService.getAgentBuilderTmp(this.appName).subscribe({
      next: (yamlContent: string) => {
        if (yamlContent) {
          this.canvasComponent()?.loadFromYaml(yamlContent, this.appName);
        }
      },
      error: (error: any) => {
        console.error('Error loading agent configuration:', error);
        this._snackBar.open('Error loading agent configuration', 'OK');
      },
    });
  }

  protected exitBuilderMode() {
    const url = this.router
      .createUrlTree([], {
        queryParams: { mode: null },
        queryParamsHandling: 'merge',
      })
      .toString();
    this.location.replaceState(url);
    this.isBuilderMode.set(false);
    this.agentBuilderService.clear();
  }

  protected toggleBuilderAssistant() {
    this.showBuilderAssistant = !this.showBuilderAssistant;
  }

  openAddItemDialog(): void {
    this.apps$.pipe(take(1)).subscribe((apps) => {
      const dialogRef = this.dialog.open(AddItemDialogComponent, {
        width: '600px',
        data: { existingAppNames: apps ?? [] },
      });
    });
  }

  openAgentStructureGraphDialog(): void {
    const dialogRef = this.dialog.open(AgentStructureGraphDialogComponent, {
      width: '1000px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        appName: this.appName,
      },
    });
  }

  saveAgentBuilder() {
    this.canvasComponent()?.saveAgent(this.appName);
  }

  selectEvent(key: string, messageIndex?: number) {
    this.selectedEvent = this.eventData.get(key);
    this.selectedEventIndex = this.getIndexOfKeyInMap(key);
    this.selectedMessageIndex = messageIndex !== undefined ? messageIndex : this.uiEvents().findIndex(msg => msg.event.id === key);

    let filter = undefined;
    if (this.isEventFilteringEnabled() && this.selectedEvent.invocationId &&
      (this.selectedEvent.timestamp ||
        this.selectedEvent.timestampInMillis)) {
      filter = {
        invocationId: this.selectedEvent.invocationId,
        timestamp:
          this.selectedEvent.timestamp ?? this.selectedEvent.timestampInMillis
      };
    }

    const eventTraceParam = { id: this.selectedEvent.id, ...filter };
    this.uiStateService.setIsEventRequestResponseLoading(true);
    this.eventService.getEventTrace(eventTraceParam)
      .subscribe(
        (res) => {
          if (res[this.llmRequestKey]) {
            this.llmRequest = JSON.parse(res[this.llmRequestKey]);
          }
          if (res[this.llmResponseKey]) {
            this.llmResponse = JSON.parse(res[this.llmResponseKey]);
          }
          this.uiStateService.setIsEventRequestResponseLoading(false);
        },
        () => {
          this.uiStateService.setIsEventRequestResponseLoading(false);
        });
    this.eventService
      .getEvent(
        this.userId,
        this.appName,
        this.sessionId,
        this.selectedEvent.id,
      )
      .subscribe(async (res) => {
        if (!res.dotSrc) {
          this.renderedEventGraph = undefined;
          return;
        }
        const svg = await this.graphService.render(res.dotSrc);
        this.rawSvgString = svg;
        this.renderedEventGraph =
          this.safeValuesService.bypassSecurityTrustHtml(svg);
      });
  }

  deleteSession(session: string) {
    const dialogData: DeleteSessionDialogData = {
      title: 'Confirm delete',
      message:
        `Are you sure you want to delete this session ${this.sessionId}?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const dialogRef = this.dialog.open(DeleteSessionDialogComponent, {
      width: '600px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.sessionService.deleteSession(this.userId, this.appName, session)
          .subscribe((res) => {
            const nextSession = this.sessionTab?.refreshSession(session);
            if (nextSession) {
              this.sessionTab?.getSession(nextSession.id);
            } else {
              window.location.reload();
            }
          });
      }
    });
  }

  private syncSelectedAppFromUrl() {
    combineLatest([
      this.activatedRoute.queryParams, this.apps$
    ]).subscribe(([params, apps]) => {
      const app = params['app'];
      if (apps && apps.length && app) {
        if (!apps.includes(app)) {
          this.openSnackBar(`Agent '${app}' not found`, 'OK');
          return;
        }

        this.selectedAppControl.setValue(app, { emitEvent: false });
        this.selectApp(app);
        this.agentService.getAppInfo(app).subscribe(info => {
          this.agentGraphData = info;
          this.agentReadme = info?.readme || '';
        })
        this.agentService.getAgentBuilder(app).subscribe((res: any) => {
          if (!res || res == '') {
            this.disableBuilderSwitch = true;
            this.agentBuilderService.setLoadedAgentData(undefined);
          } else {
            this.disableBuilderSwitch = false;
            this.agentBuilderService.setLoadedAgentData(res);
          }
        });
        this.isBuilderMode.set(false);
      }
      if (params['mode'] === 'builder') {
        this.enterBuilderMode();
      }
    });
  }

  private updateSelectedAppUrl() {
    this.selectedAppControl.valueChanges
      .pipe(distinctUntilChanged(), filter(Boolean))
      .subscribe((app: string) => {
        this.selectApp(app);

        // Navigate if selected app changed.
        const selectedAgent = this.activatedRoute.snapshot.queryParams['app'];
        if (app === selectedAgent) {
          return;
        }
        this.router.navigate([], {
          queryParams: { 'app': app, 'mode': null },
          queryParamsHandling: 'merge',
        });
      });
  }

  private updateSelectedSessionUrl() {
    const url = this.router
      .createUrlTree([], {
        queryParams: {
          'session': this.sessionId,
          'userId': this.userId,
        },
        queryParamsHandling: 'merge',
      })
      .toString();
    this.location.replaceState(url);
  }

  private clearSessionUrl() {
    this.isSessionUrlEnabledObs.pipe(first()).subscribe((enabled) => {
      if (enabled) {
        const url = this.router
          .createUrlTree([], {
            queryParams: {
              'session': null,
            },
            queryParamsHandling: 'merge',
          })
          .toString();
        this.location.replaceState(url);
      }
    });
  }

  handlePageEvent(event: any) {
    if (event.pageIndex >= 0) {
      const key = this.getKeyAtIndexInMap(event.pageIndex);
      if (key) {
        this.selectEvent(key);

        // Scroll to the corresponding message in the chat panel
        setTimeout(() => {
          const messageIndex = this.uiEvents().findIndex(msg => msg.event.id === key);
          if (messageIndex !== -1) {
            const scrollContainer = this.chatPanel()?.scrollContainer?.nativeElement;
            if (!scrollContainer) return;

            const messageElements = scrollContainer.querySelectorAll('.message-row-container');
            if (messageElements && messageElements[messageIndex]) {
              messageElements[messageIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
              });
            }
          }
        }, 0);
      }
    }
  }

  closeSelectedEvent() {
    this.selectedEvent = undefined;
    this.selectedEventIndex = undefined;
    this.selectedMessageIndex = undefined;
  }

  @HostListener('window:keydown', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.selectedEvent) {
      event.preventDefault();
      this.selectedEvent = undefined;
      this.selectedEventIndex = undefined;
      this.selectedMessageIndex = undefined;
    }
  }

  private getIndexOfKeyInMap(key: string): number | undefined {
    let index = 0;
    const mapOrderPreservingSort = (a: any, b: any): number =>
      0;  // Simple compare function

    const sortedKeys = Array.from(this.eventData.keys())
      .sort(
        mapOrderPreservingSort,
      );

    for (const k of sortedKeys) {
      if (k === key) {
        return index;
      }
      index++;
    }
    return undefined;  // Key not found
  }

  private getKeyAtIndexInMap(index: number): string | undefined {
    const mapOrderPreservingSort = (a: any, b: any): number =>
      0;  // Simple compare function

    const sortedKeys = Array.from(this.eventData.keys())
      .sort(
        mapOrderPreservingSort,
      );

    if (index >= 0 && index < sortedKeys.length) {
      return sortedKeys[index];
    }
    return undefined;  // Index out of bounds
  }

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action);
  }

  private processThoughtText(text: string) {
    return text.replace('/*PLANNING*/', '').replace('/*ACTION*/', '');
  }

  openLink(url: string) {
    this.safeValuesService.windowOpen(window, url, '_blank');
  }

  openViewImageDialog(imageData: string | null) {
    const dialogRef = this.dialog.open(ViewImageDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        imageData,
      },
    });
  }

  private createDefaultArtifactName(mimeType: string): string {
    if (!mimeType || !mimeType.includes('/')) {
      return '';
    }

    return mimeType.replace('/', '.');
  }

  protected exportSession() {
    this.sessionService.getSession(this.userId, this.appName, this.sessionId)
      .subscribe((res) => {
        console.log(res);
        this.downloadService.downloadObjectAsJson(
          res, `session-${this.sessionId}.json`);
      });
  }

  updateState() {
    const dialogRef = this.dialog.open(EditJsonDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        dialogHeader: 'Update state',
        jsonContent: this.currentSessionState,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.updatedSessionState.set(result);
      }
    });
  }

  removeStateUpdate() {
    this.updatedSessionState.set(null);
  }

  closeTraceEventDetailPanel() {
    this.bottomPanelVisible = false;
    this.traceService.selectedRow(undefined);
    this.traceService.setHoveredMessages(undefined, '')
  }

  protected importSession() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = () => {
      if (!input.files || input.files.length === 0) {
        return;
      }

      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          try {
            const sessionData =
              JSON.parse(e.target.result as string) as Session;
            if (!sessionData.events || sessionData.events.length === 0) {
              this.openSnackBar('Invalid session file: no events found', 'OK');
              return;
            }

            if (sessionData.appName && sessionData.appName !== this.appName) {
              const dialogData: DeleteSessionDialogData = {
                title: 'App name mismatch',
                message: `The session file was exported from app "${sessionData.appName}" but the current app is "${this.appName}". Do you want to import it anyway?`,
                confirmButtonText: 'Import',
                cancelButtonText: 'Cancel',
              };
              const dialogRef = this.dialog.open(DeleteSessionDialogComponent, {
                width: '600px',
                data: dialogData,
              });
              dialogRef.afterClosed().subscribe((confirmed: boolean) => {
                if (confirmed) {
                  this.doImportSession(sessionData);
                }
              });
            } else {
              this.doImportSession(sessionData);
            }
          } catch (error) {
            this.openSnackBar('Error parsing session file', 'OK');
          }
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  private doImportSession(sessionData: Session) {
    const now = Date.now() / 1000;
    const events = sessionData.events!.map(event => ({
      ...event,
      timestamp: now,
    }));

    this.sessionService
      .importSession(this.userId, this.appName, events, sessionData.state)
      .subscribe((res) => {
        this.openSnackBar(
          `Session imported successfully (ID: ${res.id})`, 'OK');
        this.sessionTab?.refreshSession();
      });
  }
}
