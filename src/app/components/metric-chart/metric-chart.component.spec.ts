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

import {ComponentFixture, TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {MetricChart, MetricPoint} from '../../core/models/Cloud';
import {initTestBed} from '../../testing/utils';

import {formatMetric, MetricChartComponent, niceStep} from './metric-chart.component';

function points(values: Array<number|undefined>): MetricPoint[] {
  return values.map((value, i) => ({
    time: new Date(Date.UTC(2026, 9, 2, 0, i)).toISOString(),
    value,
  }));
}

const REQUESTS: MetricChart = {
  id: 'requests',
  title: 'Requests',
  unit: 'requests',
  kind: 'bars',
  series: [
    {name: '2xx', color: 'success', points: points([0, 3, 0, 1])},
    {name: '5xx', color: 'error', points: points([0, 1, 0, 0])},
  ],
};

const LATENCY: MetricChart = {
  id: 'latency',
  title: 'Latency',
  unit: 'ms',
  kind: 'lines',
  series: [{name: 'p95', color: 'tertiary', points: points([100, 250, undefined, 80])}],
};

describe('MetricChartComponent', () => {
  let fixture: ComponentFixture<MetricChartComponent>;

  initTestBed();  // required for 1p compat

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [MetricChartComponent]})
        .compileComponents();
    fixture = TestBed.createComponent(MetricChartComponent);
    fixture.componentInstance.width.set(452);
  });

  function render(chart: MetricChart) {
    fixture.componentRef.setInput('chart', chart);
    fixture.componentRef.setInput('bucketSeconds', 60);
    fixture.detectChanges();
  }

  function all(selector: string): Element[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector));
  }

  it('stacks bars per bucket on whole-number ticks', () => {
    render(REQUESTS);

    // Bucket 1 has two series; buckets 0 and 2 are empty.
    expect(all('rect.bar').length).toBe(3);
    expect(all('.y-axis').map((t) => t.textContent)).toEqual(['0', '1', '2', '3', '4']);
    expect(all('.legend-item').map((t) => t.textContent?.trim())).toEqual(['2xx', '5xx']);
  });

  it('breaks lines where there is no data and dots lone points', () => {
    render(LATENCY);

    const [path] = all('path.line');
    expect(path.getAttribute('d')!.match(/M/g)!.length).toBe(2);
    expect(all('circle').length).toBe(1);
    // One series needs no legend.
    expect(all('.legend-item').length).toBe(0);
  });

  it('shows every series at the hovered bucket', () => {
    render(REQUESTS);
    fixture.componentInstance.hoverIndex.set(1);
    fixture.detectChanges();

    const rows = all('.tooltip-row').map(
        (row) => Array.from(row.querySelectorAll('.tooltip-name, .tooltip-value'))
                     .map((cell) => cell.textContent!.trim())
                     .join(' '));
    expect(rows).toEqual(['2xx 3', '5xx 1', 'Total 4']);
  });

  it('says when a range has no data', () => {
    render({...REQUESTS, series: [{...REQUESTS.series[0], points: points([0, 0, 0, 0])}]});
    expect(fixture.nativeElement.querySelector('.no-data')).not.toBeNull();
  });

  it('shows a chart\'s error instead of the chart', () => {
    render({...REQUESTS, series: [], error: 'Quota exceeded'});
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
    expect(fixture.nativeElement.querySelector('.chart-error').textContent).toBe('Quota exceeded');
  });

  it('labels a small memory axis in MiB', () => {
    render({
      id: 'memory',
      title: 'Memory allocated',
      unit: 'GiB',
      kind: 'lines',
      series: [{name: 'GiB', color: 'primary', points: points([0, 0.0009])}],
    });
    expect(all('.y-axis').map((t) => t.textContent))
        .toEqual(['0 MiB', '0.25 MiB', '0.5 MiB', '0.75 MiB', '1 MiB']);
  });
});

describe('formatMetric', () => {
  it('formats each unit compactly', () => {
    expect(formatMetric(undefined, 'ms')).toBe('—');
    expect(formatMetric(3942.4, 'ms')).toBe('3.9 s');
    expect(formatMetric(85.9, 'ms')).toBe('86 ms');
    expect(formatMetric(12.5, '%')).toBe('12.5%');
    expect(formatMetric(0.0511, 'vCPU')).toBe('0.051 vCPU');
    expect(formatMetric(2.5, 'GiB')).toBe('2.5 GiB');
    expect(formatMetric(0.5, 'GiB')).toBe('512 MiB');
    expect(formatMetric(1500, 'requests')).toBe('1.5k');
  });
});

describe('niceStep', () => {
  it('rounds to 1, 2, 2.5 or 5 times a power of ten', () => {
    expect(niceStep(1)).toBe(0.25);
    expect(niceStep(1, true)).toBe(1);
    expect(niceStep(37)).toBe(10);
    expect(niceStep(0)).toBe(1);
  });
});
