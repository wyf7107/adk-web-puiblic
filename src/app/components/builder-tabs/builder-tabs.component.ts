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
    name: '',
    agentClass: '',
    model: '',
    instruction: '',
    subAgents: []
  };

  // Agent configuration options
  isRootAgentEditable: boolean = true;

  creatingNewAgent: boolean = true;

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
    ['APIHubToolset', ['apihub_resource_name', 'access_token', 'service_account_json', 'name', 'description', 'lazy_load_spec', 'auth_scheme', 'auth_credential', 'apihub_client', 'tool_filter']],
    ['AuthToolArguments', ['function_call_id', 'auth_config']],
    ['BaseTool', ['name', 'description', 'is_long_running']],
    ['google_search', []],
    ['url_context', []],
    ['VertexAiSearchTool', ['data_store_id', 'data_store_specs', 'search_engine_id', 'filter', 'max_results']],
    ['ExampleTool', ['examples']],
    ['exit_loop', []],
    ['FunctionTool', ['func']],
    ['get_user_choice', []],
    ['load_artifacts', []],
    ['load_memory', []],
    ['LongRunningFunctionTool', ['func']],
    ['preload_memory', []],
    ['ToolContext', ['invocation_context', 'function_call_id', 'event_actions']],
    ['transfer_to_agent', ['agent_name', 'tool_context']],
  ]);
  protected header = 'Select an agent or tool to edit'

  constructor() {
    this.agentBuilderService.getSelectedNode().subscribe(node => {
      this.agentConfig = node;
      if (node) {
        this.header = 'Agent configuration';
      }
    });

    this.agentBuilderService.getSelectedTool().subscribe(tool => {
      this.selectedTool = tool;
      if (tool) {
        this.header = 'Tool configuration'
      }
    });

    this.agentBuilderService.getIsCreatingNewAgent().subscribe(newAgent => {
      if (newAgent) {
        this.creatingNewAgent = true;
      } else {
        this.creatingNewAgent = false;
      }
    })
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
