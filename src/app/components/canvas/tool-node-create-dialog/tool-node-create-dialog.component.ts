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
  type: string = "";

  // Tool node
  node: ToolNode = {} as ToolNode;
  toolTypes = [
    'inlineTool'
  ]

  selectedToolType: string = "";

  constructor(private dialog: MatDialog, 
    public dialogRef: MatDialogRef<ToolNodeCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,) {
      this.type = data.type;
      if (data.type == "tool" && data.node) {
        this.node = data.node;
        this.selectedToolType = this.node.toolType;
      }
    }

  createNode() {
    if (this.type == "tool") {
      this.node.toolType = this.selectedToolType;
    }
    this.dialogRef.close(this.node);
  }

}
