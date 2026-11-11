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

import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';

import {MANAGER_NAV_SECTIONS, NavItem} from '../left-nav/left-nav.component';

/**
 * Manager mode's landing page. A placeholder for now: the Manager pages need
 * fleet-wide data (health, alerts, cost, eval trends, governance) that the
 * backend doesn't serve yet. It says what is coming, from the Manager nav.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-fleet-health',
  templateUrl: './fleet-health.component.html',
  styleUrl: './fleet-health.component.scss',
  standalone: true,
  imports: [MatIconModule],
})
export class FleetHealthComponent {
  /** The Manager pages still to come, as the nav lists them. */
  readonly upcoming: readonly NavItem[] =
      MANAGER_NAV_SECTIONS.flatMap((s) => s.items).filter((item) => !item.view);
}
