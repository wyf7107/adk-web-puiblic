import {CommonModule, NgClass} from '@angular/common';
import {Component, EventEmitter, Input, Output, Type, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {NgxJsonViewerModule} from 'ngx-json-viewer';

import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import {isComputerUseResponse, isVisibleComputerUseClick} from '../../core/models/ComputerUse';
import type {EvalCase} from '../../core/models/Eval';
import {UiEvent} from '../../core/models/UiEvent';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {JsonTooltipDirective} from '../../directives/html-tooltip.directive';
import {WorkflowGraphTooltipDirective} from '../../directives/workflow-graph-tooltip.directive';
import {A2uiCanvasComponent} from '../a2ui-canvas/a2ui-canvas.component';
import {MediaType} from '../artifact-tab/artifact-tab.component';
import {AudioPlayerComponent} from '../audio-player/audio-player.component';
import {ChatAvatarComponent} from '../chat-avatar/chat-avatar.component';
import {ComputerActionComponent} from '../computer-action/computer-action.component';
import {HoverInfoButtonComponent} from '../hover-info-button/hover-info-button.component';
import {LongRunningResponseComponent} from '../long-running-response/long-running-response';
import {MARKDOWN_COMPONENT, MarkdownComponentInterface} from '../markdown/markdown.component.interface';
import {MessageFeedbackComponent} from '../message-feedback/message-feedback.component';
import {ChatPanelMessagesInjectionToken} from '../chat-panel/chat-panel.component.i18n';

@Component({
  selector: 'app-event-row',
  templateUrl: './event-row.component.html',
  styleUrl: './event-row.component.scss',
  standalone: true,
  host: {
    'class': 'message-row-container',
    '[class.selected]': 'isSelected',
    '[class.user]': 'uiEvent.role === "user"',
    '[class.bot]': 'uiEvent.role === "bot"',
    '(click)': 'onRowClick($event)'
  },
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
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
export class EventRowComponent {
  @Input({required: true}) uiEvent!: UiEvent;
  @Input({required: true}) index!: number;
  @Input() uiEvents: UiEvent[] = [];
  @Input() isSelected: boolean = false;
  @Input() isHighlighted: boolean = false;
  
  @Input() appName: string = '';
  @Input() userId: string = '';
  @Input() sessionId: string = '';
  @Input() sessionName: string = '';
  
  @Input() evalCase: EvalCase | null = null;
  @Input() isEvalEditMode: boolean = false;
  @Input() isEvalCaseEditing: boolean = false;
  @Input() isEditFunctionArgsEnabled: boolean = false;
  @Input() userEditEvalCaseMessage: string = '';
  
  @Input() agentGraphData: any = null;
  @Input() allWorkflowNodes: any = null;
  
  @Input() isUserFeedbackEnabled: boolean = false;
  @Input() isLoadingAgentResponse: boolean = false;

  @Output() readonly rowClick = new EventEmitter<{event: MouseEvent, uiEvent: UiEvent, index: number}>();
  @Output() readonly handleKeydown = new EventEmitter<{event: KeyboardEvent, message: any}>();
  @Output() readonly cancelEditMessage = new EventEmitter<any>();
  @Output() readonly saveEditMessage = new EventEmitter<any>();
  @Output() readonly userEditEvalCaseMessageChange = new EventEmitter<string>();
  
  @Output() readonly openViewImageDialog = new EventEmitter<string>();
  @Output() readonly openBase64InNewTab = new EventEmitter<{data: string, mimeType: string}>();
  
  @Output() readonly editEvalCaseMessage = new EventEmitter<any>();
  @Output() readonly deleteEvalCaseMessage = new EventEmitter<{message: any, index: number}>();
  @Output() readonly editFunctionArgs = new EventEmitter<any>();
  
  @Output() readonly clickEvent = new EventEmitter<number>();
  @Output() readonly longRunningResponseComplete = new EventEmitter<AgentRunRequest>();
  @Output() readonly agentStateClick = new EventEmitter<{event: Event, index: number}>();

  protected readonly i18n = inject(ChatPanelMessagesInjectionToken);
  protected readonly sanitizer = inject(SAFE_VALUES_SERVICE);
  readonly markdownComponent: Type<MarkdownComponentInterface> = inject(MARKDOWN_COMPONENT);

  readonly MediaType = MediaType;
  readonly JSON = JSON;
  readonly Object = Object;
  readonly String = String;

  shouldShowMessageCard(message: any): boolean {
    return !!(
        message.text || message.attachments || message.inlineData ||
        message.executableCode || message.codeExecutionResult ||
        message.a2uiData || message.renderedContent || message.isLoading ||
        (message.failedMetric && message.evalStatus === 2));
  }

  renderGooglerSearch(content: string) {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  isComputerUseClick(input: any): boolean {
    return isVisibleComputerUseClick(input);
  }

  isComputerUseResponse(input: any): boolean {
    return isComputerUseResponse(input);
  }

  hasWorkflowNodes(): boolean {
    const nodes = this.uiEvent.event?.actions?.agentState?.nodes;
    return !!nodes && Object.keys(nodes).length > 0;
  }

  getWorkflowNodes(): any {
    return this.uiEvent.event?.actions?.agentState?.nodes || null;
  }

  hasEndOfAgent(): boolean {
    return this.uiEvent.event?.actions?.endOfAgent === true;
  }

  getEndOfAgentAuthor(): string {
    return this.uiEvent.event?.author || 'Agent';
  }

  onRowClick(event: MouseEvent) {
    this.rowClick.emit({event, uiEvent: this.uiEvent, index: this.index});
  }
}
