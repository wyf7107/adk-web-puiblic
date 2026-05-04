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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import {MatRadioModule} from '@angular/material/radio';
import {MatSliderModule} from '@angular/material/slider';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';


import {RunEvalConfigDialogComponent} from './run-eval-config-dialog.component';

describe('RunEvalConfigDialogComponent', () => {
  let component: RunEvalConfigDialogComponent;
  let fixture: ComponentFixture<RunEvalConfigDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<RunEvalConfigDialogComponent>>;

  // Mock MatDialogRef
  const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatRadioModule,
        MatSliderModule,
        NoopAnimationsModule,
        RunEvalConfigDialogComponent,
    ],
    providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
            provide: MAT_DIALOG_DATA,
            useValue: {
                evalMetrics: [
                    {
                        metricName: 'tool_trajectory_avg_score',
                        threshold: 1,
                    },
                    {
                        metricName: 'response_match_score',
                        threshold: 0.7,
                    },
                ],
            },
        },
        // Provide empty data for initial setup
    ],
}).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RunEvalConfigDialogComponent);
    component = fixture.componentInstance;
    dialogRefSpy = TestBed.inject(MatDialogRef) as jasmine.SpyObj<
      MatDialogRef<RunEvalConfigDialogComponent>
    >;
    fixture.detectChanges(); // Initialize the component and trigger change
    // detection
  });

  it('should initialize form with default values', () => {
    expect(
      component.evalForm.get('tool_trajectory_avg_score_threshold')?.value
    ).toBe(1);
    expect(
      component.evalForm.get('response_match_score_threshold')?.value
    ).toBe(0.7);
  });

  it('should close dialog with null on cancel', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  });

  it('should update threshold value when slider changes (simulated)', () => {
    const toolTrajectoryAvgScoreSlider = component.evalForm.get(
      'tool_trajectory_avg_score_threshold'
    )!;
    const responseMatchScoreSlider = component.evalForm.get(
      'response_match_score_threshold'
    )!;

    toolTrajectoryAvgScoreSlider.setValue(0.4); // Simulate slider value change
    responseMatchScoreSlider.setValue(0.5); // Simulate slider value change
    fixture.detectChanges();

    expect(toolTrajectoryAvgScoreSlider.value).toBe(0.4);
    expect(responseMatchScoreSlider.value).toBe(0.5);
    const thresholdValueDisplays =
      fixture.nativeElement.querySelectorAll('.threshold-value');
    expect(thresholdValueDisplays[0].textContent).toContain('0.4');
    expect(thresholdValueDisplays[1].textContent).toContain('0.5');
  });

  describe('with metricsInfo', () => {
    beforeEach(async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [
          ReactiveFormsModule,
          MatDialogModule,
          MatRadioModule,
          MatSliderModule,
          NoopAnimationsModule,
          RunEvalConfigDialogComponent,
        ],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          {
            provide: MAT_DIALOG_DATA,
            useValue: {
              evalMetrics: [],
              metricsInfo: [
                {
                  metricName: 'custom_metric',
                  description: 'Custom metric description',
                  metricValueInfo: {
                    interval: { minValue: 0, maxValue: 10, openAtMin: false, openAtMax: false }
                  }
                }
              ]
            },
          },
        ],
      }).compileComponents();
    });

    it('should initialize form with dynamic controls', () => {
      const fixture2 = TestBed.createComponent(RunEvalConfigDialogComponent);
      const component2 = fixture2.componentInstance;
      fixture2.detectChanges();

      expect(component2.evalForm.get('custom_metric_selected')).toBeTruthy();
      expect(component2.evalForm.get('custom_metric_threshold')).toBeTruthy();
      expect(component2.evalForm.get('custom_metric_threshold')?.value).toBe(10); // Default to max
    });
  });
});
