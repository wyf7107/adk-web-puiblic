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
export type AppView =
    'build'|'deployments'|'sessions'|'logs'|'monitoring'|'fleet-health';

/**
 * Who the command center is serving, picked in the top bar's mode menu.
 * In the classic design a Builder gets just the Playground, and a Manager
 * gets every other page (shipping, operating, quality and governance) in the
 * left nav. The Luminous design has modes of its own.
 */
export type AccMode = 'builder'|'manager';

/** The page each mode opens on. */
export const ACC_MODE_LANDING: Readonly<Record<AccMode, AppView>> = {
  builder: 'build',
  manager: 'fleet-health',
};

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
  /** Empty for a leading group with no title (the fleet's home pages). */
  title: string;
  items: NavItem[];
}

/**
 * Manager's nav: the fleet, then the dev UI's pages past the Playground in
 * their stages, joined by the command center's fleet pages. The entries
 * without a view sketch where the command center is heading and are shown
 * disabled ("Soon").
 */
export const MANAGER_NAV_SECTIONS: readonly NavSection[] = [
  {
    title: '',
    items: [
      {label: 'Fleet health', icon: 'dashboard', view: 'fleet-health'},
      {label: 'Fleet', icon: 'grid_view'},
    ],
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
      {label: 'Sessions', icon: 'chat_bubble', view: 'sessions', cloud: true},
      {label: 'Logs', icon: 'article', view: 'logs', cloud: true},
      {label: 'Monitoring', icon: 'monitoring', view: 'monitoring', cloud: true},
      {label: 'Alerts', icon: 'notifications'},
      {label: 'Production health', icon: 'ecg_heart'},
      {label: 'Cost and budgets', icon: 'attach_money'},
    ],
  },
  {
    title: 'Quality',
    items: [
      {label: 'Eval trends', icon: 'trending_up'},
      {label: 'Eval coverage', icon: 'task_alt'},
    ],
  },
  {
    title: 'Govern',
    items: [
      {label: 'Policy', icon: 'policy'},
      {label: 'Gates', icon: 'checklist'},
      {label: 'Agent Gateway', icon: 'router'},
      {label: 'Agent Identity', icon: 'badge'},
      {label: 'Agent Registry', icon: 'travel_explore'},
      {label: 'Audit log', icon: 'receipt_long'},
    ],
  },
  {
    title: 'Extensions',
    items: [{label: 'Extension adoption', icon: 'extension'}],
  },
];

/**
 * The pages that belong to Manager: all but the Playground. Opening the
 * Playground (from a "Back to Playground" link, say) means building again.
 */
export const MANAGER_VIEWS: ReadonlySet<AppView> = new Set(
    MANAGER_NAV_SECTIONS.flatMap((s) => s.items)
        .filter((item) => item.view)
        .map((item) => item.view!));

/** Views that need a cloud connection, derived from the entries above. */
export const CLOUD_VIEWS: ReadonlySet<AppView> = new Set(
    MANAGER_NAV_SECTIONS.flatMap((s) => s.items)
        .filter((item) => item.cloud && item.view)
        .map((item) => item.view!));

/**
 * The command center's section navigation, shown left of the main area in
 * the classic design's Manager mode (Builder is the Playground alone).
 */
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

  readonly sections = MANAGER_NAV_SECTIONS;
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
