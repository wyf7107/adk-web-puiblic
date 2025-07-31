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

import { Component, inject, ViewChild, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AgentNode, ToolNode } from '../../core/models/AgentBuilder';
import { AgentBuilderService } from '../../core/services/agent-builder.service';
import {JsonEditorComponent} from '../json-editor/json-editor.component';
import { BehaviorSubject } from 'rxjs';
import { MatTree } from '@angular/material/tree'; // Import MatTree component type

@Component({
  selector: 'app-builder-tabs',
  templateUrl: './builder-tabs.component.html',
  styleUrl: './builder-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class BuilderTabsComponent {
  @ViewChild(JsonEditorComponent) jsonEditorComponent!: JsonEditorComponent;
  @ViewChild(MatTree) matTree!: MatTree<AgentNode>;
  protected toolArgsString = signal('');
  editingToolArgs = signal(false);
  public editingTool: ToolNode | null = null;

  // Agent configuration properties
  agentConfig: AgentNode | undefined = {
    isRoot: false,
    name: '',
    agent_class: '',
    model: '',
    instruction: '',
    sub_agents: [],
    tools: []
  };

  treeDataSource = new BehaviorSubject<AgentNode[]>([]);

  childrenAccessor = (node: AgentNode) => node.sub_agents ?? [];

  hasChild = (_: number, node: AgentNode) => (!!node.sub_agents && node.sub_agents.length > 0) || !!node.isRoot;

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

  constructor(private cdr: ChangeDetectorRef) {
    this.agentBuilderService.getSelectedNode().subscribe(node => {
      this.agentConfig = node;
      if (node) {
        this.header = 'Agent configuration';
        const oldTreeData = this.treeDataSource.value;
        this.treeDataSource.next([]);
        this.treeDataSource.next([node]);
        this.cdr.detectChanges();
        setTimeout(() => {
          // Code to execute after 100 milliseconds
          // Open the root node by default
          if (oldTreeData.length == 0) {
            this.matTree.expand(node);
          }

          // Refresh the tree node once data gets updated
          this.matTree.toggle(node);
          this.matTree.toggle(node);
        }, 100);
       }
    });

    this.agentBuilderService.getSelectedTool().subscribe(tool => {
      this.selectedTool = tool;
      if (tool) {
        this.header = 'Tool configuration';
      } else {
        this.header = 'Select an agent or tool to edit';
      }
      this.cdr.detectChanges();
    });

    this.agentBuilderService.getIsCreatingNewAgent().subscribe(newAgent => {
      if (newAgent) {
        this.creatingNewAgent = true;
      } else {
        this.creatingNewAgent = false;
      }
    });

    this.agentBuilderService.getAgentTools().subscribe(update => {
      if (this.agentConfig && update && this.agentConfig.name === update.agentName) {
        this.agentConfig.tools = update.tools;
        this.cdr.detectChanges();
      }
    });
  }

  selectTool(tool: ToolNode) {
    this.editingTool = tool;
    this.toolArgsString.set(JSON.stringify(this.editingTool.args, null, 2));
    this.editingToolArgs.set(!!this.editingTool.args?.length);
  }
  
  backToToolList() {
    this.editingTool = null;
  }

  editToolArgs() {
    this.editingToolArgs.set(true);
  }

  cancelEditToolArgs(tool: ToolNode | undefined | null) {
    this.editingToolArgs.set(false);
    this.toolArgsString.set(JSON.stringify(tool?.args, null, 2));
  }

  saveToolArgs(tool: ToolNode | undefined | null) {
    if (this.jsonEditorComponent && tool) {
      try {
        const updatedArgs = JSON.parse(this.jsonEditorComponent.getJsonString());
        tool.args = updatedArgs;
        this.toolArgsString.set(JSON.stringify(tool.args, null, 2));
        this.editingToolArgs.set(false);
      } catch (e) {
        console.error('Error parsing tool arguments JSON', e);
      }
    }
  }

  onToolTypeSelectionChange(tool: ToolNode | undefined | null) {
    if (tool?.toolType === 'Built-in tool') {
      tool.name = 'google_search';
      this.onBuiltInToolSelectionChange(tool);
    } else if (tool) {
      tool.name = '';
      tool.args = [];
      this.toolArgsString.set('[]');
      this.editingToolArgs.set(false);
    }
  }

  onBuiltInToolSelectionChange(tool: ToolNode | undefined | null) {
    if (tool) {
      tool.args = [];
      const argNames = this.builtInToolArgs.get(tool.name);
      if (argNames) {
        for (const argName of argNames) {
          tool.args.push({name: argName, value: ''});
        }
        if (tool.args.length > 0) {
          this.editingToolArgs.set(true);
        }
      }
      this.toolArgsString.set(JSON.stringify(tool.args, null, 2));
    }
  }

  trackByFn(index: number, node: AgentNode): string {
    return node.name;
  }
}
