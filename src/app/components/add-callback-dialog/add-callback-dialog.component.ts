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

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

@Component({
  selector: 'app-add-callback-dialog',
  templateUrl: './add-callback-dialog.component.html',
  styleUrl: './add-callback-dialog.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatFormField,
    MatInput,
    MatDialogActions,
    MatButton,
    MatLabel,
  ],
})
export class AddCallbackDialogComponent {
  callbackName = '';
  callbackType: string;

  constructor(
    public dialogRef: MatDialogRef<AddCallbackDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { callbackType: string }
  ) {
    // Use the callback type from the injected data
    this.callbackType = data.callbackType;
  }

  addCallback() {
    if (!this.callbackName.trim()) {
      return;
    }

    const result = {
      name: this.callbackName.trim(),
      type: this.callbackType,
    };

    this.dialogRef.close(result);
  }

  cancel() {
    this.dialogRef.close();
  }

  createDisabled() {
    return !this.callbackName.trim();
  }
}
