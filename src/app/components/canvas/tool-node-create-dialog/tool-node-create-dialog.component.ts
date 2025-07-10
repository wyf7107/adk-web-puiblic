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
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToolNode } from '../../../core/models/AgentBuilder';

@Component({
  selector: 'app-tool-node-create-dialog',
  templateUrl: './tool-node-create-dialog.component.html',
  styleUrl: './tool-node-create-dialog.component.scss',
  standalone: false
})


export class ToolNodeCreateDialogComponent {
  node: ToolNode = {} as ToolNode;
  toolTypes = [
    'inlineTool'
  ]

  type: string = "";
  selectedToolType: string = "";
  toolCode: string = "";

  constructor(private dialog: MatDialog, 
    public dialogRef: MatDialogRef<ToolNodeCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,) {
      this.type = data.type;
      if (data.type == "tool" && data.node) {
        this.node = data.node;
        this.selectedToolType = this.node.toolType;
        this.toolCode = this.node.toolCode ?? "";
      }
    }

  createNode() {
    if (this.type == "tool") {
      this.node.toolType = this.selectedToolType;
      this.node.toolCode = this.toolCode;
    }
    this.dialogRef.close(this.node);
  }
}
