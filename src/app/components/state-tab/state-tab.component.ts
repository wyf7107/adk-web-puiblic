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

import {ChangeDetectionStrategy, Component, inject, Input} from '@angular/core';
import {NgxJsonViewerModule} from 'ngx-json-viewer';

import type {SessionState} from '../../core/models/Session';

import {StateTabMessagesInjectionToken} from './state-tab.component.i18n';

/** Component to display contents of a SessionState. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-state-tab',
  templateUrl: './state-tab.component.html',
  styleUrl: './state-tab.component.scss',
  imports: [NgxJsonViewerModule],
  standalone: true,
})
export class StateTabComponent {
  @Input() sessionState: SessionState|undefined;
  protected readonly i18n = inject(StateTabMessagesInjectionToken);

  get isEmptyState() {
    return !this.sessionState || Object.keys(this.sessionState).length === 0;
  }
}
