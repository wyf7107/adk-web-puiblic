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

import { Component, inject } from '@angular/core';
import { AgentNode, ToolNode } from '../../core/models/AgentBuilder';
import { AgentBuilderService } from '../../core/services/agent-builder.service';
import {filter} from 'rxjs';


@Component({
  selector: 'app-builder-tabs',
  templateUrl: './builder-tabs.component.html',
  styleUrl: './builder-tabs.component.scss',
  standalone: false
})
export class BuilderTabsComponent {

  // Agent configuration properties
  agentConfig: AgentNode | undefined = {
    isRoot: false,
    agentName: '',
    agentType: '',
    model: '',
    instructions: ''
  };

  // TODO: Tool configuration properties - Will implement later
  /*
  toolConfig: ToolNode = {
    toolName: '',
    toolType: '',
    toolCode: ''
  };
  */

  // Agent configuration options
  isRootAgentEditable: boolean = true;
  selectedAgentType: string = '';
  selectedModel: string = '';
  models = [
    "gemini-2.5-flash"
  ];
  agentTypes = [
    'LlmAgent',
    'LoopAgent',
    'ParallelAgent',
    'SequentialAgent'
  ];

  private agentBuilderService = inject(AgentBuilderService);
  
  protected selectedTool: any = null;
  protected toolCode: string = '';
  protected toolTypes = [
    'Built-in tool'
  ];
  protected header = 'Select an agent or tool to edit'

  constructor() {
    this.agentBuilderService.getSelectedNode().subscribe(node => {
      this.agentConfig = node;
      if (node) {
        this.selectedAgentType = node?.agentType;
        this.selectedModel = node?.model;
        this.header = 'Agent configuration';
      }
    });

    this.agentBuilderService.getSelectedTool().subscribe(tool => {
      this.selectedTool = tool;
      if (tool) {
        this.header = 'Tool configuration'
      }
    });
  }
}
