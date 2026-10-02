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
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {interval, Subscription} from 'rxjs';

import {LogEntry, LogsQuery} from '../../core/models/Cloud';
import {Deployment} from '../../core/models/Deploy';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {DEPLOY_SERVICE} from '../../core/services/interfaces/deploy';
import {CloudConnectDialogComponent} from '../cloud-connect-dialog/cloud-connect-dialog.component';
import {DeploymentPickerComponent} from '../deployment-picker/deployment-picker.component';
import {relativeTime} from '../deployments/deployments.component';

/** How often "Updated 12s ago" is recomputed. */
const CLOCK_TICK_MS = 5_000;
/** How often live mode asks for new entries. */
const LIVE_POLL_MS = 5_000;
/**
 * Live mode re-reads this far back from the newest entry shown: Cloud Logging
 * can take a few seconds to make an entry readable, so one stamped just
 * before the newest might not have been listed yet.
 */
const LIVE_OVERLAP_MS = 15_000;
/** Oldest entries are dropped past this, so a long live tail stays fast. */
const MAX_ENTRIES = 1_000;

export interface TimeRange {
  id: string;
  label: string;
  ms: number;
}

export const TIME_RANGES: TimeRange[] = [
  {id: '15m', label: 'Last 15 minutes', ms: 15 * 60_000},
  {id: '1h', label: 'Last hour', ms: 60 * 60_000},
  {id: '6h', label: 'Last 6 hours', ms: 6 * 60 * 60_000},
  {id: '1d', label: 'Last 24 hours', ms: 24 * 60 * 60_000},
  {id: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60_000},
];

/** Minimum severities to filter by; '' shows everything. */
export const SEVERITY_FILTERS = [
  {id: '', label: 'All'},
  {id: 'INFO', label: 'Info'},
  {id: 'WARNING', label: 'Warning'},
  {id: 'ERROR', label: 'Error'},
];

export type SeverityLevel = 'debug'|'info'|'warning'|'error';

/** Groups Cloud Logging's nine severities into the four shown. */
export function severityLevel(severity: string): SeverityLevel {
  switch (severity) {
    case 'INFO':
    case 'NOTICE':
      return 'info';
    case 'WARNING':
      return 'warning';
    case 'ERROR':
    case 'CRITICAL':
    case 'ALERT':
    case 'EMERGENCY':
      return 'error';
    default:
      return 'debug';
  }
}

/** Local time with milliseconds; the date too when it is not today. */
export function formatLogTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return iso;
  }
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${
      pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  if (date.toDateString() === now.toDateString()) {
    return time;
  }
  const day = date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
  return `${day} ${time}`;
}

function entryKey(entry: LogEntry): string {
  return `${entry.id}|${entry.timestamp}`;
}

/** Merges entries newest first, without duplicates. */
function mergeEntries(current: LogEntry[], incoming: LogEntry[]): LogEntry[] {
  const seen = new Set(current.map(entryKey));
  const added = incoming.filter((entry) => !seen.has(entryKey(entry)));
  if (!added.length) {
    return current;
  }
  return [...added, ...current]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, MAX_ENTRIES);
}

function errorText(err: any, fallback: string): string {
  return err?.error?.detail ?? err?.message ?? fallback;
}

/**
 * The Operate > Logs page: a deployment's Cloud Logging entries, with
 * severity, time and text filters and a live tail.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-cloud-logs',
  templateUrl: './cloud-logs.component.html',
  styleUrl: './cloud-logs.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    DeploymentPickerComponent,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
})
export class CloudLogsComponent {
  private readonly cloudService = inject(CLOUD_SERVICE);
  private readonly deployService = inject(DEPLOY_SERVICE);
  private readonly dialog = inject(MatDialog);

  readonly appName = input<string>('');
  /** Whether the page is on screen; live mode pauses while it is not. */
  readonly active = input(true);
  readonly backToPlayground = output<void>();
  readonly goToDeployments = output<void>();

  readonly timeRanges = TIME_RANGES;
  readonly severityFilters = SEVERITY_FILTERS;

  readonly status = this.cloudService.status;
  readonly connected = computed(() => !!this.status()?.connected);
  readonly statusFailed = signal(false);
  readonly checking = computed(() => !this.status() && !this.statusFailed());

  /** Deployments in the project whose logs can be read. */
  readonly sources = signal<Deployment[]|null>(null);
  readonly sourcesError = signal('');
  readonly selectedSourceId = signal<string|null>(null);
  readonly selectedSource = computed(
      () => (this.sources() ?? [])
                .find((d) => d.id === this.selectedSourceId()) ??
          null);

  readonly severity = signal('');
  readonly rangeId = signal('1h');
  readonly range = computed(
      () => TIME_RANGES.find((r) => r.id === this.rangeId()) ?? TIME_RANGES[1]);
  /** The range the shown entries were listed for. */
  private readonly loadedRangeId = signal('1h');
  readonly loadedRange = computed(
      () => TIME_RANGES.find((r) => r.id === this.loadedRangeId()) ??
          TIME_RANGES[1]);
  queryText = '';
  /** The text the current entries were fetched with. */
  readonly appliedQuery = signal('');

  readonly entries = signal<LogEntry[]|null>(null);
  readonly loading = signal(false);
  readonly loadingOlder = signal(false);
  readonly error = signal('');
  readonly nextPageToken = signal<string|null>(null);
  readonly consoleUrl = signal('');
  readonly lastUpdated = signal<number|null>(null);
  readonly live = signal(false);
  readonly expanded = signal<ReadonlySet<string>>(new Set());

  private readonly now = signal(Date.now());
  /** Start of the listed window, fixed while paging: tokens belong to a filter. */
  private start = '';
  private polling = false;

  readonly updatedText = computed(() => {
    if (this.live()) {
      return 'Live';
    }
    if (this.loading() && this.entries()) {
      return 'Refreshing…';
    }
    const at = this.lastUpdated();
    if (!at) {
      return '';
    }
    const seconds = Math.max(0, Math.round((this.now() - at) / 1000));
    return seconds < 60 ?
        `Updated ${seconds}s ago` :
        `Updated ${relativeTime(new Date(at).toISOString(), this.now())}`;
  });

  private readonly subscriptions = new Subscription();
  private logsRequest?: Subscription;
  private olderRequest?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.subscriptions.unsubscribe();
      this.logsRequest?.unsubscribe();
      this.olderRequest?.unsubscribe();
    });
    this.subscriptions.add(
        interval(CLOCK_TICK_MS).subscribe(() => this.now.set(Date.now())));
    if (!this.status()) {
      this.subscriptions.add(this.cloudService.refreshStatus().subscribe({
        error: () => this.statusFailed.set(true),
      }));
    }
    // Starts over for another app or connection, but not when a status
    // refresh returns the same one.
    const scope = computed(() => {
      const status = this.status();
      return status?.connected && this.appName() ?
          `${this.appName()}|${status.project}|${status.region}` :
          '';
    });
    effect(() => {
      const current = scope();
      untracked(() => {
        this.live.set(false);
        this.sources.set(null);
        this.sourcesError.set('');
        this.selectedSourceId.set(null);
        this.clearEntries();
        if (current) {
          this.loadSources();
        }
      });
    });
    effect((onCleanup) => {
      if (!this.live() || !this.active() || !this.selectedSourceId()) {
        return;
      }
      untracked(() => this.pollNewer());
      const timer = interval(LIVE_POLL_MS).subscribe(() => this.pollNewer());
      onCleanup(() => timer.unsubscribe());
    });
  }

  key(entry: LogEntry): string {
    return entryKey(entry);
  }

  level(entry: LogEntry): SeverityLevel {
    return severityLevel(entry.severity);
  }

  time(entry: LogEntry): string {
    return formatLogTime(entry.timestamp, new Date(this.now()));
  }

  fullTime(entry: LogEntry): string {
    const date = new Date(entry.timestamp);
    return isNaN(date.getTime()) ? entry.timestamp :
                                   `${date.toLocaleString()} (${entry.timestamp})`;
  }

  firstLine(entry: LogEntry): string {
    return entry.message.split('\n', 1)[0];
  }

  extraLines(entry: LogEntry): number {
    return entry.message.split('\n').length - 1;
  }

  statusClass(status?: number): string {
    if (!status) return '';
    if (status >= 500) return 'http-error';
    if (status >= 400) return 'http-warning';
    return 'http-ok';
  }

  payloadJson(entry: LogEntry): string {
    return JSON.stringify(entry.payload, null, 2);
  }

  labelList(entry: LogEntry): Array<[string, string]> {
    return Object.entries(entry.labels ?? {});
  }

  isExpanded(entry: LogEntry): boolean {
    return this.expanded().has(entryKey(entry));
  }

  toggle(entry: LogEntry): void {
    const next = new Set(this.expanded());
    const key = entryKey(entry);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.expanded.set(next);
  }

  connect(): void {
    this.dialog.open(CloudConnectDialogComponent, {maxWidth: '90vw'});
  }

  selectSource(deployment: Deployment): void {
    if (deployment.id === this.selectedSourceId()) {
      return;
    }
    this.selectedSourceId.set(deployment.id);
    this.load();
  }

  setSeverity(severity: string): void {
    if (severity !== this.severity()) {
      this.severity.set(severity);
      this.load();
    }
  }

  setRange(range: TimeRange): void {
    if (range.id !== this.rangeId()) {
      this.rangeId.set(range.id);
      this.load();
    }
  }

  applyQuery(): void {
    this.load();
  }

  clearQuery(): void {
    this.queryText = '';
    this.load();
  }

  toggleLive(): void {
    this.live.set(!this.live());
  }

  refresh(): void {
    if (this.selectedSourceId()) {
      this.load();
    } else {
      this.loadSources();
    }
  }

  openConsole(): void {
    if (this.consoleUrl()) {
      window.open(this.consoleUrl(), '_blank', 'noopener');
    }
  }

  copy(text: string): void {
    navigator.clipboard.writeText(text);
  }

  loadOlder(): void {
    const sourceId = this.selectedSourceId();
    const pageToken = this.nextPageToken();
    if (!sourceId || !pageToken || this.loadingOlder()) {
      return;
    }
    this.loadingOlder.set(true);
    this.olderRequest =
        this.cloudService
            .listLogs(
                this.appName(), sourceId, {...this.baseQuery(), pageToken})
            .subscribe({
              next: (response) => {
                this.loadingOlder.set(false);
                const current = this.entries() ?? [];
                const seen = new Set(current.map(entryKey));
                this.entries.set([
                  ...current,
                  ...response.entries.filter((e) => !seen.has(entryKey(e))),
                ]);
                this.nextPageToken.set(response.nextPageToken ?? null);
              },
              error: (err) => {
                this.loadingOlder.set(false);
                this.error.set(errorText(err, 'Could not load older entries.'));
              },
            });
  }

  private baseQuery(): LogsQuery {
    return {
      start: this.start,
      severity: this.severity() || undefined,
      query: this.appliedQuery() || undefined,
    };
  }

  private clearEntries(): void {
    this.logsRequest?.unsubscribe();
    this.olderRequest?.unsubscribe();
    this.entries.set(null);
    this.loading.set(false);
    this.loadingOlder.set(false);
    this.error.set('');
    this.nextPageToken.set(null);
    this.consoleUrl.set('');
    this.lastUpdated.set(null);
    this.expanded.set(new Set());
  }

  private loadSources(): void {
    const appName = this.appName();
    this.subscriptions.add(this.deployService.listDeployments(appName).subscribe({
      next: (response) => {
        if (appName !== this.appName()) {
          return;
        }
        const sources = response.deployments.filter(
            (d) => d.target === 'agent_engine' || d.target === 'cloud_run');
        this.sources.set(sources);
        // This agent's most recently updated deployment.
        const first = sources.find((d) => d.matchesApp);
        if (first) {
          this.selectSource(first);
        }
      },
      error: (err) => {
        if (appName !== this.appName()) {
          return;
        }
        this.sources.set([]);
        this.sourcesError.set(errorText(err, 'Could not look up deployments.'));
      },
    }));
  }

  /** Lists the newest entries in the chosen window, replacing what is shown. */
  private load(): void {
    const appName = this.appName();
    const sourceId = this.selectedSourceId();
    if (!appName || !sourceId) {
      return;
    }
    this.logsRequest?.unsubscribe();
    this.olderRequest?.unsubscribe();
    this.loadingOlder.set(false);
    const rangeId = this.rangeId();
    this.start = new Date(Date.now() - this.range().ms).toISOString();
    this.appliedQuery.set(this.queryText.trim());
    this.loading.set(true);
    this.error.set('');
    this.logsRequest =
        this.cloudService.listLogs(appName, sourceId, this.baseQuery())
            .subscribe({
              next: (response) => {
                this.loading.set(false);
                this.loadedRangeId.set(rangeId);
                this.entries.set(response.entries);
                this.nextPageToken.set(response.nextPageToken ?? null);
                this.consoleUrl.set(response.consoleUrl);
                this.expanded.set(new Set());
                this.lastUpdated.set(Date.now());
                this.now.set(Date.now());
              },
              error: (err) => {
                this.loading.set(false);
                this.entries.set(null);
                this.nextPageToken.set(null);
                this.error.set(errorText(err, 'Could not read logs.'));
              },
            });
  }

  /** Live mode: adds entries newer than the newest shown. */
  private pollNewer(): void {
    const appName = this.appName();
    const sourceId = this.selectedSourceId();
    if (!appName || !sourceId || this.loading() || this.polling) {
      return;
    }
    const newest = this.entries()?.[0]?.timestamp || this.start;
    if (!newest) {
      return;
    }
    const after = new Date(Date.parse(newest) - LIVE_OVERLAP_MS).toISOString();
    this.polling = true;
    this.subscriptions.add(
        this.cloudService
            .listLogs(appName, sourceId, {...this.baseQuery(), start: undefined, after})
            .subscribe({
              next: (response) => {
                this.polling = false;
                if (sourceId !== this.selectedSourceId()) {
                  return;
                }
                this.entries.set(
                    mergeEntries(this.entries() ?? [], response.entries));
                this.lastUpdated.set(Date.now());
                this.error.set('');
              },
              error: (err) => {
                this.polling = false;
                this.live.set(false);
                this.error.set(errorText(err, 'Live updates stopped.'));
              },
            }));
  }
}
