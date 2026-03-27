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

import {TextFieldModule} from '@angular/cdk/text-field';
import {CommonModule, NgClass} from '@angular/common';
import {AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef, EventEmitter, HostListener, inject, input, Input, OnChanges, Output, signal, SimpleChanges, Type, ViewChild} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {EMPTY, merge, NEVER, of, Subject} from 'rxjs';
import {catchError, filter, first, switchMap, tap} from 'rxjs/operators';

import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import {isComputerUseResponse, isVisibleComputerUseClick} from '../../core/models/ComputerUse';
import type {EvalCase} from '../../core/models/Eval';
import {FunctionCall, FunctionResponse} from '../../core/models/types';
import {UiEvent} from '../../core/models/UiEvent';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {SESSION_SERVICE} from '../../core/services/interfaces/session';
import {STRING_TO_COLOR_SERVICE} from '../../core/services/interfaces/string-to-color';
import {ListResponse} from '../../core/services/interfaces/types';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';
import {THEME_SERVICE} from '../../core/services/interfaces/theme';
import {JsonTooltipDirective} from '../../directives/html-tooltip.directive';
import {WorkflowGraphTooltipDirective} from '../../directives/workflow-graph-tooltip.directive';
import {A2uiCanvasComponent} from '../a2ui-canvas/a2ui-canvas.component';
import {MediaType,} from '../artifact-tab/artifact-tab.component';
import {AudioPlayerComponent} from '../audio-player/audio-player.component';
import {ComputerActionComponent} from '../computer-action/computer-action.component';
import {LongRunningResponseComponent} from '../long-running-response/long-running-response';
import {MARKDOWN_COMPONENT, MarkdownComponentInterface} from '../markdown/markdown.component.interface';
import {MessageFeedbackComponent} from '../message-feedback/message-feedback.component';

import {ChatPanelMessagesInjectionToken} from './chat-panel.component.i18n';

import {HoverInfoButtonComponent} from '../hover-info-button/hover-info-button.component';
import {ChatAvatarComponent} from '../chat-avatar/chat-avatar.component';

const ROOT_AGENT = 'root_agent';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-chat-panel',
  templateUrl: './chat-panel.component.html',
  styleUrl: './chat-panel.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatButtonModule,
    MatInputModule,
    TextFieldModule,
    MatFormFieldModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    NgxJsonViewerModule,
    A2uiCanvasComponent,
    AudioPlayerComponent,
    MessageFeedbackComponent,
    MatTooltipModule,
    NgClass,
    JsonTooltipDirective,
    WorkflowGraphTooltipDirective,
    ComputerActionComponent,
    LongRunningResponseComponent,
    HoverInfoButtonComponent,
    ChatAvatarComponent,
  ],
})
export class ChatPanelComponent implements OnChanges, AfterViewInit {
  @Input() appName: string = '';
  @Input() agentReadme: string = '';
  sessionName = input<string>('');
  @Input() uiEvents: UiEvent[] = [];
  @Input() isChatMode: boolean = true;
  @Input() evalCase: EvalCase|null = null;
  @Input() isEvalEditMode: boolean = false;
  @Input() isEvalCaseEditing: boolean = false;
  @Input() agentGraphData: any = null;
  @Input() isEditFunctionArgsEnabled: boolean = false;
  @Input() userInput: string = '';
  @Input() userEditEvalCaseMessage: string = '';
  @Input() selectedFiles: {file: File; url: string}[] = [];
  @Input() updatedSessionState: any|null = null;
  @Input() selectedEvent: any = undefined;
  @Input() isAudioRecording: boolean = false;
  @Input() isVideoRecording: boolean = false;
  @Input() hoveredEventMessageIndices: number[] = [];
  @Input() userId: string = '';
  @Input() sessionId: string = '';

  @Output() readonly userInputChange = new EventEmitter<string>();
  @Output() readonly userEditEvalCaseMessageChange = new EventEmitter<string>();
  @Output() readonly clickEvent = new EventEmitter<number>();
  @Output()
  readonly handleKeydown =
      new EventEmitter<{event: KeyboardEvent, message: any}>();
  @Output() readonly cancelEditMessage = new EventEmitter<any>();
  @Output() readonly saveEditMessage = new EventEmitter<any>();
  @Output() readonly openViewImageDialog = new EventEmitter<string>();
  @Output()
  readonly openBase64InNewTab =
      new EventEmitter<{data: string, mimeType: string}>();
  @Output() readonly editEvalCaseMessage = new EventEmitter<any>();
  @Output()
  readonly deleteEvalCaseMessage =
      new EventEmitter<{message: any, index: number}>();
  @Output() readonly editFunctionArgs = new EventEmitter<any>();
  @Output() readonly fileSelect = new EventEmitter<Event>();
  @Output() readonly removeFile = new EventEmitter<number>();
  @Output() readonly removeStateUpdate = new EventEmitter<void>();
  @Output() readonly sendMessage = new EventEmitter<Event>();
  @Output() readonly updateState = new EventEmitter<void>();
  @Output() readonly toggleAudioRecording = new EventEmitter<void>();
  @Output() readonly toggleVideoRecording = new EventEmitter<void>();
  @Output() readonly longRunningResponseComplete = new EventEmitter<AgentRunRequest>();

  @ViewChild('videoContainer', {read: ElementRef}) videoContainer!: ElementRef;
  @ViewChild('autoScroll') scrollContainer!: ElementRef;
  @ViewChild('messageTextarea') public textarea: ElementRef|undefined;
  scrollInterrupted = false;
  private scrollHeight = 0;
  private lastMessageRef: any = null;
  private nextPageToken = '';
  private scrollTimeout: any = null;
  private mutationObserver: MutationObserver | null = null;
  protected readonly i18n = inject(ChatPanelMessagesInjectionToken);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly themeService = inject(THEME_SERVICE);
  private readonly stringToColorService = inject(STRING_TO_COLOR_SERVICE);
  readonly markdownComponent: Type<MarkdownComponentInterface> = inject(
      MARKDOWN_COMPONENT,
  );
  protected readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);
  private readonly agentService = inject(AGENT_SERVICE);
  private readonly sessionService = inject(SESSION_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  readonly MediaType = MediaType;
  readonly JSON = JSON;
  readonly Object = Object;
  readonly String = String;

  readonly isMessageFileUploadEnabledObs =
      this.featureFlagService.isMessageFileUploadEnabled();
  readonly isManualStateUpdateEnabledObs =
      this.featureFlagService.isManualStateUpdateEnabled();
  readonly isBidiStreamingEnabledObs =
      this.featureFlagService.isBidiStreamingEnabled();
  readonly canEditSession = signal(true);
  readonly isUserFeedbackEnabled =
      toSignal(this.featureFlagService.isFeedbackServiceEnabled());
  readonly isLoadingAgentResponse =
      toSignal(this.agentService.getLoadingState());

  protected readonly onScroll = new Subject<Event>();
  protected readonly sanitizer = inject(SAFE_VALUES_SERVICE);

  constructor() {
    effect(() => {
      const sessionName = this.sessionName();
      if (sessionName) {
        this.nextPageToken = '';
        this.uiStateService
            .lazyLoadMessages(sessionName, {
              pageSize: 100,
              pageToken: this.nextPageToken,
            })
            .pipe(first())
            .subscribe();
      }
    });
  }

  ngOnInit() {
    this.featureFlagService.isInfinityMessageScrollingEnabled()
        .pipe(
            first(),
            filter((enabled) => enabled),
            switchMap(
                () => merge(
                    this.uiStateService.onNewMessagesLoaded().pipe(
                        tap((response: ListResponse<any>&
                             {isBackground?: boolean}) => {
                          this.nextPageToken = response.nextPageToken ?? '';
                          if (!response.isBackground) {
                            this.restoreScrollPosition();
                          }
                        })),
                    this.onScroll.pipe(switchMap((event: Event) => {
                      const element = event.target as HTMLElement;
                      if (element.scrollTop !== 0) {
                        return EMPTY;
                      }

                      if (!this.nextPageToken) {
                        return EMPTY;
                      }

                      this.scrollHeight = element.scrollHeight;
                      return this.uiStateService
                          .lazyLoadMessages(this.sessionName(), {
                            pageSize: 100,
                            pageToken: this.nextPageToken,
                          })
                          .pipe(first(), catchError(() => NEVER));
                    })))),
            takeUntilDestroyed(this.destroyRef),
            )
        .subscribe();
  }

  ngAfterViewInit() {
    if (this.scrollContainer?.nativeElement) {
      const el = this.scrollContainer.nativeElement;
      
      el.addEventListener('scroll', () => {
        const isAtBottom = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 50;
        this.scrollInterrupted = !isAtBottom;
      });

      this.mutationObserver = new MutationObserver(() => {
        if (!this.scrollInterrupted) {
          this.scrollToBottom();
        }
      });
      this.mutationObserver.observe(el, {
        childList: true,
        subtree: true,
        characterData: true
      });
      
      this.destroyRef.onDestroy(() => {
        this.mutationObserver?.disconnect();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Scroll to top when switching apps or when messages become empty (new session with README)
    if ((changes['appName'] || changes['uiEvents']) && this.uiEvents.length === 0 && this.agentReadme) {
      setTimeout(() => this.scrollToTop(), 0);
    }

    if (changes['uiEvents']) {
      const currentLastMessage = this.uiEvents[this.uiEvents.length - 1];
      const isNewMessageAppended = currentLastMessage !== this.lastMessageRef;

      if (isNewMessageAppended) {
        if (currentLastMessage?.role === 'user' ||
            currentLastMessage?.isLoading === true) {
          this.scrollInterrupted = false;
        }
        this.scrollToBottom();
      }
      this.lastMessageRef = currentLastMessage;
    }
  }

  scrollToBottom() {
    if (!this.scrollInterrupted) {
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      this.scrollTimeout = setTimeout(() => {
        this.scrollContainer?.nativeElement.scrollTo({
          top: this.scrollContainer.nativeElement.scrollHeight,
          behavior: 'auto',
        });
        this.scrollTimeout = null;
      }, 50);
    }
  }

  scrollToTop() {
    setTimeout(() => {
      this.scrollContainer?.nativeElement.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }, 50);
  }

  getAuthorFromEvent(i: number) {
    const event = this.uiEvents[i].event;
    return event?.author ?? ROOT_AGENT;
  }


  shouldMessageHighlighted(index: number) {
    return this.hoveredEventMessageIndices.includes(index);
  }

  isMessageEventSelected(index: number): boolean {
    const message = this.uiEvents[index];
    return message.event.id && this.selectedEvent &&
        message.event.id === this.selectedEvent.id;
  }

  shouldShowMessageCard(message: any): boolean {
    return !!(
        message.text || message.attachments || message.inlineData ||
        message.executableCode || message.codeExecutionResult ||
        message.a2uiData || message.renderedContent || message.isLoading ||
        (message.failedMetric && message.evalStatus === 2));
  }

  getBotEventNumber(messageIndex: number): number {
    const message = this.uiEvents[messageIndex];

    if (message.role !== 'bot' ) {
      return -1;
    }

    const uniqueBotEventIds: string[] = [];
    for (let i = 0; i <= messageIndex; i++) {
      const msg = this.uiEvents[i];
      if (msg.role === 'bot' &&
          !uniqueBotEventIds.includes(msg.event.id)) {
        uniqueBotEventIds.push(msg.event.id);
      }
    }

    return uniqueBotEventIds.indexOf(message.event.id) + 1;
  }


  getOverallEventNumber(messageIndex: number): number {
    let eventCount = 0;
    let lastSeenGroupType: 'user'|'bot'|null = null;
    let lastBotEventId: string|null = null;

    for (let i = 0; i <= messageIndex; i++) {
      const msg = this.uiEvents[i];

      if (msg.role === 'user') {
        // User messages increment when they start a new group
        if (lastSeenGroupType !== 'user') {
          eventCount++;
          lastSeenGroupType = 'user';
        }

        if (i === messageIndex) {
          return eventCount;
        }
      } else if (msg.role === 'bot' ) {
        // Bot events increment when they're a new event
        if (msg.event.id !== lastBotEventId) {
          eventCount++;
          lastBotEventId = msg.event.id;
          lastSeenGroupType = 'bot';
        }

        if (i === messageIndex) {
          return eventCount;
        }
      }
    }

    return -1;
  }

  isFirstUserMessageInGroup(messageIndex: number): boolean {
    const message = this.uiEvents[messageIndex];

    if (message.role !== 'user') {
      return false;
    }

    if (messageIndex === 0) {
      return true;
    }

    const prevMessage = this.uiEvents[messageIndex - 1];
    return prevMessage.role !== 'user';
  }

  isFirstMessageInEventGroup(messageIndex: number): boolean {
    const message = this.uiEvents[messageIndex];

    if (message.role !== 'bot' ) {
      return false;
    }

    if (messageIndex === 0) {
      return true;  // First message overall
    }

    const prevMessage = this.uiEvents[messageIndex - 1];
    return prevMessage.event.id !== message.event.id;
  }






  renderGooglerSearch(content: string) {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  private restoreScrollPosition() {
    if (!this.scrollHeight) {
      this.scrollInterrupted = false;
      this.scrollToBottom();
      return;
    }
    const scrollContainer = this.scrollContainer?.nativeElement;
    if (scrollContainer) {
      scrollContainer.scrollTop =
          scrollContainer.scrollHeight - this.scrollHeight;
      this.scrollHeight = 0;
    }
  }

  isComputerUseClick(input: any): boolean {
    return isVisibleComputerUseClick(input);
  }

  isComputerUseResponse(input: any): boolean {
    return isComputerUseResponse(input);
  }


  hasWorkflowNodes(messageIndex: number): boolean {
    const message = this.uiEvents[messageIndex];
    const nodes = message.event?.actions?.agentState?.nodes;
    return !!nodes && Object.keys(nodes).length > 0;
  }


  getWorkflowNodes(messageIndex: number): any {
    const message = this.uiEvents[messageIndex];
    return message.event?.actions?.agentState?.nodes || null;
  }

  getAllWorkflowNodes(messageIndex: number): any {
    // Collect node states from all events, organized by nodePath
    // Structure: { "order_processing_pipeline": { "__START__": {...}, "validation_stage": {...} }, ... }
    const nodesByPath: any = {};

    for (let i = 0; i <= messageIndex; i++) {
      const msg = this.uiEvents[i];
      const event = msg.event;
      const nodes = event?.actions?.agentState?.nodes;
      const nodePath = event?.nodeInfo?.path;

      if (nodes && nodePath) {
        // Initialize path if not exists
        if (!nodesByPath[nodePath]) {
          nodesByPath[nodePath] = {};
        }

        // Merge nodes for this path, later states override earlier ones
        Object.assign(nodesByPath[nodePath], nodes);
      }
    }

    return Object.keys(nodesByPath).length > 0 ? nodesByPath : null;
  }




  hasEndOfAgent(messageIndex: number): boolean {
    const message = this.uiEvents[messageIndex];
    return message.event?.actions?.endOfAgent === true;
  }


  getEndOfAgentAuthor(messageIndex: number): string {
    const message = this.uiEvents[messageIndex];
    return message.event?.author || 'Agent';
  }


  handleAgentStateClick(event: Event, messageIndex: number) {
    event.stopPropagation();

    const message = this.uiEvents[messageIndex];
    const isAlreadySelected = message.event.id && this.selectedEvent &&
                               message.event.id === this.selectedEvent.id;

    if (!isAlreadySelected) {
      this.clickEvent.emit(messageIndex);
    }
  }

  /**
   * Handle row click, but ignore if user is selecting text
   */
  handleRowClick(event: MouseEvent, message: any, index: number) {
    // Check if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      // User is selecting text, don't trigger row selection
      return;
    }

    // Select row for both bot and user messages
    this.clickEvent.emit(index);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardNavigation(event: KeyboardEvent) {
    if (!this.selectedEvent) return;

    // Only handle arrow keys
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

    event.preventDefault();

    // Find unique eventIds and their first occurrence index
    const uniqueEventMap = new Map<string, number>();
    for (let i = 0; i < this.uiEvents.length; i++) {
      const msg = this.uiEvents[i];
      if (msg.event.id && !uniqueEventMap.has(msg.event.id)) {
        uniqueEventMap.set(msg.event.id, i);
      }
    }

    const eventIndices = Array.from(uniqueEventMap.values());

    if (eventIndices.length === 0) return;

    // Find current selected event index
    const currentIndex = eventIndices.findIndex(
        (idx) => this.uiEvents[idx].event?.id === this.selectedEvent.id);

    if (currentIndex === -1) return;

    // Navigate to next or previous
    let newIndex: number;
    if (event.key === 'ArrowDown') {
      newIndex = currentIndex + 1 >= eventIndices.length ? 0 : currentIndex + 1;
    } else {
      newIndex =
          currentIndex - 1 < 0 ? eventIndices.length - 1 : currentIndex - 1;
    }

    // Emit click event for the new index
    this.clickEvent.emit(eventIndices[newIndex]);

    // Scroll the selected message into view
    setTimeout(() => {
      if (!this.scrollContainer?.nativeElement) return;

      const messageElements =
          this.scrollContainer.nativeElement.querySelectorAll(
              '.message-column-container');
      if (messageElements && messageElements[eventIndices[newIndex]]) {
        messageElements[eventIndices[newIndex]].scrollIntoView(
            {behavior: 'smooth', block: 'nearest', inline: 'nearest'});
      }
    }, 0);
  }
}
