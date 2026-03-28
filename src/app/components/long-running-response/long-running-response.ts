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

import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';

    import {AgentRunRequest} from '../../core/models/AgentRunRequest';
    import {MarkdownComponent} from '../markdown/markdown.component';

import {HoverInfoButtonComponent} from '../hover-info-button/hover-info-button.component';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-long-running-response',
  templateUrl: './long-running-response.html',
  styleUrl: './long-running-response.scss',
  imports: [
    FormsModule,
    MatIconButton,
    MatIcon,
    MarkdownComponent,
    HoverInfoButtonComponent,
  ],
})
export class LongRunningResponseComponent {
  @Input() functionCall: any;
  @Input() appName!: string;
  @Input() userId!: string;
  @Input() sessionId!: string;

  @Output() responseComplete = new EventEmitter<any>();

  private readonly cdr = inject(ChangeDetectorRef);

  hasMessage(): boolean {
    return !!(this.functionCall.args?.prompt || this.functionCall.args?.message);
  }

  getPromptText(): string {
    return this.functionCall.args?.prompt || this.functionCall.args?.message || 'Please provide your response';
  }

  hasPayload(): boolean {
    return this.functionCall.args?.payload !== undefined &&
           this.functionCall.args?.payload !== null;
  }

  getPayloadJson(): string {
    try {
      return JSON.stringify(this.functionCall.args?.payload || {}, null, 2);
    } catch (e) {
      return '';
    }
  }

  hasResponseSchema(): boolean {
    return !!this.functionCall.args?.response_schema;
  }

  getResponseSchemaJson(): string {
    try {
      return JSON.stringify(this.functionCall.args?.response_schema || {}, null, 2);
    } catch (e) {
      return '';
    }
  }

  onSend() {
    if (!this.functionCall.userResponse ||
        !this.functionCall.userResponse.trim()) {
      return;
    }

    // Store the user response before sending
    this.functionCall.sentUserResponse = this.functionCall.userResponse;

    // Update status to sent
    this.functionCall.responseStatus = 'sent';
    this.cdr.detectChanges();

    const content = {
        role: 'user',
        parts: [{
          functionResponse: {
            id: this.functionCall.id,
            name: this.functionCall.name,
            response: { 'result': this.functionCall.userResponse },
          },
        }],
        functionCallEventId: this.functionCall.functionCallEventId
    };

    this.responseComplete.emit(content);
  }
}
