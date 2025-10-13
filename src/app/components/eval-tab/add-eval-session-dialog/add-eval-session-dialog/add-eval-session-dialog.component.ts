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

import {Component, Inject} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { uuidv4 } from 'uuidv7';
import {EvalService, EVAL_SERVICE} from '../../../../core/services/eval.service';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-add-eval-session-dialog',
    templateUrl: './add-eval-session-dialog.component.html',
    styleUrl: './add-eval-session-dialog.component.scss',
    imports: [
        MatDialogTitle,
        CdkScrollable,
        MatDialogContent,
        MatFormField,
        MatLabel,
        MatInput,
        FormsModule,
        MatDialogActions,
        MatButton,
        MatDialogClose,
    ],
})
export class AddEvalSessionDialogComponent {
  newCaseId: string = 'case' + uuidv4().slice(0, 6);

  constructor(
    @Inject(EVAL_SERVICE) private evalService: EvalService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      appName: string;
      userId: string;
      sessionId: string;
      evalSetId: string;
    },
    public dialogRef: MatDialogRef<AddEvalSessionDialogComponent>,
  ) {}

  createNewEvalCase() {
    if (!this.newCaseId || this.newCaseId == '') {
      alert('Cannot create eval set with empty id!');
    } else {
      this.evalService
          .addCurrentSession(
              this.data.appName,
              this.data.evalSetId,
              this.newCaseId,
              this.data.sessionId,
              this.data.userId,
              )
          .subscribe((res) => {
            this.dialogRef.close(true);
          });
    }
  }
}
