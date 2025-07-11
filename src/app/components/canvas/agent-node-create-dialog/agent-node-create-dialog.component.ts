import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AgentNode } from '../../../core/models/AgentBuilder';

@Component({
  selector: 'app-agent-node-create-dialog',
  templateUrl: './agent-node-create-dialog.component.html',
  styleUrl: './agent-node-create-dialog.component.scss',
  standalone: false
})


export class AgentNodeCreateDialogComponent {
  type: string = "";

  isRootAgentEditable: boolean = true;

  // Agent node
  node: AgentNode = {} as AgentNode;
  models = [
    "gemini-2.5-flash"
  ]
  agentType = [
      'llmAgent',
      'loopAgent',
      'parallelAgent',
      'sequentialAgent'
  ]

  selectedModel: string = "";
  selectedAgentType: string = "";

  constructor(private dialog: MatDialog, 
    public dialogRef: MatDialogRef<AgentNodeCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,) {
      this.type = data.type;
      this.isRootAgentEditable = data.isRootAgentEditable;
      
      if (data.type == "agent" && data.node) {
        this.node = data.node;
        this.selectedModel = this.node.model;
        this.selectedAgentType = this.node.agentType;
        this.isRootAgentEditable = !!this.node.isRoot;
      }
    }

  createNode() {
    if (this.type == "agent") {
      this.node.agentType = this.selectedAgentType;
      this.node.model = this.selectedModel;
    }
    this.dialogRef.close(this.node);
  }

}
