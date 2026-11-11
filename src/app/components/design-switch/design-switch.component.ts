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

/**
 * The command center's design: the classic dev UI, or Luminous (the command
 * center's new design, a full app of its own).
 */
export type AccDesign = 'classic'|'luminous';

/** The switch's choices, in display order. */
export const ACC_DESIGNS: ReadonlyArray<{value: AccDesign, label: string}> = [
  {value: 'classic', label: 'Classic'},
  {value: 'luminous', label: 'Luminous'},
];

/**
 * The top bar's Classic | Luminous switch: a small segmented control, the
 * current design raised on a sunken track.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-design-switch',
  templateUrl: './design-switch.component.html',
  styleUrl: './design-switch.component.scss',
  standalone: true,
})
export class DesignSwitchComponent {
  readonly design = input<AccDesign>('classic');
  /** A different design was picked. */
  readonly designChange = output<AccDesign>();

  readonly designs = ACC_DESIGNS;

  pick(design: AccDesign): void {
    if (design !== this.design()) {
      this.designChange.emit(design);
    }
  }
}
