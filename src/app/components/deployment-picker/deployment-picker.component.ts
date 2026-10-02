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

import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';

import {Deployment} from '../../core/models/Deploy';

const TARGET_LABELS: Record<string, string> = {
  'agent_engine': 'Agent Runtime',
  'cloud_run': 'Cloud Run',
  'gke': 'GKE',
};

const TARGET_ICONS: Record<string, string> = {
  'agent_engine': 'hub',
  'cloud_run': 'deployed_code',
};

export function deploymentName(deployment: Deployment): string {
  return deployment.displayName ||
      deployment.resourceName.split('/').pop() || deployment.resourceName;
}

/**
 * The end of an Agent Runtime's instance id, to tell same-named runtimes
 * apart. Cloud Run services are already unique by name.
 */
export function deploymentShortId(deployment: Deployment): string {
  if (deployment.target !== 'agent_engine') {
    return '';
  }
  const id = deployment.resourceName.split('/').pop() ?? '';
  return id.length > 6 ? `…${id.slice(-6)}` : id;
}

export function targetLabel(deployment: Deployment): string {
  return TARGET_LABELS[deployment.target] ?? deployment.target;
}

export function targetIcon(deployment: Deployment): string {
  return TARGET_ICONS[deployment.target] ?? 'cloud';
}

/**
 * "Reading from <deployment> · Change": picks one of the connected project's
 * deployments, this agent's listed first.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-deployment-picker',
  templateUrl: './deployment-picker.component.html',
  styleUrl: './deployment-picker.component.scss',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule],
})
export class DeploymentPickerComponent {
  /** E.g. "Reading sessions from". */
  readonly label = input('');
  readonly deployments = input<Deployment[]>([]);
  readonly selectedId = input<string|null>(null);
  /** Extra text for a menu option, e.g. a limitation of its target. */
  readonly optionNote = input<(deployment: Deployment) => string>(() => '');
  /** Shows "N deployments available"; off where space is short. */
  readonly showCount = input(true);
  readonly selectedChange = output<Deployment>();

  readonly mine = computed(() => this.deployments().filter((d) => d.matchesApp));
  readonly others =
      computed(() => this.deployments().filter((d) => !d.matchesApp));
  readonly selected = computed(
      () => this.deployments().find((d) => d.id === this.selectedId()) ?? null);

  protected readonly name = deploymentName;
  protected readonly shortId = deploymentShortId;
  protected readonly targetLabel = targetLabel;
  protected readonly targetIcon = targetIcon;

  select(deployment: Deployment): void {
    if (deployment.id !== this.selectedId()) {
      this.selectedChange.emit(deployment);
    }
  }
}
