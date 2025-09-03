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

import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild, signal, ChangeDetectionStrategy, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { YamlUtils } from '../../../utils/yaml-utils';
import { AgentNode, ToolNode, CallbackNode } from '../../core/models/AgentBuilder';
import { AgentBuilderService } from '../../core/services/agent-builder.service';
import { AGENT_SERVICE } from '../../core/services/agent.service';
import { AddCallbackDialogComponent } from '../add-callback-dialog/add-callback-dialog.component';
import { AddToolDialogComponent } from '../add-tool-dialog/add-tool-dialog.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../confirmation-dialog/confirmation-dialog.component';
import { JsonEditorComponent } from '../json-editor/json-editor.component';

@Component({
  selector: 'app-builder-tabs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    JsonEditorComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  templateUrl: './builder-tabs.component.html',
  styleUrl: './builder-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuilderTabsComponent {
  // Tab indices
  private readonly CALLBACKS_TAB_INDEX = 3;
  @ViewChild(JsonEditorComponent) jsonEditorComponent!: JsonEditorComponent;
  @Output() exitBuilderMode = new EventEmitter<void>();

  protected toolArgsString = signal('');
  editingToolArgs = signal(false);
  public editingTool: ToolNode | null = null;
  public selectedTabIndex = 0;

  // Agent configuration properties
  agentConfig: AgentNode | undefined = {
    isRoot: false,
    name: '',
    agent_class: '',
    model: '',
    instruction: '',
    sub_agents: [],
    tools: [],
    callbacks: []
  };

  // Breadcrumb tracking
  hierarchyPath: AgentNode[] = [];
  currentSelectedAgent: AgentNode | undefined = undefined;

  // Agent configuration options
  isRootAgentEditable: boolean = true;

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
  private dialog = inject(MatDialog);
  private agentService = inject(AGENT_SERVICE);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  protected selectedTool: ToolNode | undefined = undefined;
  protected toolAgentName: string = '';
  protected toolTypes = [
    'Custom tool',
    'Function tool',
    'Built-in tool',
    'Agent Tool'
  ];

  // Callback-related properties
  public editingCallback: CallbackNode | null = null;
  public selectedCallback: CallbackNode | undefined = undefined;
  public callbackTypes = [
    'before_agent',
    'before_model',
    'before_tool',
    'after_tool',
    'after_model',
    'after_agent',
  ];
  protected builtInTools = [
    'EnterpriseWebSearchTool',
    'exit_loop',
    'FilesRetrieval',
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
  public toolsMap$: Observable<Map<string, ToolNode[]>>;

  private getJsonStringForEditor(args: any): string {
    if (!args) {
      return '{}';
    }
    const editorArgs = { ...args };
    delete editorArgs.skip_summarization;
    return JSON.stringify(editorArgs, null, 2);
  }

  constructor(private cdr: ChangeDetectorRef) {
    this.toolsMap$ = this.agentBuilderService.getAgentToolsMap();
    this.agentBuilderService.getSelectedNode().subscribe(node => {
      this.agentConfig = node;
      this.currentSelectedAgent = node;
      if (node) {
        this.editingTool = null;
        this.editingCallback = null;
        this.header = 'Agent configuration';
        this.updateBreadcrumb(node);
      }
      this.cdr.markForCheck();
    });

    this.agentBuilderService.getSelectedTool().subscribe(tool => {
      this.selectedTool = tool;
      if (tool && tool.toolType === 'Agent Tool') {
        return;
      } else if (tool) {
        this.editingTool = tool;
        this.editingToolArgs.set(false);

        setTimeout(() => {
          const toolName = tool.toolType == "Function tool" ? 'Function tool' : tool.name
          if (tool.toolType == "Function tool" && !tool.name) {
            tool.name = 'Function tool';
          }

          // Initialize args for Custom tools
          if (tool.toolType === 'Custom tool') {
            if (!tool.args) {
              tool.args = {};
            }
            this.toolArgsString.set(this.getJsonStringForEditor(tool.args));
            this.editingToolArgs.set(true);
          } else {
            // Handle Built-in and Function tools
            const argNames = this.builtInToolArgs.get(toolName);
            if (argNames) {
              if (!tool.args) {
                tool.args = {};
              }
              for (const argName of argNames) {
                if(tool.args) tool.args[argName] = '';
              }
            }
            this.toolArgsString.set(this.getJsonStringForEditor(tool.args));
            if (tool.args && this.getObjectKeys(tool.args).length > 0) {
              this.editingToolArgs.set(true);
            }
          }
          this.cdr.markForCheck();
        });

        this.selectedTabIndex = 2;
      } else {
        this.editingTool = null;
      }
      this.cdr.markForCheck();
    });

    this.agentBuilderService.getSelectedCallback().subscribe(callback => {
      this.selectedCallback = callback;
      if (callback) {
        this.selectCallback(callback);
        this.selectedTabIndex = this.CALLBACKS_TAB_INDEX;
      } else {
        this.editingCallback = null;
      }
      this.cdr.markForCheck();
    });

    this.agentBuilderService.getAgentCallbacks().subscribe(update => {
      if (this.agentConfig && update && this.agentConfig.name === update.agentName) {
        // Create a new object reference to ensure change detection works with OnPush strategy
        this.agentConfig = {
          ...this.agentConfig,
          callbacks: update.callbacks
        };
        this.cdr.markForCheck();
      }
    });
    this.agentBuilderService.getSideTabChangeRequest().subscribe(tabName => {
      if (tabName === 'tools') {
        this.selectedTabIndex = 2;
      } else if (tabName === 'config') {
        this.selectedTabIndex = 0;
      }
    });
  }

  getObjectKeys(obj: any): string[] {
    if (!obj) {
      return [];
    }
    return Object.keys(obj).filter(key => key !== 'skip_summarization');
  }

  getCallbacksByType(): Map<string, CallbackNode[]> {
    const callbackGroups = new Map<string, CallbackNode[]>();

    // Initialize groups for all callback types with empty arrays
    this.callbackTypes.forEach(type => {
      callbackGroups.set(type, []);
    });

    // Group callbacks by type if they exist
    if (this.agentConfig?.callbacks) {
      this.agentConfig.callbacks.forEach(callback => {
        const group = callbackGroups.get(callback.type);
        if (group) {
          group.push(callback);
        }
      });
    }

    return callbackGroups;
  }

  private updateBreadcrumb(agent: AgentNode) {
    this.hierarchyPath = this.buildHierarchyPath(agent);
  }

  private buildHierarchyPath(targetAgent: AgentNode): AgentNode[] {
    const path: AgentNode[] = [];

    // Find the appropriate root agent for the current context
    const rootAgent = this.findContextualRoot(targetAgent);
    if (!rootAgent) {
      return [targetAgent];
    }

    if (targetAgent.name === rootAgent.name) {
      return [rootAgent];
    }

    const foundPath = this.findPathToAgent(rootAgent, targetAgent, [rootAgent]);
    return foundPath || [targetAgent];
  }

  private findContextualRoot(targetAgent: AgentNode): AgentNode | undefined {
    if (targetAgent.isAgentTool) {
      return targetAgent;
    }

    // Check if any agent tool contains this target in its hierarchy
    const allNodes = this.agentBuilderService.getNodes();
    for (const node of allNodes) {
      if (node.isAgentTool && this.findPathToAgent(node, targetAgent, [node])) {
        return node;
      }
    }

    const mainRoot = this.agentBuilderService.getRootNode();
    if (mainRoot && this.findPathToAgent(mainRoot, targetAgent, [mainRoot])) {
      return mainRoot;
    }

    // If target itself is the main root
    if (targetAgent.isRoot) {
      return targetAgent;
    }

    // Check if any other root agent contains this target
    for (const node of allNodes) {
      if (node.isRoot && this.findPathToAgent(node, targetAgent, [node])) {
        return node;
      }
    }

    // If still not found, return the main root as fallback
    return mainRoot;
  }

  private findPathToAgent(current: AgentNode, target: AgentNode, currentPath: AgentNode[]): AgentNode[] | null {
    // If we found the target, return the current path
    if (current.name === target.name) {
      return currentPath;
    }

    // Search in sub-agents only
    for (const subAgent of current.sub_agents) {
      const newPath = [...currentPath, subAgent];
      const result = this.findPathToAgent(subAgent, target, newPath);
      if (result) {
        return result;
      }
    }

    return null;
  }

  selectAgentFromBreadcrumb(agent: AgentNode) {
    this.agentBuilderService.setSelectedNode(agent);
    this.selectedTabIndex = 0; // Switch to Config tab
  }

  selectAgent(agent: AgentNode) {
    this.agentBuilderService.setSelectedNode(agent);
    this.selectedTabIndex = 0; // Switch to Config tab
  }

  selectTool(tool: ToolNode) {
    if (tool.toolType === 'Agent Tool') {
      const agentToolName = tool.name;
      this.agentBuilderService.requestNewTab(agentToolName);
      return;
    }

    this.agentBuilderService.setSelectedTool(tool);
  }

  addTool() {
    if (this.agentConfig) {
      const dialogRef = this.dialog.open(AddToolDialogComponent, {
        width: '500px'
      });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            if (result.toolType === 'Agent Tool') {
              // For Agent Tool, show the create agent dialog instead
              this.createAgentTool();
            } else {
              const tool: any = {
                toolType: result.toolType,
                name: result.name
              };

              this.agentBuilderService.addTool(this.agentConfig!.name, tool);

              // Automatically select the newly created tool
              this.agentBuilderService.setSelectedTool(tool);
            }
          }
        });
    }
  }

  addCallback(callbackType: string) {
    if (this.agentConfig) {
      const dialogRef = this.dialog.open(AddCallbackDialogComponent, {
        width: '500px',
        data: { callbackType: callbackType }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          const callback: CallbackNode = {
            name: result.name,
            type: result.type,
          };

          const addResult = this.agentBuilderService.addCallback(this.agentConfig!.name, callback);
          if (!addResult.success) {
            console.error('Failed to add callback:', addResult.error);
          }
        }
      });
    }
  }

  deleteCallback(agentName: string, callback: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Callback',
        message: `Are you sure you want to delete ${callback.name}?`,
        confirmButtonText: 'Delete'
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        const deleteResult = this.agentBuilderService.deleteCallback(agentName, callback);
        if (!deleteResult.success) {
          console.error('Failed to delete callback:', deleteResult.error);
        } else {
          // Force change detection to update the UI immediately
          this.cdr.markForCheck();
        }
      }
    });
  }

  addSubAgent(parentAgentName: string|undefined) {
    if (!parentAgentName) {
      return ;
    }

    this.agentBuilderService.setAddSubAgentSubject(parentAgentName);
  }

  deleteSubAgent(agentName: string) {
    this.agentBuilderService.setDeleteSubAgentSubject(agentName);
  }

  deleteTool(agentName: string, tool: any) {
    const isAgentTool = tool.toolType === 'Agent Tool';
    const toolDisplayName = isAgentTool ? (tool.toolAgentName || tool.name) : tool.name;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: isAgentTool ? 'Delete Agent Tool' : 'Delete Tool',
        message: isAgentTool
          ? `Are you sure you want to delete the agent tool "${toolDisplayName}"? This will also delete the corresponding board.`
          : `Are you sure you want to delete ${toolDisplayName}?`,
        confirmButtonText: 'Delete'
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        if (tool.toolType === 'Agent Tool') {
          const agentToolName = tool.toolAgentName || tool.name;
          this.deleteAgentToolAndBoard(agentName, tool, agentToolName);
        } else {
          this.agentBuilderService.deleteTool(agentName, tool);
        }
      }
    });
  }

  deleteAgentToolAndBoard(agentName: string, tool: any, agentToolName: string) {
    this.agentBuilderService.deleteTool(agentName, tool);

    this.agentBuilderService.requestTabDeletion(agentToolName);
  }


  backToToolList() {
    this.editingTool = null;
    this.agentBuilderService.setSelectedTool(undefined);
  }

  editToolArgs() {
    this.editingToolArgs.set(true);
  }

  cancelEditToolArgs(tool: ToolNode | undefined | null) {
    this.editingToolArgs.set(false);
    this.toolArgsString.set(this.getJsonStringForEditor(tool?.args));
  }

  saveToolArgs(tool: ToolNode | undefined | null) {
    if (this.jsonEditorComponent && tool) {
      try {
        const updatedArgs = JSON.parse(this.jsonEditorComponent.getJsonString());
        const skipSummarization = tool.args ? tool.args['skip_summarization'] : false;
        tool.args = updatedArgs;
        tool.args!['skip_summarization'] = skipSummarization;
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
    } else if (tool?.toolType === 'Custom tool') {
      tool.args = {};
      this.toolArgsString.set(this.getJsonStringForEditor(tool.args));
      this.editingToolArgs.set(true);
    } else if (tool) {
      tool.name = '';
      tool.args = {skip_summarization: false};
      this.toolArgsString.set('{}');
      this.editingToolArgs.set(false);
    }
  }

  onBuiltInToolSelectionChange(tool: ToolNode | undefined | null) {
    if (tool) {
      // Force re-initialization of the JSON editor by toggling the signal
      this.editingToolArgs.set(false);

      setTimeout(() => {
        tool.args = {skip_summarization: false};
        const argNames = this.builtInToolArgs.get(tool.name);
        if (argNames) {
          for (const argName of argNames) {
            if(tool.args) tool.args[argName] = '';
          }
        }
        this.toolArgsString.set(this.getJsonStringForEditor(tool.args));
        if (tool.args && this.getObjectKeys(tool.args).length > 0) {
          this.editingToolArgs.set(true);
        }
        this.cdr.markForCheck();
      });
    }
  }

  selectCallback(callback: CallbackNode) {
    this.editingCallback = callback;
  }

  backToCallbackList() {
    this.editingCallback = null;
  }

  onCallbackTypeChange(callback: CallbackNode | undefined | null) {
    if (callback) {
      // Type is already set by the select binding
      // Additional logic can be added here if needed
    }
  }

  createAgentTool() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '750px',
      height: '310px',
      data: {
        title: 'Create Agent Tool',
        message: 'Please enter a name for the agent tool:',
        confirmButtonText: 'Create',
        showInput: true,
        inputLabel: 'Agent Tool Name',
        inputPlaceholder: 'Enter agent tool name'
      } as ConfirmationDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && typeof result === 'string') {
        let currentAgentName = this.agentConfig?.name || 'root_agent';

        this.agentBuilderService.requestNewTab(result, currentAgentName);
      }
    });
  }

  saveChanges() {
    const rootAgent = this.agentBuilderService.getRootNode();

    if (!rootAgent) {
      this.snackBar.open("Please create an agent first.", "OK");
      return;
    }

    // Get app name from agent service
    this.agentService.getApp().subscribe(appName => {
      if (appName) {
        this.saveAgent(appName);
      }
    });
  }

  cancelChanges() {
    this.exitBuilderMode.emit();
  }

  private saveAgent(appName: string) {
    const rootAgent = this.agentBuilderService.getRootNode();

    if (!rootAgent) {
      this.snackBar.open("Please create an agent first.", "OK");
      return;
    }

    const formData = new FormData();

    const tabAgents = this.agentBuilderService.getCurrentAgentToolBoards();

    YamlUtils.generateYamlFile(rootAgent, formData, appName, tabAgents);

    this.agentService.agentBuild(formData).subscribe((success) => {
      if (success) {
        this.router.navigate(['/'], {
          queryParams: { app: appName }
        }).then(() => {
          window.location.reload();
        });
      } else {
        this.snackBar.open("Something went wrong, please try again", "OK");
      }
    });
  }
}
