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
import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {interval, Subscription, timer} from 'rxjs';

import {DeployHistoryEntry, Deployment, DeploymentLive, DeploymentRevision, DeploymentsResponse, DeployTarget, DiscoveryError} from '../../core/models/Deploy';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {DEPLOY_SERVICE} from '../../core/services/interfaces/deploy';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';
import {CloudConnectDialogComponent} from '../cloud-connect-dialog/cloud-connect-dialog.component';
import {DeployDialogComponent} from '../deploy-dialog/deploy-dialog.component';
import {isTryable} from '../try-deployed-dialog/try-deployed-dialog.component';

/** How often to look again while a deploy is still running. */
const IN_PROGRESS_POLL_MS = 10_000;
/** How often "Updated 12s ago" is recomputed. */
const CLOCK_TICK_MS = 5_000;

const TARGET_LABELS: Record<DeployTarget, string> = {
  'agent_engine': 'Agent Runtime',
  'cloud_run': 'Cloud Run',
  'gke': 'GKE',
};

const TARGET_ICONS: Record<DeployTarget, string> = {
  'agent_engine': 'hub',
  'cloud_run': 'deployed_code',
  'gke': 'lan',
};

/** IAM role that grants listing, for the permission hint. */
const VIEWER_ROLES: Record<DeployTarget, string> = {
  'agent_engine': 'Vertex AI Viewer',
  'cloud_run': 'Cloud Run Viewer',
  'gke': 'Kubernetes Engine Viewer',
};

interface MatchChip {
  label: string;
  icon: string;
}

const MATCH_CHIPS: Record<string, MatchChip> = {
  'history': {label: 'Deployed from adk web', icon: 'terminal'},
  'label': {label: 'Labeled for this agent', icon: 'label'},
  'name': {label: 'Named after this agent', icon: 'match_case'},
};

/** A live lookup that has not answered yet. */
type LiveEntry = DeploymentLive|'loading';

/** What a deployment's status chip shows. */
export type StatusKind = 'live'|'updating'|'unhealthy'|'deleted';

export interface StatusChip {
  kind: StatusKind;
  label: string;
  icon?: string;
  detail?: string;
}

/** A lookup error with a hint on how to fix it. */
export interface ErrorRow {
  scope: string;
  message: string;
  hint: string;
}

/** A slice of the traffic split bar. */
export interface TrafficSegment {
  name: string;
  percent: number;
  latest: boolean;
}

/** Formats an ISO timestamp as "5 minutes ago", relative to `now`. */
export function relativeTime(iso: string|null|undefined, now = Date.now()):
    string {
  if (!iso) {
    return '';
  }
  const then = Date.parse(iso);
  if (isNaN(then)) {
    return '';
  }
  const seconds = Math.round((now - then) / 1000);
  if (seconds < 45) {
    return 'just now';
  }
  const units: Array<[number, string]> = [
    [60, 'minute'],
    [60 * 60, 'hour'],
    [60 * 60 * 24, 'day'],
    [60 * 60 * 24 * 30, 'month'],
    [60 * 60 * 24 * 365, 'year'],
  ];
  let [size, unit] = units[0];
  for (const candidate of units) {
    if (seconds >= candidate[0]) {
      [size, unit] = candidate;
    }
  }
  const count = Math.max(1, Math.round(seconds / size));
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
}

/** "Sep 12", or "Sep 12, 2024" outside the current year. */
export function shortDate(iso: string|null|undefined, now = Date.now()):
    string {
  const then = iso ? new Date(iso) : null;
  if (!then || isNaN(then.getTime())) {
    return '';
  }
  const sameYear = then.getFullYear() === new Date(now).getFullYear();
  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : {year: 'numeric'}),
  });
}

/** "Today, 10:42" or "Sep 30, 17:48". */
export function startedAt(iso: string|null|undefined, now = Date.now()):
    string {
  const then = iso ? new Date(iso) : null;
  if (!then || isNaN(then.getTime())) {
    return '';
  }
  const time = then.toLocaleTimeString(
      'en-US', {hour: '2-digit', minute: '2-digit', hour12: false});
  const today = new Date(now).toDateString() === then.toDateString();
  return `${today ? 'Today' : shortDate(iso, now)}, ${time}`;
}

/** "3m 12s", "22s", or "1h 4m". */
export function duration(
    startIso: string|null|undefined, endIso: string|null|undefined): string {
  const start = startIso ? Date.parse(startIso) : NaN;
  const end = endIso ? Date.parse(endIso) : NaN;
  if (isNaN(start) || isNaN(end) || end < start) {
    return '';
  }
  const total = Math.round((end - start) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) {
    return `${h}h ${m}m`;
  }
  return m ? `${m}m ${s}s` : `${s}s`;
}

/** Turns a raw lookup error into something a developer can act on. */
export function describeLookupError(error: DiscoveryError): ErrorRow {
  const target = TARGET_LABELS[error.target] ?? error.target;
  const scope = `${target} · ${error.region}`;
  const text = error.message.toLowerCase();
  let hint = 'Retry, or check the project in the Cloud console.';
  if (text.includes('has not been used') || text.includes('is disabled') ||
      text.includes('not enabled')) {
    hint = 'Enable the API in this project, wait a minute, then retry.';
  } else if (text.includes('permission') || text.includes('denied')) {
    hint = `Your account needs ${VIEWER_ROLES[error.target]} (or broader) ` +
        `on this project.`;
  } else if (text.includes('expired') || text.includes('credentials')) {
    hint = 'Sign in again from the cloud connection.';
  }
  return {scope, message: error.message, hint};
}

/**
 * The Ship > Deployments page: what is deployed in the connected cloud
 * project, with the selected agent's own deployments first.
 *
 * Needs a cloud connection; without one it offers to connect instead.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-deployments',
  templateUrl: './deployments.component.html',
  styleUrl: './deployments.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
})
export class DeploymentsComponent {
  private readonly deployService = inject(DEPLOY_SERVICE);
  private readonly cloudService = inject(CLOUD_SERVICE);
  private readonly safeValuesService = inject(SAFE_VALUES_SERVICE);
  private readonly dialog = inject(MatDialog);

  readonly appName = input<string>('');
  /** "Back to Playground" was clicked. */
  readonly backToPlayground = output<void>();
  /** "Try it" was clicked: talk to this deployment from the Playground. */
  readonly tryDeployment = output<Deployment>();
  protected readonly isTryable = isTryable;

  readonly status = this.cloudService.status;
  readonly connected = computed(() => !!this.status()?.connected);
  /** The status lookup failed outright, e.g. no cloud support on the server. */
  readonly statusFailed = signal(false);
  readonly checking = computed(() => !this.status() && !this.statusFailed());

  readonly data = signal<DeploymentsResponse|null>(null);
  readonly loading = signal<boolean>(false);
  readonly loadError = signal<string>('');
  readonly lastUpdated = signal<number|null>(null);
  readonly live = signal<Record<string, LiveEntry>>({});
  readonly expanded = signal<ReadonlySet<string>>(new Set());
  readonly othersCollapsed = signal(false);
  readonly activityCollapsed = signal(false);
  /** Ticks so relative times stay current. */
  private readonly now = signal(Date.now());

  readonly firstLoad = computed(() => this.loading() && !this.data());
  readonly refreshing = computed(() => this.loading() && !!this.data());
  readonly mine = computed(
      () => (this.data()?.deployments ?? []).filter((d) => d.matchesApp));
  readonly others = computed(
      () => (this.data()?.deployments ?? []).filter((d) => !d.matchesApp));
  readonly history = computed(() => this.data()?.history ?? []);
  readonly errorRows =
      computed(() => (this.data()?.errors ?? []).map(describeLookupError));
  readonly updatedText = computed(() => {
    const at = this.lastUpdated();
    if (this.refreshing()) {
      return 'Refreshing…';
    }
    if (!at) {
      return '';
    }
    const seconds = Math.max(0, Math.round((this.now() - at) / 1000));
    return seconds < 60 ? `Updated ${seconds}s ago` :
                          `Updated ${relativeTime(new Date(at).toISOString(),
                                                  this.now())}`;
  });

  private readonly subscriptions = new Subscription();
  private pollSubscription?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.subscriptions.unsubscribe();
      this.pollSubscription?.unsubscribe();
    });
    this.subscriptions.add(
        interval(CLOCK_TICK_MS).subscribe(() => this.now.set(Date.now())));
    if (!this.status()) {
      this.subscriptions.add(this.cloudService.refreshStatus().subscribe({
        error: () => this.statusFailed.set(true),
      }));
    }
    // Starts over for another app, another project, or a lost connection --
    // but not when a status refresh returns the same connection.
    const scope = computed(() => {
      const status = this.status();
      return status?.connected && this.appName() ?
          `${this.appName()}|${status.project}|${status.region}` :
          '';
    });
    effect(() => {
      const current = scope();
      untracked(() => {
        this.data.set(null);
        this.live.set({});
        this.expanded.set(new Set());
        this.loadError.set('');
        this.lastUpdated.set(null);
        this.schedulePoll(false);
        if (current) {
          this.refresh();
        }
      });
    });
  }

  targetLabel(target: DeployTarget): string {
    return TARGET_LABELS[target] ?? target;
  }

  targetIcon(target: DeployTarget): string {
    return TARGET_ICONS[target] ?? 'cloud';
  }

  matchChip(deployment: Deployment): MatchChip|null {
    return MATCH_CHIPS[deployment.matchReason ?? ''] ?? null;
  }

  /** The name a person would recognize the deployment by. */
  deploymentName(item: Deployment|DeployHistoryEntry): string {
    return item.displayName || ('serviceName' in item && item.serviceName) ||
        item.resourceName?.split('/').pop() || this.appName();
  }

  /** The short locator shown in mono: the URL, or the resource's own id. */
  locator(deployment: Deployment): string {
    if (deployment.serviceUrl) {
      return deployment.serviceUrl;
    }
    const parts = deployment.resourceName.split('/');
    return parts.length >= 2 ? parts.slice(-2).join('/') :
                               deployment.resourceName;
  }

  relativeTime(iso: string|null|undefined): string {
    return relativeTime(iso, this.now());
  }

  shortDate(iso: string|null|undefined): string {
    return shortDate(iso, this.now());
  }

  startedAt(iso: string|null|undefined): string {
    return startedAt(iso, this.now());
  }

  duration(entry: DeployHistoryEntry): string {
    return duration(entry.startedAt, entry.finishedAt);
  }

  liveOf(deployment: Deployment): LiveEntry|undefined {
    return this.live()[deployment.id];
  }

  /** From the live lookup once there is one, else from the listing. */
  statusChip(deployment: Deployment): StatusChip|null {
    const live = this.liveOf(deployment);
    const fresh = live && live !== 'loading' ? live : null;
    const state = fresh ? fresh.state : deployment.state;
    switch (state) {
      case 'ready':
        return {kind: 'live', label: 'Live'};
      case 'updating':
        return {kind: 'updating', label: 'Updating', icon: 'progress_activity'};
      case 'failed':
        return {
          kind: 'unhealthy',
          label: 'Unhealthy',
          icon: 'error',
          detail: fresh?.error ?? '',
        };
      case 'not_found':
        return {
          kind: 'deleted',
          label: 'Deleted',
          icon: 'delete',
          detail: fresh?.error ?? '',
        };
      default:
        return null;
    }
  }

  historyOf(deployment: Deployment): DeployHistoryEntry[] {
    return this.history().filter((e) => e.deploymentId === deployment.id);
  }

  /** The latest deploy of it from adk web, when that one failed. */
  lastFailedDeploy(deployment: Deployment): DeployHistoryEntry|null {
    if (deployment.lastDeployStatus !== 'failed') {
      return null;
    }
    return this.historyOf(deployment)[0] ?? null;
  }

  trafficSegments(revisions: DeploymentRevision[], latest?: string|null):
      TrafficSegment[] {
    return revisions.filter((r) => r.trafficPercent > 0)
        .map((r) => ({
               name: r.name,
               percent: r.trafficPercent,
               latest: r.name === latest,
             }));
  }

  trafficSummary(revisions: DeploymentRevision[]): string {
    return revisions.filter((r) => r.trafficPercent > 0)
        .map((r) => r.trafficPercent)
        .join(' / ');
  }

  isExpanded(deployment: Deployment): boolean {
    return this.expanded().has(deployment.id);
  }

  /** Expands a card, fetching its revisions the first time. */
  toggle(deployment: Deployment): void {
    const next = new Set(this.expanded());
    if (!next.delete(deployment.id)) {
      next.add(deployment.id);
      if (!this.liveOf(deployment)) {
        this.loadLive(this.appName(), deployment);
      }
    }
    this.expanded.set(next);
  }

  connect(): void {
    this.dialog.open(CloudConnectDialogComponent, {maxWidth: '90vw'});
  }

  refresh(): void {
    const appName = this.appName();
    if (!appName || !this.connected()) {
      return;
    }
    this.loading.set(true);
    this.loadError.set('');
    this.subscriptions.add(
        this.deployService.listDeployments(appName).subscribe({
          next: (response) => {
            if (appName !== this.appName()) {
              return;  // The user moved on to another app meanwhile.
            }
            this.data.set(response);
            this.loading.set(false);
            this.lastUpdated.set(Date.now());
            this.now.set(Date.now());
            this.live.set({});
            for (const deployment of response.deployments) {
              if (this.isExpanded(deployment)) {
                this.loadLive(appName, deployment);
              }
            }
            this.schedulePoll(response.deployInProgress);
          },
          error: (err) => {
            if (appName !== this.appName()) {
              return;
            }
            this.loading.set(false);
            if (err?.status === 409) {
              // The connection went away on the server; resync.
              this.cloudService.refreshStatus().subscribe({error: () => {}});
              return;
            }
            this.loadError.set(
                err?.status === 404 ?
                    'Deployments are only available on a local `adk web` ' +
                        'server.' :
                    (err?.error?.detail ?? err?.message ??
                     'Could not load deployments.'));
          },
        }));
  }

  /** Opens the deploy dialog, and refreshes once it closes. */
  newDeploy(): void {
    const ref = this.dialog.open(DeployDialogComponent, {
      maxWidth: '90vw',
      data: {appName: this.appName()},
    });
    this.subscriptions.add(ref.afterClosed().subscribe(() => this.refresh()));
  }

  open(url: string|null|undefined): void {
    if (url) {
      this.safeValuesService.windowOpen(window, url, '_blank', 'noopener');
    }
  }

  copy(text: string|null|undefined): void {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  }

  private loadLive(appName: string, deployment: Deployment): void {
    this.setLive(appName, deployment.id, 'loading');
    this.subscriptions.add(
        this.deployService.getDeploymentLive(appName, deployment.id)
            .subscribe({
              next: (live) => this.setLive(appName, deployment.id, live),
              error: (err) => this.setLive(appName, deployment.id, {
                supported: true,
                revisions: [],
                error: err?.error?.detail ?? err?.message ??
                    'Could not reach the server.',
              }),
            }));
  }

  private setLive(appName: string, id: string, live: LiveEntry): void {
    if (appName === this.appName()) {
      this.live.update((current) => ({...current, [id]: live}));
    }
  }

  /** Keeps looking again until a running deploy has finished. */
  private schedulePoll(deployInProgress: boolean): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = undefined;
    if (deployInProgress) {
      this.pollSubscription =
          timer(IN_PROGRESS_POLL_MS).subscribe(() => this.refresh());
    }
  }
}
