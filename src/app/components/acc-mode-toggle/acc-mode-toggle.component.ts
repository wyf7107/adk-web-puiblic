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

import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatTooltipModule} from '@angular/material/tooltip';

import {AccMode} from '../left-nav/left-nav.component';

/** The modes, in the toggle's order: the label, and what that mode is for. */
export const ACC_MODES: ReadonlyArray<{id: AccMode, label: string, description: string}> = [
  {
    id: 'builder',
    label: 'Build',
    description: 'Build, evaluate and ship your agents',
  },
  {
    id: 'manager',
    label: 'Manage',
    description: 'Watch the fleet: health, cost, quality and governance',
  },
];

/**
 * The classic top bar's Build | Manage toggle: the same segmented toggle as
 * the chat's Events | Traces (a sunken pill track, the current mode raised).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-acc-mode-toggle',
  templateUrl: './acc-mode-toggle.component.html',
  styleUrl: './acc-mode-toggle.component.scss',
  standalone: true,
  imports: [MatButtonToggleModule, MatTooltipModule],
})
export class AccModeToggleComponent {
  readonly mode = input<AccMode>('builder');
  /** A different mode was picked. */
  readonly modeChange = output<AccMode>();

  readonly modes = ACC_MODES;

  pick(mode: AccMode): void {
    if (mode !== this.mode()) {
      this.modeChange.emit(mode);
    }
  }
}
