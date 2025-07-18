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
  
  protected selectedTool: ToolNode | undefined = undefined;
  protected toolCode: string = '';
  protected toolTypes = [
    'Custom tool',
    'Built-in tool'
  ];
  protected builtInTools = [
    'APIHubToolset',
    'AuthToolArguments',
    'BaseTool',
    'google_search',
    'url_context',
    'VertexAiSearchTool',
    'ExampleTool',
    'exit_loop',
    'FunctionTool',
    'get_user_choice',
    'load_artifacts',
    'load_memory',
    'LongRunningFunctionTool',
    'preload_memory',
    'ToolContext',
    'transfer_to_agent',
  ];
  protected builtInToolArgs = new Map<string, string[]>([
    ['APIHubToolset', ['api_specs']],
    ['google_search', ['query']],
    ['url_context', ['url', 'is_html']],
    ['VertexAiSearchTool', ['query', 'datastore_id', 'max_results']],
    ['exit_loop', ['result']],
    ['get_user_choice', ['choices']],
    ['load_artifacts', ['artifact_names']],
    ['load_memory', ['keys']],
    ['preload_memory', ['data_to_load']],
    ['transfer_to_agent', ['agent', 'inputs']],
  ]);
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

  onToolTypeSelectionChange() {
    if (this.selectedTool?.toolType === 'Built-in tool') {
      this.selectedTool.toolName = 'google_search';
    }
  }

  onBuiltInToolSelectionChange() {
    if (this.selectedTool) {
      this.selectedTool.toolArgs = [];
      const argNames = this.builtInToolArgs.get(this.selectedTool.toolName);
      if (argNames) {
        for (const argName of argNames) {
          this.selectedTool.toolArgs.push({name: argName, value: ''});
        }
      }
    }
  }
}
