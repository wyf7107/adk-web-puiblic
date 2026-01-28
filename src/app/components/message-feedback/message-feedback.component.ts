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

import {CommonModule} from '@angular/common';
import {Component, computed, inject, input, signal} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';

import {Feedback, FEEDBACK_SERVICE} from '../../core/services/interfaces/feedback';

import {MessageFeedbackMessagesInjectionToken} from './message-feedback.component.i18n';

@Component({
  selector: 'app-message-feedback',
  templateUrl: './message-feedback.component.html',
  styleUrl: './message-feedback.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
  ],
})
export class MessageFeedbackComponent {
  sessionName = input.required<string>();
  eventId = input.required<string>();

  protected readonly i18n = inject(MessageFeedbackMessagesInjectionToken);
  private readonly feedbackService = inject(FEEDBACK_SERVICE);

  private readonly existingFeedback = rxResource({
    params: () => ({
      sessionName: this.sessionName(),
      eventId: this.eventId(),
    }),
    stream: ({params}) =>
        this.feedbackService.getFeedback(params.sessionName, params.eventId)
  });
  private readonly selectedFeedbackDirection =
      signal<Feedback['direction']|undefined>(undefined);

  readonly feedbackDirection = computed(
      () => this.selectedFeedbackDirection() ??
          this.existingFeedback.value()?.direction);
  readonly isDetailedFeedbackVisible = signal(false);
  readonly feedbackPlaceholder = computed(() => {
    return this.feedbackDirection() === 'up' ?
        this.i18n.feedbackCommentPlaceholderUp :
        this.i18n.feedbackCommentPlaceholderDown;
  });
  readonly isLoading = signal(false);
  readonly comment = new FormControl('');

  sendFeedback(direction: Feedback['direction']) {
    if (this.feedbackDirection() === direction) {
      this.isLoading.set(true);
      this.feedbackService.deleteFeedback(this.sessionName(), this.eventId())
          .subscribe(() => {
            this.isLoading.set(false);
            this.selectedFeedbackDirection.set(undefined);
            this.resetDetailedFeedback();
          });
    } else {
      this.isDetailedFeedbackVisible.set(true);
      this.selectedFeedbackDirection.set(direction);
    }
  }

  onDetailedFeedbackSubmitted() {
    const direction = this.feedbackDirection();
    if (!direction) return;

    this.isLoading.set(true);
    this.feedbackService
        .sendFeedback(this.sessionName(), this.eventId(), {
          direction,
          comment: this.comment.value ?? undefined,
        })
        .subscribe(() => {
          this.isLoading.set(false);
          this.resetDetailedFeedback();
        });
  }

  onDetailedFeedbackCancelled() {
    this.selectedFeedbackDirection.set(undefined);
    this.resetDetailedFeedback();
  }

  private resetDetailedFeedback() {
    this.isDetailedFeedbackVisible.set(false);
    this.comment.reset();
  }
}
