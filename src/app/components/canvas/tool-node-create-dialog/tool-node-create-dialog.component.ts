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
