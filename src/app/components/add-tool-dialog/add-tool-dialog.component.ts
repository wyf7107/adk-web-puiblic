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
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-add-tool-dialog',
  templateUrl: './add-tool-dialog.component.html',
  styleUrl: './add-tool-dialog.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ]
})
export class AddToolDialogComponent {
  toolName = '';
  toolType = 'Custom tool';
  selectedBuiltInTool = 'google_search';

  toolTypes = [
    'Custom tool', 
    'Function tool',
    'Built-in tool',
    'Agent Tool'
  ];

  builtInTools = [
    'EnterpriseWebSearchTool',
    'exit_loop',
    'FilesRetrieval',
    'get_user_choice',
    'google_search',
    'load_artifacts',
    'load_memory',
    'LongRunningFunctionTool',
    'preload_memory',
    'url_context',
    'VertexAiRagRetrieval',
    'VertexAiSearchTool',
  ];

  constructor(
    public dialogRef: MatDialogRef<AddToolDialogComponent>,
  ) {}

  addTool() {
    if (this.toolType === 'Custom tool' && !this.toolName.trim()) {
      return;
    }
    
    const result: any = {
      toolType: this.toolType
    };

    if (this.toolType === 'Custom tool') {
      result.name = this.toolName.trim();
    } else if (this.toolType === 'Built-in tool') {
      result.name = this.selectedBuiltInTool;
    }
    
    this.dialogRef.close(result);
  }

  cancel() {
    this.dialogRef.close();
  }

  createDisabled() {
    return this.toolType === 'Custom Tool' && !this.toolName.trim();
  }
}
