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

import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

/**
 * @interface EvalMetric
 * @description Represents a single evaluation metric and its associated
 * threshold.
 */
export interface EvalMetric {
  metricName: string;
  threshold: number;
}

/**
 * @interface EvalConfigData
 * @description Data injected into the dialog, including the list of available
 * evaluation metrics.
 */
export interface EvalConfigData {
  evalMetrics: EvalMetric[];
}

@Component({
  selector: 'app-eval-config-dialog',
  templateUrl: './eval-config-dialog.component.html',
  styleUrls: ['./eval-config-dialog.component.scss'],
  standalone: false,
})
export class EvalConfigDialogComponent implements OnInit {
  // FormGroup to manage the dialog's form controls
  evalForm: FormGroup;

  // Available evaluation metrics, matching the image
  metrics: string[] = ['Tool trajectory avg score', 'Response match score'];

  /**
   * @constructor
   * @param {MatDialogRef<EvalConfigDialogComponent>} dialogRef - Reference to
   *     the dialog opened.
   * @param {FormBuilder} fb - Angular's FormBuilder for creating reactive
   *     forms.
   * @param {EvalConfigData} data - Data injected into the dialog (e.g., initial
   *     values).
   */
  constructor(
      public dialogRef: MatDialogRef<EvalConfigDialogComponent>,
      private fb: FormBuilder,
      @Inject(MAT_DIALOG_DATA) public data: EvalConfigData) {
    // Initialize the form with controls and validators
    this.evalForm = this.fb.group({
      metric: [
        this.data?.evalMetrics[0]?.metricName || 'Response match score',
        Validators.required
      ],
      threshold: [
        this.data?.evalMetrics[0]?.threshold || 1.0,
        [Validators.required, Validators.min(0), Validators.max(1)]
      ]
    });
  }

  ngOnInit(): void {
    // You could add more complex initialization logic here if needed
  }

  onSave(): void {
    if (this.evalForm.valid) {
      const {metric, threshold} = this.evalForm.value;
      this.dialogRef.close({metric, threshold});
    }
  }

  onCancel(): void {
    this.dialogRef.close(
        null);  // Return null or undefined to indicate cancellation
  }

  getMetricErrorMessage(): string {
    if (this.evalForm.controls['metric'].hasError('required')) {
      return 'You must select a metric';
    }
    return '';
  }

  getThresholdErrorMessage(): string {
    const thresholdControl = this.evalForm.controls['threshold'];
    if (thresholdControl.hasError('required')) {
      return 'Threshold is required';
    }
    if (thresholdControl.hasError('min')) {
      return 'Threshold must be at least 0';
    }
    if (thresholdControl.hasError('max')) {
      return 'Threshold cannot exceed 1';
    }
    return '';
  }
}