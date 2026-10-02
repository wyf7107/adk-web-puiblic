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

import {ChangeDetectionStrategy, Component, computed, inject, input, output, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';

import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';

/** A top-level view the app can show in its main area. */
export type AppView = 'build'|'deployments'|'sessions'|'logs'|'monitoring';

/** One entry in the left navigation. */
export interface NavItem {
  label: string;
  icon: string;
  /** The view this entry opens. Absent for entries that are not built yet. */
  view?: AppView;
  /** Needs a connection to a cloud project. */
  cloud?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Everything the dev UI has today lives under Build. The entries without a
 * view sketch where the command center is heading and are shown disabled.
 */
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: 'Build',
    items: [{label: 'Playground', icon: 'forum', view: 'build'}],
  },
  {
    title: 'Evaluate',
    items: [
      {label: 'Eval runs', icon: 'fact_check'},
      {label: 'Datasets', icon: 'dataset'},
    ],
  },
  {
    title: 'Ship',
    items: [{
      label: 'Deployments',
      icon: 'rocket_launch',
      view: 'deployments',
      cloud: true,
    }],
  },
  {
    title: 'Operate',
    items: [
      {
        label: 'Sessions',
        icon: 'question_answer',
        view: 'sessions',
        cloud: true,
      },
      {label: 'Logs', icon: 'receipt_long', view: 'logs', cloud: true},
      {label: 'Monitoring', icon: 'monitoring', view: 'monitoring', cloud: true},
    ],
  },
];

/** Views that need a cloud connection, derived from the entries above. */
export const CLOUD_VIEWS: ReadonlySet<AppView> = new Set(
    NAV_SECTIONS.flatMap((s) => s.items)
        .filter((item) => item.cloud && item.view)
        .map((item) => item.view!));

/** The command center's section navigation, shown left of the main area. */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-left-nav',
  templateUrl: './left-nav.component.html',
  styleUrl: './left-nav.component.scss',
  standalone: true,
  imports: [MatIconModule],
})
export class LeftNavComponent {
  readonly activeView = input<AppView>('build');
  readonly navigate = output<AppView>();
  /** The connection footer was clicked. */
  readonly manageCloud = output<void>();

  readonly sections = NAV_SECTIONS;
  readonly cloudStatus = inject(CLOUD_SERVICE).status;
  /** The status lookup failed, e.g. a server without cloud support. */
  private readonly checkFailed = signal(false);

  readonly checking = computed(() => !this.cloudStatus() && !this.checkFailed());
  /** Known to be disconnected; not while still checking. */
  readonly disconnected =
      computed(() => !this.checking() && !this.cloudStatus()?.connected);

  constructor() {
    // The footer shows the connection, so make sure it is known.
    inject(CLOUD_SERVICE).refreshStatus().subscribe({
      error: () => this.checkFailed.set(true),
    });
  }

  select(item: NavItem): void {
    if (!item.view) {
      return;
    }
    // A cloud entry while disconnected re-emits even when already active, so
    // the host can prompt to connect again.
    if (item.view !== this.activeView() || (item.cloud && this.disconnected())) {
      this.navigate.emit(item.view);
    }
  }
}
