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

import {ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, signal} from '@angular/core';

import {MetricChart, MetricSeries} from '../../core/models/Cloud';

const HEIGHT = 180;
const PAD = {top: 10, right: 12, bottom: 24, left: 52};
const TICKS = 4;
const X_LABELS = 5;

const COLORS: Record<string, string> = {
  'primary': 'var(--mat-sys-primary)',
  'secondary': 'var(--mat-sys-secondary)',
  'tertiary': 'var(--mat-sys-tertiary)',
  'success': 'var(--adk-success)',
  'warning': 'var(--adk-warning)',
  'error': 'var(--mat-sys-error)',
  'neutral': 'var(--mat-sys-outline)',
};

export function seriesColor(series: MetricSeries): string {
  return COLORS[series.color] ?? COLORS['primary'];
}

/** A metric value in its unit, short enough for an axis or a tile. */
export function formatMetric(value: number|undefined|null, unit: string):
    string {
  if (value === undefined || value === null || isNaN(value)) {
    return '—';
  }
  switch (unit) {
    case 'ms':
      return value >= 1000 ? `${trim(value / 1000, 1)} s` :
                             `${trim(value, value < 10 ? 1 : 0)} ms`;
    case '%':
      return `${trim(value, 1)}%`;
    case 'MiB':
      return `${significant(value)} MiB`;
    case 'vCPU':
      return `${significant(value)} vCPU`;
    case 'GiB':
      // A small agent uses MiB; "0 GiB" would hide it.
      return value === 0 || value >= 1 ? `${trim(value, 2)} GiB` :
                                         `${significant(value * 1024)} MiB`;
    default:
      return compact(value);
  }
}

/** An axis label: like `formatMetric`, but vCPU without the unit. */
export function formatAxis(value: number, unit: string): string {
  return unit === 'vCPU' ? significant(value) : formatMetric(value, unit);
}

function significant(value: number): string {
  return value === 0 || value >= 10 ? trim(value, value >= 10 ? 0 : 2) :
                                      String(Number(value.toPrecision(2)));
}

function trim(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}

function compact(value: number): string {
  if (Math.abs(value) >= 1e6) return `${trim(value / 1e6, 1)}M`;
  if (Math.abs(value) >= 1e3) return `${trim(value / 1e3, 1)}k`;
  return trim(value, value % 1 ? 1 : 0);
}

/** Units counted in whole numbers, whose axis has no fractional ticks. */
const WHOLE_UNITS = new Set(['requests', 'instances']);

/**
 * A round step so `max` fits in about `ticks` steps: 1, 2, 2.5 or 5 x 10^k,
 * and at least 1 when `whole`.
 */
export function niceStep(max: number, whole = false, ticks = TICKS): number {
  if (max <= 0) return 1;
  const raw = max / ticks;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * power >= raw)! * power;
  return whole ? Math.max(1, Math.ceil(step)) : step;
}

function timeLabel(iso: string, spanSeconds: number): string {
  const date = new Date(iso);
  if (spanSeconds <= 24 * 3600) {
    return date.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
  }
  return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

interface Bar {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface Line {
  d: string;
  color: string;
  /** Points with no neighbor to draw a segment to. */
  dots: Array<{x: number; y: number}>;
}

/**
 * One metric over time, as stacked bars (counts) or lines (latency,
 * resources), drawn in SVG at the width it is given.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-metric-chart',
  templateUrl: './metric-chart.component.html',
  styleUrl: './metric-chart.component.scss',
  standalone: true,
})
export class MetricChartComponent {
  readonly chart = input.required<MetricChart>();
  readonly bucketSeconds = input(60);

  readonly height = HEIGHT;
  readonly pad = PAD;
  readonly width = signal(600);
  readonly hoverIndex = signal<number|null>(null);

  readonly count = computed(() => this.chart().series[0]?.points.length ?? 0);
  readonly plotWidth = computed(() => Math.max(0, this.width() - PAD.left - PAD.right));
  readonly plotHeight = HEIGHT - PAD.top - PAD.bottom;
  readonly band = computed(() => this.count() ? this.plotWidth() / this.count() : 0);

  readonly hasData = computed(() => this.chart().series.some(
      (s) => s.points.some((p) => p.value !== undefined && p.value !== null && p.value !== 0)));

  /** Stacked totals per bucket for bars; the largest value for lines. */
  readonly max = computed(() => {
    const series = this.chart().series;
    if (!series.length) return 0;
    if (this.chart().kind === 'bars') {
      return Math.max(0, ...series[0].points.map(
          (_, i) => series.reduce((sum, s) => sum + (s.points[i].value ?? 0), 0)));
    }
    return Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.value ?? 0)));
  });

  /** The axis counts MiB rather than fractions of a GiB for small agents. */
  private readonly axisUnit = computed(() => {
    const unit = this.chart().unit;
    return unit === 'GiB' && this.max() < 1 ? {unit: 'MiB', factor: 1024} :
                                              {unit, factor: 1};
  });

  readonly yTicks = computed(() => {
    const {unit, factor} = this.axisUnit();
    const max = this.max() * factor;
    const step = niceStep(max, WHOLE_UNITS.has(unit));
    const scaledTop = Math.max(step, Math.ceil(max / step) * step);
    const top = scaledTop / factor;
    const ticks = [];
    for (let value = 0; value <= scaledTop + step / 1000; value += step) {
      ticks.push({value, y: this.y(value / factor, top), label: formatAxis(value, unit)});
    }
    return {top, ticks};
  });

  readonly xLabels = computed(() => {
    const points = this.chart().series[0]?.points ?? [];
    if (!points.length) return [];
    const span = points.length * this.bucketSeconds();
    const labels = [];
    for (let k = 0; k < X_LABELS; k++) {
      const i = Math.round((k / (X_LABELS - 1)) * (points.length - 1));
      labels.push({
        x: PAD.left + (i + 0.5) * this.band(),
        label: timeLabel(points[i].time, span),
        anchor: k === 0 ? 'start' : k === X_LABELS - 1 ? 'end' : 'middle',
      });
    }
    return labels;
  });

  readonly bars = computed<Bar[]>(() => {
    if (this.chart().kind !== 'bars') return [];
    const top = this.yTicks().top;
    const band = this.band();
    const gap = band > 4 ? Math.min(2, band * 0.2) : 0;
    const bars: Bar[] = [];
    for (let i = 0; i < this.count(); i++) {
      let base = 0;
      for (const series of this.chart().series) {
        const value = series.points[i].value ?? 0;
        if (value > 0) {
          const y0 = this.y(base, top);
          const y1 = this.y(base + value, top);
          bars.push({
            x: PAD.left + i * band + gap / 2,
            y: y1,
            width: Math.max(1, band - gap),
            height: Math.max(1, y0 - y1),
            color: seriesColor(series),
          });
          base += value;
        }
      }
    }
    return bars;
  });

  readonly lines = computed<Line[]>(() => {
    if (this.chart().kind !== 'lines') return [];
    const top = this.yTicks().top;
    return this.chart().series.map((series) => {
      let d = '';
      const dots: Array<{x: number; y: number}> = [];
      const points = series.points;
      points.forEach((point, i) => {
        if (point.value === undefined || point.value === null) return;
        const x = PAD.left + (i + 0.5) * this.band();
        const y = this.y(point.value, top);
        const prev = points[i - 1]?.value;
        const next = points[i + 1]?.value;
        const joined = prev !== undefined && prev !== null;
        d += `${joined ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
        if (!joined && (next === undefined || next === null)) {
          dots.push({x, y});
        }
      });
      return {d, color: seriesColor(series), dots};
    });
  });

  readonly hover = computed(() => {
    const i = this.hoverIndex();
    const chart = this.chart();
    if (i === null || !chart.series.length) return null;
    const time = new Date(chart.series[0].points[i].time);
    const start = new Date(time.getTime() - this.bucketSeconds() * 1000);
    const rows = chart.series.map((s) => ({
      name: s.name,
      color: seriesColor(s),
      value: formatMetric(s.points[i].value, chart.unit),
    }));
    const total = chart.kind === 'bars' && chart.series.length > 1 ?
        formatMetric(chart.series.reduce((sum, s) => sum + (s.points[i].value ?? 0), 0), chart.unit) :
        null;
    const x = PAD.left + (i + 0.5) * this.band();
    return {
      x,
      left: x > this.width() / 2,
      label: `${start.toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})} – ${
          time.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})}`,
      rows,
      total,
    };
  });

  readonly seriesColor = seriesColor;

  constructor() {
    const element = inject(ElementRef).nativeElement as HTMLElement;
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const width = Math.round(entries[0].contentRect.width);
        if (width > 0) this.width.set(width);
      });
      observer.observe(element);
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }
  }

  onMove(event: MouseEvent): void {
    const svg = (event.currentTarget as SVGElement).getBoundingClientRect();
    const x = event.clientX - svg.left - PAD.left;
    const i = Math.floor(x / this.band());
    this.hoverIndex.set(i >= 0 && i < this.count() ? i : null);
  }

  onLeave(): void {
    this.hoverIndex.set(null);
  }

  private y(value: number, top: number): number {
    return PAD.top + this.plotHeight - (top ? (value / top) * this.plotHeight : 0);
  }
}
