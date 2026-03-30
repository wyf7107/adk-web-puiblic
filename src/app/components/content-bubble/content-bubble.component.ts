import {Component, EventEmitter, Input, Output, Type, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {NgxJsonViewerModule} from 'ngx-json-viewer';

import {UiEvent} from '../../core/models/UiEvent';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {JsonTooltipDirective} from '../../directives/html-tooltip.directive';
import {A2uiCanvasComponent} from '../a2ui-canvas/a2ui-canvas.component';
import {MediaType} from '../artifact-tab/artifact-tab.component';
import {AudioPlayerComponent} from '../audio-player/audio-player.component';
import {MARKDOWN_COMPONENT, MarkdownComponentInterface} from '../markdown/markdown.component.interface';
import {ChatPanelMessagesInjectionToken} from '../chat-panel/chat-panel.component.i18n';

@Component({
  selector: 'app-content-bubble',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    NgxJsonViewerModule,
    A2uiCanvasComponent,
    AudioPlayerComponent,
    JsonTooltipDirective,
  ],
  templateUrl: './content-bubble.component.html',
  styleUrl: './content-bubble.component.scss',
  host: {
    'class': 'content-bubble-host'
  }
})
export class ContentBubbleComponent {
  @Input({required: true}) uiEvent!: UiEvent;
  @Input() type: 'message' | 'output' | 'transcription' | 'thought' | 'error' = 'message';
  @Input() role: string = 'bot';
  @Input() evalStatus?: number;
  
  @Input() userEditEvalCaseMessage: string = '';

  @Output() readonly userEditEvalCaseMessageChange = new EventEmitter<string>();
  @Output() readonly handleKeydown = new EventEmitter<{event: KeyboardEvent, message: any}>();
  @Output() readonly cancelEditMessage = new EventEmitter<any>();
  @Output() readonly saveEditMessage = new EventEmitter<any>();
  
  @Output() readonly openViewImageDialog = new EventEmitter<string>();
  @Output() readonly openBase64InNewTab = new EventEmitter<{data: string, mimeType: string}>();

  protected readonly i18n = inject(ChatPanelMessagesInjectionToken);
  protected readonly sanitizer = inject(SAFE_VALUES_SERVICE);
  readonly markdownComponent: Type<MarkdownComponentInterface> = inject(MARKDOWN_COMPONENT);

  readonly MediaType = MediaType;

  renderGooglerSearch(content: string) {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }
}
