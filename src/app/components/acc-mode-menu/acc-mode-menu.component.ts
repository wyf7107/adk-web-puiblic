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

import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';

import {AccMode} from '../left-nav/left-nav.component';

/** The modes, in the menu's order: who the person is, and what they get. */
export const ACC_MODES: ReadonlyArray<{id: AccMode, label: string, description: string}> = [
  {
    id: 'builder',
    label: 'Builder',
    description: 'Build, evaluate and ship your agents',
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Watch the fleet: health, cost, quality and governance',
  },
];

/**
 * The top bar's mode switch, in the Luminous style: the mode's name with a
 * caret, no fill or border at rest, opening a menu of the two modes (the
 * name over what that mode is for), the current one checked.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-acc-mode-menu',
  templateUrl: './acc-mode-menu.component.html',
  styleUrl: './acc-mode-menu.component.scss',
  standalone: true,
  imports: [MatIconModule, MatMenuModule],
})
export class AccModeMenuComponent {
  readonly mode = input<AccMode>('builder');
  /** A different mode was picked. */
  readonly modeChange = output<AccMode>();

  readonly modes = ACC_MODES;
  readonly label = computed(
      () => ACC_MODES.find((m) => m.id === this.mode())?.label ?? '');

  pick(mode: AccMode): void {
    if (mode !== this.mode()) {
      this.modeChange.emit(mode);
    }
  }
}
