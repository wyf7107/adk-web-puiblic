import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';

import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import type {EvalCase} from '../../core/models/Eval';
import {UiEvent} from '../../core/models/UiEvent';
import {ChatAvatarComponent} from '../chat-avatar/chat-avatar.component';
import {MessageFeedbackComponent} from '../message-feedback/message-feedback.component';
import {EventContentComponent} from '../event-content/event-content.component';

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
    '[class.selectable]': 'isSelectable',
    '(click)': 'onRowClick($event)'
  },
  imports: [
    CommonModule,
    MessageFeedbackComponent,
    ChatAvatarComponent,
    EventContentComponent,
  ],
})
export class EventRowComponent {
  @Input({required: true}) uiEvent!: UiEvent;
  @Input({required: true}) index!: number;
  @Input() uiEvents: UiEvent[] = [];
  @Input() isSelected: boolean = false;
  @Input() isSelectable: boolean = true;
  
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

  onRowClick(event: MouseEvent) {
    if (!this.isSelectable) return;
    this.rowClick.emit({event, uiEvent: this.uiEvent, index: this.index});
  }
}
