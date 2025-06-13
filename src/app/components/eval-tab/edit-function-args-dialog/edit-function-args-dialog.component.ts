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
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

export interface EditFunctionArgsData {
  functionName: string;
  args?: any;
}

@Component({
  selector: 'app-edit-function-args-dialog',
  templateUrl: './edit-function-args-dialog.component.html',
  styleUrls: ['./edit-function-args-dialog.component.scss'],
  standalone: false,
})
export class EditFunctionArgsDialogComponent implements OnInit {
  protected readonly editorOptions = {
    theme: 'vs-dark',
    automaticLayout: true,
    language: 'json',
    minimap: {enabled: false},
    scrollBeyondLastLine: false
  };

  protected toolArgs = '';
  protected functionName = '';

  constructor(
      public dialogRef: MatDialogRef<EditFunctionArgsDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: EditFunctionArgsData) {
    this.toolArgs = JSON.stringify(data.args, null, 2);
    this.functionName = data.functionName;
  }

  ngOnInit(): void {}

  onSave(): void {
    try {
      const parsedArgs = JSON.parse(this.toolArgs);
      this.dialogRef.close(parsedArgs);
    } catch (e) {
      alert('Invalid JSON: ' + e);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
