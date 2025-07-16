import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { AgentNode } from '../../core/models/AgentBuilder';

@Component({
  selector: 'app-agent-edit-form',
  templateUrl: './agent-edit-form.component.html',
  styleUrl: './agent-edit-form.component.scss',
  standalone: false
})
export class AgentEditFormComponent implements OnChanges {
  @Input() agentNode: AgentNode = {} as AgentNode;
  @Output() agentUpdated = new EventEmitter<AgentNode>();

  models = [
    "gemini-2.5-flash"
  ];
  
  agentType = [
    'LlmAgent',
    'LoopAgent',
    'ParallelAgent',
    'SequentialAgent'
  ];

  selectedModel: string = "";
  selectedAgentType: string = "";

  ngOnInit() {
    // Initialize with current values
    this.selectedModel = this.agentNode.model || this.models[0];
    this.selectedAgentType = this.agentNode.agentType || this.agentType[0];
  }

  ngOnChanges() {
    // Update form when agentNode input changes
    if (this.agentNode) {
      this.selectedModel = this.agentNode.model || this.models[0];
      this.selectedAgentType = this.agentNode.agentType || this.agentType[0];
    }
  }

  onAgentNameChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.agentNode.agentName = target.value;
      this.updateAgent();
    }
  }

  onAgentTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.selectedAgentType = target.value;
      this.agentNode.agentType = target.value;
      this.updateAgent();
    }
  }

  onModelChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.selectedModel = target.value;
      this.agentNode.model = target.value;
      this.updateAgent();
    }
  }

  onInstructionsChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (target) {
      this.agentNode.instructions = target.value;
      this.updateAgent();
    }
  }

  onIsRootChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.agentNode.isRoot = target.checked;
      this.updateAgent();
    }
  }

  private updateAgent() {
    this.agentUpdated.emit(this.agentNode);
  }
} 