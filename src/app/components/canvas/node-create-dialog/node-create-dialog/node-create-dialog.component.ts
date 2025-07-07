import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AgentNode } from '../../../../core/models/AgentBuilder';

@Component({
  selector: 'app-node-create-dialog',
  templateUrl: './node-create-dialog.component.html',
  styleUrl: './node-create-dialog.component.scss',
  standalone: false
})


export class NodeCreateDialogComponent {
  type: string = "";

  // Agent node
  node: AgentNode = {} as AgentNode;
  models = [
    "gemini-2.5-flash"
  ]

  constructor(private dialog: MatDialog, 
    public dialogRef: MatDialogRef<NodeCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,) {
      this.type = data.type;
    }

  createNode() {
    if (this.type == "agent") {
      if (this.node.isRoot) { this.node.agentName = "root_agent" }
      this.node.agentType = "LlmAgent";
    }
    this.dialogRef.close(this.node);
  }

}
