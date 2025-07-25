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

import { Component, inject, ViewChild } from '@angular/core';
import { AgentNode, ToolNode } from '../../core/models/AgentBuilder';
import { AgentBuilderService } from '../../core/services/agent-builder.service';
import {JsonEditorComponent} from '../json-editor/json-editor.component'

@Component({
  selector: 'app-builder-tabs',
  templateUrl: './builder-tabs.component.html',
  styleUrl: './builder-tabs.component.scss',
  standalone: false
})
export class BuilderTabsComponent {
  @ViewChild(JsonEditorComponent) jsonEditorComponent!: JsonEditorComponent;
  protected toolArgsString: string = '';

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
    'AgentTool',
    'EnterpriseWebSearchTool',
    'exit_loop',
    'FilesRetrieval',
    'FunctionTool',
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
  protected builtInToolArgs = new Map<string, string[]>([
    ['AgentTool', ['agent', 'skip_summarization']],
    ['EnterpriseWebSearchTool', []],
    ['exit_loop', []],
    ['FilesRetrieval', ['name', 'description', 'input_dir']],
    ['FunctionTool', ['func']],
    ['get_user_choice', []],
    ['google_search', []],
    ['load_artifacts', []],
    ['load_memory', []],
    ['LongRunningFunctionTool', ['func']],
    ['preload_memory', []],
    ['url_context', []],
    ['VertexAiRagRetrieval', ['name', 'description', 'rag_corpora', 'rag_resources', 'similarity_top_k', 'vector_distance_threshold']],
    ['VertexAiSearchTool', ['data_store_id', 'data_store_specs', 'search_engine_id', 'filter', 'max_results']],
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
      this.toolArgsString = JSON.stringify(this.selectedTool.toolArgs, null, 2);
    }
  }
}
