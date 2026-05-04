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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { AddEvalSessionDialogComponent } from './add-eval-session-dialog.component';
import { EvalService } from '../../../../core/services/eval.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {EVAL_SERVICE} from '../../../../core/services/interfaces/eval';

describe('AddEvalSessionDialogComponent', () => {
  let component: AddEvalSessionDialogComponent;
  let fixture: ComponentFixture<AddEvalSessionDialogComponent>;
  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    const evalService = jasmine.createSpyObj<EvalService>(['addCurrentSession']);
    evalService.addCurrentSession.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        AddEvalSessionDialogComponent,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {},
        },
        { provide: EVAL_SERVICE, useValue: evalService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddEvalSessionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should ask for confirmation if case already exists and not proceed if cancelled', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const evalService = TestBed.inject(EVAL_SERVICE) as unknown as jasmine.SpyObj<any>;
    
    component.data.existingCases = ['existing_case'];
    component.newCaseId = 'existing_case';
    
    component.createNewEvalCase();
    
    expect(window.confirm).toHaveBeenCalled();
    expect(evalService.addCurrentSession).not.toHaveBeenCalled();
  });

  it('should ask for confirmation if case already exists and proceed if confirmed', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const evalService = TestBed.inject(EVAL_SERVICE) as unknown as jasmine.SpyObj<any>;
    
    component.data.existingCases = ['existing_case'];
    component.newCaseId = 'existing_case';
    
    component.createNewEvalCase();
    
    expect(window.confirm).toHaveBeenCalled();
    expect(evalService.addCurrentSession).toHaveBeenCalled();
  });
});
