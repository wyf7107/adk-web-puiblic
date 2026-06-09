/**
 * @license
 * Copyright 2025 Google LLC
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

import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';

import {EvalMetric, MetricsInfo, DEFAULT_EVAL_METRICS} from '../../../core/models/Eval';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { FormatMetricNamePipe } from '../format-metric-name.pipe';

/**
 * @interface EvalConfigData
 * @description Data injected into the dialog, including the list of available
 * evaluation metrics.
 */
export interface EvalConfigData {
  evalMetrics: EvalMetric[];
  metricsInfo: MetricsInfo[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
    selector: 'app-run-eval-config-dialog',
    templateUrl: './run-eval-config-dialog.component.html',
    styleUrls: ['./run-eval-config-dialog.component.scss'],
    imports: [
        MatDialogTitle,
        CdkScrollable,
        MatDialogContent,
        FormsModule,
        ReactiveFormsModule,
        MatSlider,
        MatSliderThumb,
        MatDialogActions,
        MatButton,
        MatCheckbox,
        CommonModule,
        MatTooltip,
        FormatMetricNamePipe,
    ],
})
export class RunEvalConfigDialogComponent {
  // FormGroup to manage the dialog's form controls
  evalForm: FormGroup;

  evalMetrics: EvalMetric[] = [];
  metricsInfo: MetricsInfo[] = [];

  constructor(
      public dialogRef: MatDialogRef<RunEvalConfigDialogComponent>,
      private fb: FormBuilder,
      @Inject(MAT_DIALOG_DATA) public data: EvalConfigData) {
    this.evalMetrics = this.data.evalMetrics || [];
    this.metricsInfo = this.data.metricsInfo || [];

    // Initialize the form
    this.evalForm = this.fb.group({});

    // Dynamically add controls for each metric
    this.metricsInfo.forEach(metric => {
      const existingMetric = this.evalMetrics.find(m => m.metricName === metric.metricName);
      const isSelected = !!existingMetric;
      const threshold = existingMetric ? existingMetric.threshold : this.getDefaultThreshold(metric);

      this.evalForm.addControl(`${metric.metricName}_selected`, this.fb.control(isSelected));
      
      const interval = metric.metricValueInfo.interval;
      this.evalForm.addControl(`${metric.metricName}_threshold`, this.fb.control(threshold, [
        Validators.required,
        Validators.min(interval.minValue),
        Validators.max(interval.maxValue)
      ]));
    });

    // Fallback if metricsInfo is empty, add the hardcoded ones to avoid empty UI if backend fails
    if (this.metricsInfo.length === 0) {
      this.addDefaultControls();
    }
  }

  private addDefaultControls() {
    const defaultMetrics = [
      { name: 'tool_trajectory_avg_score', min: 0, max: 1, default: 1 },
      { name: 'response_match_score', min: 0, max: 1, default: 0.7 }
    ];

    defaultMetrics.forEach(m => {
      const existingMetric = this.evalMetrics.find(em => em.metricName === m.name);
      const isSelected = !!existingMetric;
      const threshold = existingMetric ? existingMetric.threshold : m.default;

      this.evalForm.addControl(`${m.name}_selected`, this.fb.control(isSelected));
      this.evalForm.addControl(`${m.name}_threshold`, this.fb.control(threshold, [
        Validators.required,
        Validators.min(m.min),
        Validators.max(m.max)
      ]));
    });
  }

  private getDefaultThreshold(metric: MetricsInfo): number {
    if (metric.metricName === 'tool_trajectory_avg_score') return 1.0;
    if (metric.metricName === 'response_match_score') return 0.7;
    return metric.metricValueInfo.interval.maxValue;
  }

  onReset(): void {
    this.metricsInfo.forEach(metric => {
      const defaultMetric = DEFAULT_EVAL_METRICS.find(m => m.metricName === metric.metricName);
      const isSelected = !!defaultMetric;
      const threshold = defaultMetric ? defaultMetric.threshold : this.getDefaultThreshold(metric);

      this.evalForm.get(`${metric.metricName}_selected`)?.setValue(isSelected);
      this.evalForm.get(`${metric.metricName}_threshold`)?.setValue(threshold);
    });

    if (this.metricsInfo.length === 0) {
      DEFAULT_EVAL_METRICS.forEach(m => {
        this.evalForm.get(`${m.metricName}_selected`)?.setValue(true);
        this.evalForm.get(`${m.metricName}_threshold`)?.setValue(m.threshold);
      });
    }
  }

  onStart(): void {
    if (this.evalForm.valid) {
      const resultMetrics: EvalMetric[] = [];

      if (this.metricsInfo.length > 0) {
        this.metricsInfo.forEach(metric => {
          const isSelected = this.evalForm.get(`${metric.metricName}_selected`)?.value;
          if (isSelected) {
            const threshold = this.evalForm.get(`${metric.metricName}_threshold`)?.value;
            resultMetrics.push({
              metricName: metric.metricName,
              threshold: threshold
            });
          }
        });
      } else {
        // Fallback if metricsInfo was empty
        const defaultMetrics = ['tool_trajectory_avg_score', 'response_match_score'];
        defaultMetrics.forEach(name => {
          const isSelected = this.evalForm.get(`${name}_selected`)?.value;
          if (isSelected) {
            const threshold = this.evalForm.get(`${name}_threshold`)?.value;
            resultMetrics.push({
              metricName: name,
              threshold: threshold
            });
          }
        });
      }

      this.dialogRef.close(resultMetrics);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
