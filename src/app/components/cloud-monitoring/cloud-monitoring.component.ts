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
import {MatDialog} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {interval, Subscription} from 'rxjs';

import {MetricChart, MetricsRange, MetricsResponse, MetricSummary} from '../../core/models/Cloud';
import {Deployment} from '../../core/models/Deploy';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {DEPLOY_SERVICE} from '../../core/services/interfaces/deploy';
import {CloudConnectDialogComponent} from '../cloud-connect-dialog/cloud-connect-dialog.component';
import {DeploymentPickerComponent} from '../deployment-picker/deployment-picker.component';
import {relativeTime} from '../deployments/deployments.component';
import {formatMetric, MetricChartComponent} from '../metric-chart/metric-chart.component';

/** How often "Updated 12s ago" is recomputed. */
const CLOCK_TICK_MS = 5_000;
/** Cloud Monitoring samples most of these metrics every minute. */
const AUTO_REFRESH_MS = 60_000;

export const METRICS_RANGES: Array<{id: MetricsRange; label: string}> = [
  {id: '1h', label: '1 hour'},
  {id: '6h', label: '6 hours'},
  {id: '1d', label: '1 day'},
  {id: '7d', label: '7 days'},
  {id: '30d', label: '30 days'},
];

function errorText(err: any, fallback: string): string {
  return err?.error?.detail ?? err?.message ?? fallback;
}

/**
 * The Operate > Monitoring page: a deployment's requests, errors, latency
 * and resources from Cloud Monitoring.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-cloud-monitoring',
  templateUrl: './cloud-monitoring.component.html',
  styleUrl: './cloud-monitoring.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    DeploymentPickerComponent,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MetricChartComponent,
  ],
})
export class CloudMonitoringComponent {
  private readonly cloudService = inject(CLOUD_SERVICE);
  private readonly deployService = inject(DEPLOY_SERVICE);
  private readonly dialog = inject(MatDialog);

  readonly appName = input<string>('');
  /** Whether the page is on screen; auto-refresh pauses while it is not. */
  readonly active = input(true);
  readonly backToPlayground = output<void>();
  readonly goToDeployments = output<void>();

  readonly ranges = METRICS_RANGES;

  readonly status = this.cloudService.status;
  readonly connected = computed(() => !!this.status()?.connected);
  readonly statusFailed = signal(false);
  readonly checking = computed(() => !this.status() && !this.statusFailed());

  readonly sources = signal<Deployment[]|null>(null);
  readonly sourcesError = signal('');
  readonly selectedSourceId = signal<string|null>(null);
  readonly selectedSource = computed(
      () => (this.sources() ?? [])
                .find((d) => d.id === this.selectedSourceId()) ??
          null);

  readonly range = signal<MetricsRange>('1d');
  readonly metrics = signal<MetricsResponse|null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly lastUpdated = signal<number|null>(null);

  private readonly now = signal(Date.now());

  readonly updatedText = computed(() => {
    if (this.loading() && this.metrics()) {
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
  private metricsRequest?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.subscriptions.unsubscribe();
      this.metricsRequest?.unsubscribe();
    });
    this.subscriptions.add(
        interval(CLOCK_TICK_MS).subscribe(() => this.now.set(Date.now())));
    if (!this.status()) {
      this.subscriptions.add(this.cloudService.refreshStatus().subscribe({
        error: () => this.statusFailed.set(true),
      }));
    }
    const scope = computed(() => {
      const status = this.status();
      return status?.connected && this.appName() ?
          `${this.appName()}|${status.project}|${status.region}` :
          '';
    });
    effect(() => {
      const current = scope();
      untracked(() => {
        this.sources.set(null);
        this.sourcesError.set('');
        this.selectedSourceId.set(null);
        this.clearMetrics();
        if (current) {
          this.loadSources();
        }
      });
    });
    effect((onCleanup) => {
      if (!this.active() || !this.selectedSourceId()) {
        return;
      }
      const timer = interval(AUTO_REFRESH_MS).subscribe(() => {
        if (!this.loading()) this.load();
      });
      onCleanup(() => timer.unsubscribe());
    });
  }

  formatSummary(summary: MetricSummary): string {
    return formatMetric(summary.value, summary.unit);
  }

  /**
   * A summary's sparkline, from the chart that holds its series: the total
   * requests, the 5xx share, p95 latency, or the first series of a resource
   * chart. Null when there is nothing to draw.
   */
  sparkline(summary: MetricSummary, metrics: MetricsResponse):
      {d: string, x: number, y: number}|null {
    const values = sparkValues(summary.id, metrics.charts);
    return sparkPath(values, 244, 32);
  }

  rangeLabel(): string {
    return METRICS_RANGES.find((r) => r.id === this.range())?.label ?? '';
  }

  connect(): void {
    this.dialog.open(CloudConnectDialogComponent, {maxWidth: '90vw'});
  }

  selectSource(deployment: Deployment): void {
    if (deployment.id === this.selectedSourceId()) {
      return;
    }
    this.selectedSourceId.set(deployment.id);
    this.metrics.set(null);
    this.load();
  }

  setRange(range: MetricsRange): void {
    if (range !== this.range()) {
      this.range.set(range);
      this.load();
    }
  }

  refresh(): void {
    if (this.selectedSourceId()) {
      this.load();
    } else {
      this.loadSources();
    }
  }

  openConsole(): void {
    const url = this.metrics()?.consoleUrl ?? this.selectedSource()?.consoleUrl;
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  private clearMetrics(): void {
    this.metricsRequest?.unsubscribe();
    this.metrics.set(null);
    this.loading.set(false);
    this.error.set('');
    this.lastUpdated.set(null);
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

  private load(): void {
    const appName = this.appName();
    const sourceId = this.selectedSourceId();
    if (!appName || !sourceId) {
      return;
    }
    this.metricsRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.metricsRequest =
        this.cloudService.getMetrics(appName, sourceId, this.range()).subscribe({
          next: (response) => {
            this.loading.set(false);
            this.metrics.set(response);
            this.lastUpdated.set(Date.now());
            this.now.set(Date.now());
          },
          error: (err) => {
            this.loading.set(false);
            this.metrics.set(null);
            this.error.set(errorText(err, 'Could not read metrics.'));
          },
        });
  }
}

/** The series a summary tile draws as its sparkline. */
export function sparkValues(id: string, charts: MetricChart[]): Array<number|undefined> {
  const chart = (chartId: string) => charts.find((c) => c.id === chartId && !c.error);
  const sumAt = (c: MetricChart, filter: (name: string) => boolean = () => true) =>
      (c.series[0]?.points ?? []).map((_, i) => {
        const parts = c.series.filter((s) => filter(s.name))
                          .map((s) => s.points[i]?.value)
                          .filter((v): v is number => v !== undefined);
        return parts.length ? parts.reduce((a, b) => a + b, 0) : undefined;
      });
  switch (id) {
    case 'requests': {
      const c = chart('requests');
      return c ? sumAt(c) : [];
    }
    case 'errors': {
      const c = chart('requests');
      if (!c) return [];
      const total = sumAt(c);
      const bad = sumAt(c, (name) => name.startsWith('5'));
      return total.map((t, i) => t ? (bad[i] ?? 0) / t : (t === 0 ? 0 : undefined));
    }
    case 'p95': {
      const series = chart('latency')?.series.find((s) => s.name.includes('95')) ??
          chart('latency')?.series[0];
      return series?.points.map((p) => p.value) ?? [];
    }
    default: {
      const c = id.includes('cpu') ? chart('cpu') :
          id.includes('mem') ? chart('memory') : chart(id);
      return c?.series[0]?.points.map((p) => p.value) ?? [];
    }
  }
}

/** An SVG path through the values, scaled into a width x height box. */
export function sparkPath(values: Array<number|undefined>, width: number, height: number):
    {d: string, x: number, y: number}|null {
  const known = values.map((v, i) => ({v, i})).filter((p): p is {v: number, i: number} =>
      p.v !== undefined && Number.isFinite(p.v));
  if (known.length < 2) {
    return null;
  }
  const max = Math.max(...known.map((p) => p.v));
  const min = Math.min(0, ...known.map((p) => p.v));
  const span = max - min || 1;
  const step = width / Math.max(1, values.length - 1);
  const pad = 4;
  const pts = known.map((p) => ({
    x: Math.round(p.i * step * 10) / 10,
    y: Math.round((pad + (1 - (p.v - min) / span) * (height - 2 * pad)) * 10) / 10,
  }));
  const last = pts[pts.length - 1];
  return {d: 'M' + pts.map((p) => `${p.x},${p.y}`).join(' L'), x: last.x, y: last.y};
}
