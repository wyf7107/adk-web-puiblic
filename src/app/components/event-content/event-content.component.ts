import {CommonModule, NgClass} from '@angular/common';
import {Component, EventEmitter, Input, Output, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';

import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import {isComputerUseResponse, isVisibleComputerUseClick} from '../../core/models/ComputerUse';
import type {EvalCase} from '../../core/models/Eval';
import {UiEvent} from '../../core/models/UiEvent';
import {WorkflowGraphTooltipDirective} from '../../directives/workflow-graph-tooltip.directive';
import {ComputerActionComponent} from '../computer-action/computer-action.component';
import {HoverInfoButtonComponent} from '../hover-info-button/hover-info-button.component';
import {LongRunningResponseComponent} from '../long-running-response/long-running-response';
import {ChatPanelMessagesInjectionToken} from '../chat-panel/chat-panel.component.i18n';
import {ContentBubbleComponent} from '../content-bubble/content-bubble.component';

@Component({
  selector: 'app-event-content',
  templateUrl: './event-content.component.html',
  styleUrl: './event-content.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    NgClass,
    WorkflowGraphTooltipDirective,
    ComputerActionComponent,
    LongRunningResponseComponent,
    HoverInfoButtonComponent,
    ContentBubbleComponent,
  ],
})
export class EventContentComponent {
  @Input({required: true}) uiEvent!: UiEvent;
  @Input({required: true}) index!: number;
  @Input() uiEvents: UiEvent[] = [];
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

  readonly Object = Object;
  readonly String = String;

  shouldShowMessageCard(message: any): boolean {
    return !!(
        message.text || message.attachments || message.inlineData ||
        message.executableCode || message.codeExecutionResult ||
        message.a2uiData || message.renderedContent || message.isLoading ||
        (message.failedMetric && message.evalStatus === 2));
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
}
