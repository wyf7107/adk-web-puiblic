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

import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

import {Deployment} from '../../core/models/Deploy';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {DEPLOY_SERVICE} from '../../core/services/interfaces/deploy';
import {deploymentName, DeploymentPickerComponent, targetLabel} from '../deployment-picker/deployment-picker.component';

export interface TryDeployedDialogData {
  appName: string;
  /** Preselects this deployment, e.g. when opened from its card. */
  deploymentId?: string;
  /** The user ID last used, to keep it. */
  userId?: string;
}

/** A deployed agent the Playground talks to instead of the local one. */
export interface DeployedTarget {
  appName: string;
  deployment: Deployment;
  /** Whom the deployed agent's sessions are stored under. */
  userId: string;
}

/** Whether the dev UI can send messages to a deployment. */
export function isTryable(deployment: Deployment): boolean {
  return deployment.target === 'agent_engine' ||
      (deployment.target === 'cloud_run' && !!deployment.serviceUrl);
}

/**
 * Explains what talking to a deployed agent means, picks the deployment and
 * the user ID to talk as, and returns a `DeployedTarget` once confirmed.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-try-deployed-dialog',
  templateUrl: './try-deployed-dialog.component.html',
  styleUrl: './try-deployed-dialog.component.scss',
  standalone: true,
  imports: [
    DeploymentPickerComponent,
    FormsModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
})
export class TryDeployedDialogComponent {
  private readonly cloudService = inject(CLOUD_SERVICE);
  private readonly deployService = inject(DEPLOY_SERVICE);
  private readonly dialogRef =
      inject(MatDialogRef<TryDeployedDialogComponent, DeployedTarget>);
  readonly data = inject<TryDeployedDialogData>(MAT_DIALOG_DATA);

  readonly status = this.cloudService.status;
  readonly deployments = signal<Deployment[]|null>(null);
  readonly error = signal('');
  readonly selectedId = signal<string|null>(null);
  readonly selected = computed(
      () => this.deployments()?.find((d) => d.id === this.selectedId()) ??
          null);
  userId = this.data.userId || defaultUserId(this.status()?.account);

  protected readonly name = deploymentName;
  protected readonly targetLabel = targetLabel;

  constructor() {
    const subscription =
        this.deployService.listDeployments(this.data.appName).subscribe({
          next: (response) => {
            const tryable = response.deployments.filter(isTryable);
            this.deployments.set(tryable);
            const preferred =
                tryable.find((d) => d.id === this.data.deploymentId) ??
                tryable.find((d) => d.matchesApp);
            this.selectedId.set(preferred?.id ?? null);
          },
          error: (err) => {
            this.deployments.set([]);
            this.error.set(
                err?.error?.detail ?? err?.message ??
                'Could not look up deployments.');
          },
        });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  select(deployment: Deployment): void {
    this.selectedId.set(deployment.id);
  }

  canStart(): boolean {
    const user = this.userId.trim();
    return !!this.selected() && !!user && user.length <= 128;
  }

  start(): void {
    const deployment = this.selected();
    if (!deployment || !this.canStart()) {
      return;
    }
    this.dialogRef.close(
        {appName: this.data.appName, deployment, userId: this.userId.trim()});
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

/** "adk-web-<name>" from the signed-in account, so test traffic is easy to spot. */
export function defaultUserId(account?: string|null): string {
  const name = (account ?? '').split('@')[0].replace(/[^A-Za-z0-9._-]/g, '');
  return name ? `adk-web-${name}` : 'adk-web-dev';
}
