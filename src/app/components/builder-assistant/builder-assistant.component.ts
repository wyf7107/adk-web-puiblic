/**
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

import { Component, Input, Output, EventEmitter, OnInit, Inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MarkdownModule } from 'ngx-markdown';
import { SESSION_SERVICE, SessionService } from '../../core/services/session.service';
import { AGENT_SERVICE, AgentService } from '../../core/services/agent.service';
import { AgentRunRequest } from '../../core/models/AgentRunRequest';
import { AGENT_BUILDER_SERVICE, AgentBuilderService } from '../../core/services/agent-builder.service';
import { YamlUtils } from '../../../utils/yaml-utils';

@Component({
  selector: 'app-builder-assistant',
  templateUrl: './builder-assistant.component.html',
  styleUrl: './builder-assistant.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, MatFormFieldModule, MatInputModule, MatCardModule, TextFieldModule, MarkdownModule]
})
export class BuilderAssistantComponent implements OnInit, AfterViewChecked {
  @Input() isVisible: boolean = true;
  @Input() appName = "";
  @Output() closePanel = new EventEmitter<void>();
  @Output() reloadCanvas = new EventEmitter<void>();

  assistantAppName = "__adk_agent_builder_assistant";
  userId = "user";
  currentSession = "";

  userMessage: string = '';
  messages: any[] = [];
  private shouldAutoScroll = false;

  @ViewChild('chatMessages') private chatMessages!: ElementRef;

  constructor(@Inject(SESSION_SERVICE) private sessionService: SessionService,
              @Inject(AGENT_SERVICE) private agentService: AgentService,
              @Inject(AGENT_BUILDER_SERVICE) private agentBuilderService: AgentBuilderService){
  }

  ngOnInit() {
    this.sessionService.createSession(this.userId, this.assistantAppName).subscribe(session => {
      this.currentSession = session.id;
      console.log(this.appName)
      const req: AgentRunRequest = {
        appName: this.assistantAppName,
        userId: this.userId,
        sessionId: session.id,
        newMessage: {
          'role': 'user',
          'parts': [{'text': 'hello'}],
        },
        streaming: false,
        stateDelta: {
          "root_directory" : `${this.appName}`
        }
      };

      // Add loading message for bot response
      this.messages.push({ role: 'bot', text: '', isLoading: true });
      this.shouldAutoScroll = true;

      this.agentService.runSse(req).subscribe({
        next: async (chunk) => {
          const chunkJson = JSON.parse(chunk);
          if (chunkJson.content) {
            let botText = '';
            for (let part of chunkJson.content.parts) {
              if (part.text) {
                botText += part.text;
              }
            }
            if (botText) {
              // Update the last message (remove loading, add text)
              const lastMessage = this.messages[this.messages.length - 1];
              if (lastMessage.role === 'bot' && lastMessage.isLoading) {
                lastMessage.text = botText;
                lastMessage.isLoading = false;
                this.shouldAutoScroll = true;
              }
            }
          }
        },
        error: (err) => {
          console.error('SSE error:', err);
          // Update loading message with error
          const lastMessage = this.messages[this.messages.length - 1];
          if (lastMessage.role === 'bot' && lastMessage.isLoading) {
            lastMessage.text = 'Sorry, I encountered an error. Please try again.';
            lastMessage.isLoading = false;
            this.shouldAutoScroll = true;
          }
        },
        complete: () => {
        },
      })
    })
  }

  onClosePanel() {
    this.closePanel.emit();
  }

  sendMessage() {
    if (this.userMessage?.trim() && this.currentSession) {
      // save to tmp
      this.saveAgent(this.appName);

      // Add user message
      this.messages.push({ role: 'user', text: this.userMessage });

      const userText = this.userMessage;
      this.userMessage = '';

      // Add loading message for bot response
      this.messages.push({ role: 'bot', text: '', isLoading: true });
      this.shouldAutoScroll = true;

      const req: AgentRunRequest = {
        appName: this.assistantAppName,
        userId: this.userId,
        sessionId: this.currentSession,
        newMessage: {
          'role': 'user',
          'parts': [{'text': userText}],
        },
        streaming: false,
        stateDelta: {
          "root_directory" : `${this.appName}/tmp`
        }
      };

      this.agentService.runSse(req).subscribe({
        next: async (chunk) => {
          const chunkJson = JSON.parse(chunk);
          if (chunkJson.content) {
            let botText = '';
            for (let part of chunkJson.content.parts) {
              if (part.text) {
                botText += part.text;
              }
            }
            if (botText) {
              // Update the last message (remove loading, add text)
              const lastMessage = this.messages[this.messages.length - 1];
              if (lastMessage.role === 'bot' && lastMessage.isLoading) {
                lastMessage.text = botText;
                lastMessage.isLoading = false;
                this.shouldAutoScroll = true;
                this.reloadCanvas.emit();
              }
            }
          }
        },
        error: (err) => {
          console.error('SSE error:', err);
          // Update loading message with error
          const lastMessage = this.messages[this.messages.length - 1];
          if (lastMessage.role === 'bot' && lastMessage.isLoading) {
            lastMessage.text = 'Sorry, I encountered an error. Please try again.';
            lastMessage.isLoading = false;
            this.shouldAutoScroll = true;
          }
        },
        complete: () => {
        },
      });
    }
  }

  ngAfterViewChecked() {
    if (this.shouldAutoScroll) {
      this.scrollToBottom();
      this.shouldAutoScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.chatMessages) {
        // Use setTimeout to ensure content is fully rendered (especially markdown)
        setTimeout(() => {
          this.chatMessages.nativeElement.scrollTop = this.chatMessages.nativeElement.scrollHeight;
        }, 50);
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        // Shift+Enter: Allow new line (default behavior)
        return;
      } else {
        // Enter only: Send message
        event.preventDefault();
        this.sendMessage();
      }
    }
  }


  private saveAgent(appName: string) {
    const rootAgent = this.agentBuilderService.getRootNode();

    if (!rootAgent) {
      return;
    }

    const formData = new FormData();

    const tabAgents = this.agentBuilderService.getCurrentAgentToolBoards();

    YamlUtils.generateYamlFile(rootAgent, formData, appName, tabAgents);

    this.agentService.agentBuildTmp(formData).subscribe((success) => {
      if (success) {
        console.log("save to tmp")
      } else {
        console.log("something went wrong");
      }
    });
  }
}
