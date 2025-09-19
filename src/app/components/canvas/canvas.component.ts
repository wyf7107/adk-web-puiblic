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

import {Component, ElementRef, ViewChild, AfterViewInit, OnInit, OnChanges, SimpleChanges, inject, signal, Input, Output, EventEmitter, ChangeDetectorRef} from '@angular/core';
import { DiagramConnection, AgentNode, ToolNode, CallbackNode, YamlConfig } from '../../core/models/AgentBuilder';
import { MatDialog } from '@angular/material/dialog';
import { AgentService } from '../../core/services/agent.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Vflow, HtmlTemplateDynamicNode, Edge } from 'ngx-vflow';
import { MatIcon } from '@angular/material/icon';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MatTooltip } from '@angular/material/tooltip';
import { AGENT_BUILDER_SERVICE } from '../../core/services/agent-builder.service';
import * as YAML from 'yaml';
import { parse } from 'yaml';
import { firstValueFrom, take, filter, Observable } from 'rxjs';
import { YamlUtils } from '../../../utils/yaml-utils';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { AddToolDialogComponent } from '../add-tool-dialog/add-tool-dialog.component';
import { AsyncPipe } from '@angular/common';
import { BuilderAssistantComponent } from '../builder-assistant/builder-assistant.component';


@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss',
  standalone: true,
  imports: [
    Vflow,
    MatIcon,
    MatChip,
    MatChipSet,
    MatTooltip,
    AsyncPipe,
    BuilderAssistantComponent,
  ],
})
export class CanvasComponent implements AfterViewInit, OnInit, OnChanges {
  private _snackBar = inject(MatSnackBar);
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('svgCanvas', { static: false }) svgCanvasRef!: ElementRef<SVGElement>;
  private agentBuilderService = inject(AGENT_BUILDER_SERVICE);
  private cdr = inject(ChangeDetectorRef);

  @Input() showSidePanel: boolean = true;
  @Input() showBuilderAssistant: boolean = false;
  @Input() appNameInput: string = '';
  @Output() toggleSidePanelRequest = new EventEmitter<void>();
  @Output() builderAssistantCloseRequest = new EventEmitter<void>();

  private ctx!: CanvasRenderingContext2D;
  //public nodes = signal<DiagramNode[]>([]);
  public connections = signal<DiagramConnection[]>([]);

  nodeId = 1;
  edgeId = 1;
  callbackId = 1;
  toolId = 1;

  public appName = '';

  public nodes = signal<HtmlTemplateDynamicNode[]>([]);

  public edges = signal<Edge[]>([]);

  public selectedAgents: HtmlTemplateDynamicNode[] = [];

  public selectedTool: any;
  public selectedCallback: any;

  public currentAgentTool = signal<string | null>(null);
  public agentToolBoards = signal<Map<string, AgentNode>>(new Map());
  private isAgentToolMode = false;
  private navigationStack: string[] = [];

  existingAgent: string | undefined = undefined;
  public toolsMap$: Observable<Map<string, ToolNode[]>>;


  constructor(
    private dialog: MatDialog,
    private agentService: AgentService,
    private router: Router
  ) {
    this.toolsMap$ = this.agentBuilderService.getAgentToolsMap();
    this.agentBuilderService.getSelectedTool().subscribe(tool => {
      this.selectedTool = tool;
    });
  }

  ngOnInit() {
    this.agentService.getApp().subscribe((app) => {
      if (app) {
        this.appName = app;
      }
    });

    // Use input parameter if provided
    if (this.appNameInput) {
      this.appName = this.appNameInput;
    }
    this.agentBuilderService.getNewTabRequest().subscribe(request => {
      if (request) {
        const {tabName, currentAgentName} = request;
        this.switchToAgentToolBoard(tabName, currentAgentName);
      }
    });

    this.agentBuilderService.getTabDeletionRequest().subscribe(agentToolName => {
      if (agentToolName) {
        this.deleteAgentToolBoard(agentToolName);
      }
    });

    this.agentBuilderService.getSelectedCallback().subscribe(callback => {
      this.selectedCallback = callback;
    });
    this.agentBuilderService.getAgentCallbacks().subscribe(update => {
      if (update) {
        const node = this.nodes().find(node => node.data ? node.data().name === update.agentName : undefined);
        if (node && node.data) {
          const data = node.data();
          data.callbacks = update.callbacks;
          node.data.set(data);
        }
      }
    });

    this.agentBuilderService.getDeleteSubAgentSubject().subscribe((agentName) => {
      if (!agentName) {
        return ;
      }

      this.openDeleteSubAgentDialog(agentName);
    });

    this.agentBuilderService.getAddSubAgentSubject().subscribe((parentAgentName) => {
      this.addSubAgent(parentAgentName);
    });

    this.agentBuilderService.getSelectedNode().subscribe(selectedAgentNode => {
      this.selectedAgents = this.nodes().filter(node => node.data && node.data().name === selectedAgentNode?.name);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['appNameInput'] && changes['appNameInput'].currentValue) {
      this.appName = changes['appNameInput'].currentValue;
    }
  }

  ngAfterViewInit() {
  }

  onCustomTemplateNodeClick(
    clickedVflowNode: HtmlTemplateDynamicNode,
    event: MouseEvent,
  ) {
    if (!clickedVflowNode.data) {
      return;
    }

    // If the click is on a tool, the selectTool method will handle it
    if ((event.target as HTMLElement).closest('mat-chip')) {
      return;
    }

    const agentNodeData = this.agentBuilderService.getNode(
      clickedVflowNode.data().name,
    );

    if (!!agentNodeData) {
      this.agentBuilderService.setSelectedTool(undefined);
      this.agentBuilderService.setSelectedNode(agentNodeData);
      this.agentBuilderService.requestSideTabChange('config');
      // this.agentBuilderService.setAgentTools(
      //   agentNodeData.name,
      //   agentNodeData.tools || [],
      // );
    }
  }

  onAddResource(nodeId: string) {
    // This method can be used for general resource addition logic
  }

  addSubAgent(parentAgentName: string) {
    // Find the parent node
    const parentNode: HtmlTemplateDynamicNode = this.nodes().find(node => node.data && node.data().name === parentAgentName) as HtmlTemplateDynamicNode;
    if (!parentNode || !parentNode.data) return;

    const newAgentName = this.agentBuilderService.getNextSubAgentName();

    const agentNodeData: AgentNode = {
        name: newAgentName,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'You are a sub-agent that performs specialized tasks.',
        isRoot: false,
        sub_agents: [],
        tools: []
      };

    const subAgentIndex = parentNode.data().sub_agents.length;

    const subAgentNode: HtmlTemplateDynamicNode = {
      id: newAgentName,
      point: signal({
        x: parentNode.point().x + subAgentIndex * 400 + 50,
        y: parentNode.point().y + 150 + 50 // Position below the parent
      }),
      type: 'html-template',
      data: signal(agentNodeData)
    };

    // Add the new node
    this.nodes.set([...this.nodes(), subAgentNode]);

    this.agentBuilderService.addNode(agentNodeData);

    const parentAgentNode: AgentNode|undefined = parentNode.data ? this.agentBuilderService.getNode(parentNode.data().name) : undefined;
    if (!!parentAgentNode) {
      parentAgentNode.sub_agents.push(agentNodeData);
    }

    // Create an edge connecting the parent to the sub-agent
    this.edgeId++;
    const edge: Edge = {
      id: this.edgeId.toString(),
      source: parentNode.id,
      target: subAgentNode.id,
    };

    // Add the edge
    this.edges.set([...this.edges(), edge]);

    // Auto-select the newly created sub-agent and switch to Config tab
    this.agentBuilderService.setSelectedNode(agentNodeData);
    this.agentBuilderService.requestSideTabChange('config');
  }

  addTool(parentNodeId: string) {
    // Find the parent node
    const parentNode = this.nodes().find(node => node.id === parentNodeId) as HtmlTemplateDynamicNode;
    if (!parentNode) return;
    if (!parentNode.data) return;

    // Get parent data
    const parentData = parentNode.data();
    if (!parentData) return;

    const dialogRef = this.dialog.open(AddToolDialogComponent, {
      width: '500px'
    });

         dialogRef.afterClosed().subscribe(result => {
       if (result) {
         if (result.toolType === 'Agent Tool') {
           // For Agent Tool, show the create agent dialog instead
           this.createAgentTool(parentData.name);
         } else {
           const tool: any = {
             toolType: result.toolType,
             name: result.name
           };

           this.agentBuilderService.addTool(parentData.name, tool);

           // Automatically select the newly created tool
           this.agentBuilderService.setSelectedTool(tool);
         }
       }
     });
  }

  addCallback(parentNodeId: string) {
    // Find the parent node
    const parentNode = this.nodes().find(node => node.id === parentNodeId) as HtmlTemplateDynamicNode;
    if (!parentNode) return;
    if (!parentNode.data) return;

    const callback = {
      name: `callback_${this.callbackId}`,
      type: 'before_agent' as const,
      code: 'def callback_function(callback_context):\n    # Add your callback logic here\n    return None',
      description: 'Auto-generated callback'
    }
    this.callbackId++;

    const result = this.agentBuilderService.addCallback(parentNode.data().name, callback);
    if (!result.success) {
      this._snackBar.open(result.error || 'Failed to add callback', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  createAgentTool(parentAgentName: string) {
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
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && typeof result === 'string') {
        this.agentBuilderService.requestNewTab(result, parentAgentName);
      }
    });
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
        this.deleteToolWithoutDialog(agentName, tool);
      }
    });
  }

  private deleteToolWithoutDialog(agentName: string, tool: any) {
    if (tool.toolType === 'Agent Tool') {
      const agentToolName = tool.toolAgentName || tool.name;
      this.deleteAgentToolAndBoard(agentName, tool, agentToolName);
    } else {
      this.agentBuilderService.deleteTool(agentName, tool);
    }
  }

  deleteAgentToolAndBoard(agentName: string, tool: any, agentToolName: string) {
    this.agentBuilderService.deleteTool(agentName, tool);

    this.agentBuilderService.requestTabDeletion(agentToolName);
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
          this._snackBar.open(deleteResult.error || 'Failed to delete callback', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
        this.cdr.detectChanges();
      }
    });
  }

  openDeleteSubAgentDialog(agentName: string) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete sub agent',
        message: `Are you sure you want to delete ${agentName}? This will also delete all the underlying sub agents and tools.`,
        confirmButtonText: 'Delete'
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.deleteSubAgent(agentName);
      }
    });
  }

  deleteSubAgent(agentName: string) {
    const currentNode: AgentNode|undefined = this.agentBuilderService.getNode(agentName);

    if (!currentNode) {
      return ;
    }

    const parentNode = this.agentBuilderService.getParentNode(
      this.agentBuilderService.getRootNode(),
      currentNode,
      undefined,
      this.agentToolBoards()
    );

    if (!parentNode) {
      return ;
    }

    const parentTemplateNode = this.nodes().find(node => !!node.data && node.data().name === parentNode.name);

    this.deleteSubAgentHelper(currentNode, parentNode);

    // select the parent node if the current selected node is deleted
    this.agentBuilderService.getSelectedNode()
      .pipe(take(1), filter(node => !!node))
      .subscribe(node => {
        if (!this.agentBuilderService.getNodes().includes(node)) {
          this.agentBuilderService.setSelectedNode(parentNode);
        }
      })
  }

  deleteSubAgentHelper(agentNode: AgentNode|undefined, parentNode: AgentNode) {
    if (!agentNode) {
      return ;
    }

    // recursive until it's leaf node
    for (const subAgent of agentNode.sub_agents) {
      this.deleteSubAgentHelper(subAgent, agentNode);
    }

    // it's leaf node
    for (const tool of agentNode.tools ?? []) {
      this.deleteToolWithoutDialog(agentNode.name, tool);
    }

    const subAgentNodeId = this.nodes().find(node => node.data && node.data().name === agentNode.name)?.id;

    //delte node and edge data in the canvas
    const newNodes = this.nodes().filter((node: HtmlTemplateDynamicNode) => {
      return node.data ? node.data().name !== agentNode.name : false;
    });

    this.nodes.set(newNodes);

    const newEdges = this.edges().filter(edge => edge.target !== subAgentNodeId);
    this.edges.set(newEdges);

    parentNode.sub_agents = parentNode.sub_agents.filter(subagent => subagent.name !== agentNode.name);

    // delete node data in builder service
    this.agentBuilderService.deleteNode(agentNode);
  }

  selectTool(tool: any, node: HtmlTemplateDynamicNode) {
    if (tool.toolType === 'Agent Tool') {
      const agentToolName = tool.name;
      this.switchToAgentToolBoard(agentToolName);
      return;
    }

    if (node.data) {
      const agentNodeData = this.agentBuilderService.getNode(node.data().name);
      if (agentNodeData) {
        this.agentBuilderService.setSelectedNode(agentNodeData);
      }
    }
    this.agentBuilderService.setSelectedTool(tool);
  }

  selectCallback(callback: any, node: HtmlTemplateDynamicNode) {
    if (node.data) {
      const agentNodeData = this.agentBuilderService.getNode(node.data().name);
      if (agentNodeData) {
        this.agentBuilderService.setSelectedNode(agentNodeData);
      }
    }
    this.agentBuilderService.setSelectedCallback(callback);
  }
  openToolsTab(node: HtmlTemplateDynamicNode) {
    if (node.data) {
      const agentNodeData = this.agentBuilderService.getNode(node.data().name);
      if (agentNodeData) {
        this.agentBuilderService.setSelectedNode(agentNodeData);
      }
    }
    this.agentBuilderService.requestSideTabChange('tools');
  }

  saveAgent(appName: string) {
    const rootAgent: AgentNode|undefined = this.agentBuilderService.getRootNode();

    if (!rootAgent) {
      this._snackBar.open("Please create an agent first.", "OK");
      return;
    }

    const formData = new FormData();

    const agentToolBoards = this.agentToolBoards();
    YamlUtils.generateYamlFile(rootAgent, formData, appName, agentToolBoards);

    this.agentService.agentBuild(formData).subscribe((success) => {
      if (success) {
        this.router.navigate(['/'], {
          queryParams: { app: appName }
        }).then(() => {
          window.location.reload();
        });
      } else {
        this._snackBar.open("Something went wrong, please try again", "OK");
      }
    })
  }

  isRootAgent(agentName: string): boolean {
    const rootAgent = this.agentBuilderService.getRootNode();

    if (!rootAgent) {
      return false;
    }

    return rootAgent.name === agentName;
  }

  isRootAgentForCurrentTab(agentName: string): boolean {
    if (this.isAgentToolMode && this.currentAgentTool()) {
      return agentName === this.currentAgentTool();
    }

    return this.isRootAgent(agentName);
  }

  loadFromYaml(yamlContent: string, appName: string) {
    try {
      // Parse the YAML content
      const yamlData = YAML.parse(yamlContent);

      this.agentBuilderService.clear();
      this.agentToolBoards.set(new Map());
      this.agentBuilderService.setAgentToolBoards(new Map());
      this.currentAgentTool.set(null);
      this.isAgentToolMode = false;
      this.navigationStack = [];

      // Create root agent from YAML
      const rootAgent: AgentNode = {
        name: yamlData.name || 'root_agent',
        agent_class: yamlData.agent_class || 'LlmAgent',
        model: yamlData.model || 'gemini-2.5-flash',
        instruction: yamlData.instruction || '',
        isRoot: true,
        sub_agents: yamlData.sub_agents || [],
        tools: this.parseToolsFromYaml(yamlData.tools || []),
        callbacks: this.parseCallbacksFromYaml(yamlData)
      };

      // Add to agent builder service
      this.agentBuilderService.addNode(rootAgent);
      this.agentBuilderService.setSelectedNode(rootAgent);

      this.processAgentToolsFromYaml(rootAgent.tools || [], appName);

      this.loadAgentBoard(rootAgent);

    } catch (error) {
      console.error('Error parsing YAML:', error);
    }
  }

  private parseToolsFromYaml(tools: any[]): ToolNode[] {
    return tools.map(tool => {
      const toolNode: ToolNode = {
        name: tool.name,
        toolType: this.determineToolType(tool),
        toolAgentName: tool.name
      };

      // Handle agent tools - extract the actual agent name from config_path
      if (tool.name === 'AgentTool' && tool.args && tool.args.agent && tool.args.agent.config_path) {
        toolNode.toolType = 'Agent Tool';
        // Extract the agent name from the config_path (e.g., "./at1.yaml" -> "at1")
        const configPath = tool.args.agent.config_path;
        const agentName = configPath.replace('./', '').replace('.yaml', '');
        toolNode.name = agentName; // Use the actual agent name
        toolNode.toolAgentName = agentName;
        toolNode.args = tool.args;
      } else if (tool.args) {
        toolNode.args = tool.args;
      }
      return toolNode;
    });
  }

  private parseCallbacksFromYaml(yamlData: any): CallbackNode[] {
    const callbacks: CallbackNode[] = [];

    // Look for callback groups at the root level
    Object.keys(yamlData).forEach(key => {
      if (key.endsWith('_callbacks') && Array.isArray(yamlData[key])) {
        const callbackType = key.replace('_callbacks', '');

        yamlData[key].forEach((callbackData: any) => {
          if (callbackData.name) {
            callbacks.push({
              name: callbackData.name,
              type: callbackType as any,
            });
          }
        });
      }
    });

    return callbacks;
  }

  private determineToolType(tool: any): string {
    if (tool.name === 'AgentTool' && tool.args && tool.args.agent) {
      return 'Agent Tool';
    } else if (tool.name && tool.name.includes('.') && tool.args) {
      return 'Custom tool';
    } else if (tool.name && tool.name.includes('.') && !tool.args) {
      return "Function tool";
    } else {
      return 'Built-in tool';
    }
  }

  private processAgentToolsFromYaml(tools: ToolNode[], appName: string) {
    const agentTools = tools.filter(tool => tool.toolType === 'Agent Tool');

    for (const agentTool of agentTools) {
      // Create board for agent tool
      const agentToolBoards = this.agentToolBoards();
      if (!agentToolBoards.has(agentTool.name)) {
        // Try to load the agent tool's YAML file to get its actual configuration
        this.loadAgentToolConfiguration(agentTool, appName);
      }
    }
  }

  private loadAgentToolConfiguration(agentTool: ToolNode, appName: string) {
    const agentToolName = agentTool.name;
    // Try to fetch the agent tool's YAML file
    this.agentService.getSubAgentBuilder(appName, `${agentToolName}.yaml`).subscribe({
      next: (yamlContent: string) => {
        if (yamlContent) {
          try {
            const yamlData = YAML.parse(yamlContent);

            const agentToolAgent: AgentNode = {
              name: yamlData.name || agentToolName,
              agent_class: yamlData.agent_class || 'LlmAgent',
              model: yamlData.model || 'gemini-2.5-flash',
              instruction: yamlData.instruction || `You are the ${agentToolName} agent that can be used as a tool by other agents.`,
              isRoot: false,
              sub_agents: yamlData.sub_agents || [],
              tools: this.parseToolsFromYaml(yamlData.tools || []),
              callbacks: this.parseCallbacksFromYaml(yamlData),
              isAgentTool: true,
              skip_summarization: !!agentTool.args?.['skip_summarization'],
            };

            const currentAgentToolBoards = this.agentToolBoards();
            currentAgentToolBoards.set(agentToolName, agentToolAgent);
            this.agentToolBoards.set(currentAgentToolBoards);
            this.agentBuilderService.setAgentToolBoards(currentAgentToolBoards);

            this.agentBuilderService.addNode(agentToolAgent);

            this.processAgentToolsFromYaml(agentToolAgent.tools || [], appName);

            if (agentToolAgent.sub_agents && agentToolAgent.sub_agents.length > 0) {
              for (const subAgent of agentToolAgent.sub_agents) {
                if (subAgent.config_path) {
                  this.agentService.getSubAgentBuilder(appName, subAgent.config_path).subscribe(a => {
                    if (a) {
                      const yamlData = YAML.parse(a) as AgentNode;
                      this.processAgentToolsFromYaml(this.parseToolsFromYaml(yamlData.tools || []), appName)
                    }
                  })
                }
              }
            }
          } catch (error) {
            console.error(`Error parsing YAML for agent tool ${agentToolName}:`, error);
            this.createDefaultAgentToolConfiguration(agentTool);
          }
        } else {
          this.createDefaultAgentToolConfiguration(agentTool);
        }
      },
      error: (error) => {
        console.error(`Error loading agent tool configuration for ${agentToolName}:`, error);
        this.createDefaultAgentToolConfiguration(agentTool);
      }
    });
  }

  private createDefaultAgentToolConfiguration(agentTool: ToolNode) {
    const agentToolName = agentTool.name;
    const agentToolAgent: AgentNode = {
      name: agentToolName,
      agent_class: 'LlmAgent',
      model: 'gemini-2.5-flash',
      instruction: `You are the ${agentToolName} agent that can be used as a tool by other agents.`,
      isRoot: false,
      sub_agents: [],
      tools: [],
      isAgentTool: true,
      skip_summarization: !!agentTool.args?.['skip_summarization'],
    };

    const currentAgentToolBoards = this.agentToolBoards();
    currentAgentToolBoards.set(agentToolName, agentToolAgent);
    this.agentToolBoards.set(currentAgentToolBoards);
    this.agentBuilderService.setAgentToolBoards(currentAgentToolBoards);

    this.agentBuilderService.addNode(agentToolAgent);
  }



  loadAgentTools(agent: AgentNode) {
    if (!agent.tools) {
      agent.tools = []
    } else {
      // Filter out any tools with empty names
      agent.tools = agent.tools.filter(tool => tool.name && tool.name.trim() !== '');
      agent.tools.map(tool => {
        // Preserve Agent Tool type if already set
        if (tool.toolType === 'Agent Tool') {
          return; // Don't override Agent Tool type
        }
        if (tool.name.includes('.') && tool.args) {
          tool.toolType = 'Custom tool';
        } else if (tool.name.includes('.') && !tool.args) {
          tool.toolType =  "Function tool";
        } else {
          tool.toolType = "Built-in tool"
        }
      })
    }
  }

  isNodeSelected(node: HtmlTemplateDynamicNode): boolean {
    return this.selectedAgents.includes(node);
  }

  async loadSubAgents(appName: string, rootAgent: AgentNode) {
    type BFSItem = {
      node: AgentNode;
      depth: number;
      index: number;
      parentId?: string;
      parentAgent?: AgentNode;
    };
    const queue: BFSItem[] = [{ node: rootAgent, depth: 1, index: 1, parentId: undefined, parentAgent: undefined }];

    const nodes: HtmlTemplateDynamicNode[] = [];
    const edges: Edge[] = [];
    let nodeIdCounter = 0;
    let edgeIdCounter = 0;

    while (queue.length > 0) {
      const { node, depth, index, parentId, parentAgent } = queue.shift()!;

      let agentData = node;
      if (node.config_path) {
        try {
          const subAgentData = await firstValueFrom(this.agentService.getSubAgentBuilder(appName, node.config_path));
          agentData = parse(subAgentData) as AgentNode;
          if (agentData.tools) {
            agentData.tools = this.parseToolsFromYaml(agentData.tools || [])
          }

          this.processAgentToolsFromYaml(agentData.tools || [], appName);
        } catch (e) {
          console.error(`Failed to load agent from ${node.config_path}`, e);
          continue;
        }
      }

      if (parentAgent && parentAgent.sub_agents) {
        const subAgentIndex = parentAgent.sub_agents.indexOf(node);
        if (subAgentIndex !== -1) {
          parentAgent.sub_agents[subAgentIndex] = agentData;
          this.agentBuilderService.addNode(parentAgent);
        }
      }

      this.agentBuilderService.addNode(agentData);

      nodeIdCounter++;
      const currentNodeId = nodeIdCounter.toString();

      const vflowNode: HtmlTemplateDynamicNode = {
        id: currentNodeId,
        point: signal({
          x: (index - 1) * 350 + 50,
          y: depth * 150 + 50,
        }),
        type: 'html-template',
        data: signal(agentData),
      };

      if (!parentId) {
        vflowNode.point.set({ x: 100, y: 150 });
      }

      nodes.push(vflowNode);

      if (parentId) {
        edgeIdCounter++;
        const edge: Edge = {
          id: edgeIdCounter.toString(),
          source: parentId,
          target: currentNodeId,
        };
        edges.push(edge);
      }

      if (agentData.sub_agents && agentData.sub_agents.length > 0) {
        let subIndex = 1;
        for (const sub of agentData.sub_agents) {
          queue.push({
            node: sub,
            parentId: currentNodeId,
            depth: depth + 1,
            index: subIndex,
            parentAgent: agentData,
          });
          subIndex++;
        }
      }
    }

    this.nodes.set(nodes);
    this.edges.set(edges);
    this.nodeId = nodeIdCounter;
    this.edgeId = edgeIdCounter;
  }

  switchToAgentToolBoard(agentToolName: string, currentAgentName?: string) {
    const currentContext = this.currentAgentTool() || 'main';
    if (currentContext !== agentToolName) {
      this.navigationStack.push(currentContext);
    }

    const agentToolBoards = this.agentToolBoards();
    let agentToolAgent = agentToolBoards.get(agentToolName);

    if (!agentToolAgent) {
      agentToolAgent = {
        isRoot: false,
        name: agentToolName,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: `You are the ${agentToolName} agent that can be used as a tool by other agents.`,
        sub_agents: [],
        tools: [],
        isAgentTool: true,
        skip_summarization: false,
      };

      const newAgentToolBoards = new Map(agentToolBoards);
      newAgentToolBoards.set(agentToolName, agentToolAgent);
      this.agentToolBoards.set(newAgentToolBoards);
      this.agentBuilderService.setAgentToolBoards(newAgentToolBoards);

      if (currentAgentName) {
        this.addAgentToolToAgent(agentToolName, currentAgentName);
      } else {
        this.addAgentToolToRoot(agentToolName);
      }
    }

    this.currentAgentTool.set(agentToolName);
    this.isAgentToolMode = true;
    this.loadAgentBoard(agentToolAgent);

    this.agentBuilderService.setSelectedNode(agentToolAgent);
    this.agentBuilderService.requestSideTabChange('config');
  }

  backToMainCanvas() {
    if (this.navigationStack.length > 0) {
      const parentContext = this.navigationStack.pop();

      if (parentContext === 'main') {
        this.currentAgentTool.set(null);
        this.isAgentToolMode = false;

        const rootAgent = this.agentBuilderService.getRootNode();
        if (rootAgent) {
          this.loadAgentBoard(rootAgent);

          this.agentBuilderService.setSelectedNode(rootAgent);
          this.agentBuilderService.requestSideTabChange('config');
        }
      } else {
        const agentToolBoards = this.agentToolBoards();
        const parentAgent = agentToolBoards.get(parentContext!);

        if (parentAgent) {
          this.currentAgentTool.set(parentContext!);
          this.isAgentToolMode = true;
          this.loadAgentBoard(parentAgent);

          this.agentBuilderService.setSelectedNode(parentAgent);
          this.agentBuilderService.requestSideTabChange('config');
        }
      }
    } else {
      this.currentAgentTool.set(null);
      this.isAgentToolMode = false;

      const rootAgent = this.agentBuilderService.getRootNode();
      if (rootAgent) {
        this.loadAgentBoard(rootAgent);

        this.agentBuilderService.setSelectedNode(rootAgent);
        this.agentBuilderService.requestSideTabChange('config');
      }
    }
  }

  async loadAgentBoard(agent: AgentNode) {
    this.nodes.set([]);
    this.edges.set([]);

    this.nodeId = 1;
    this.edgeId = 1;

    this.loadAgentTools(agent);
    this.agentBuilderService.addNode(agent);

    if (agent.tools && agent.tools.length > 0) {
      this.agentBuilderService.setAgentTools(agent.name, agent.tools);
    } else {
      this.agentBuilderService.setAgentTools(agent.name, []);
    }

    if (agent.sub_agents && agent.sub_agents.length > 0) {
      await this.loadSubAgents(this.appName, agent);
    } else {
      const agentNode: HtmlTemplateDynamicNode = {
        id: this.nodeId.toString(),
        point: signal({ x: 100, y: 150 }),
        type: 'html-template',
        data: signal(agent)
      };
      this.nodes.set([agentNode]);
    }
    this.agentBuilderService.setSelectedNode(agent);
  }

  addAgentToolToAgent(agentToolName: string, targetAgentName: string) {
    const targetAgent = this.agentBuilderService.getNode(targetAgentName);

    if (targetAgent) {
      if (targetAgent.tools && targetAgent.tools.some(tool => tool.name === agentToolName)) {
        return;
      }

      const agentTool: ToolNode = {
        name: agentToolName,
        toolType: 'Agent Tool',
        toolAgentName: agentToolName
      };

      if (!targetAgent.tools) {
        targetAgent.tools = [];
      }
      targetAgent.tools.push(agentTool);
      targetAgent.tools = targetAgent.tools.filter(tool => tool.name && tool.name.trim() !== '');

      this.agentBuilderService.setAgentTools(targetAgentName, targetAgent.tools);
    }
  }

  addAgentToolToRoot(agentToolName: string) {
    const rootAgent = this.agentBuilderService.getRootNode();
    if (rootAgent) {
      if (rootAgent.tools && rootAgent.tools.some(tool => tool.name === agentToolName)) {
        return;
      }

      const agentTool: ToolNode = {
        name: agentToolName,
        toolType: 'Agent Tool',
        toolAgentName: agentToolName
      };

      if (!rootAgent.tools) {
        rootAgent.tools = [];
      }
      rootAgent.tools.push(agentTool);

      this.agentBuilderService.setAgentTools('root_agent', rootAgent.tools);
    }
  }

  deleteAgentToolBoard(agentToolName: string) {
    const agentToolBoards = this.agentToolBoards();
    const newAgentToolBoards = new Map(agentToolBoards);
    newAgentToolBoards.delete(agentToolName);
    this.agentToolBoards.set(newAgentToolBoards);
    this.agentBuilderService.setAgentToolBoards(newAgentToolBoards);

    const allNodes = this.agentBuilderService.getNodes();
    for (const agent of allNodes) {
      if (agent.tools) {
        agent.tools = agent.tools.filter(t =>
          !(t.toolType === 'Agent Tool' && (t.toolAgentName === agentToolName || t.name === agentToolName))
        );
        this.agentBuilderService.setAgentTools(agent.name, agent.tools);
      }
    }

    this.navigationStack = this.navigationStack.filter(context => context !== agentToolName);

    if (this.currentAgentTool() === agentToolName) {
      this.backToMainCanvas();
    }
  }

  getBackButtonTooltip(): string {
    if (this.navigationStack.length > 0) {
      const parentContext = this.navigationStack[this.navigationStack.length - 1];
      return parentContext === 'main' ? 'Back to Main Canvas' : `Back to ${parentContext}`;
    }
    return 'Back to Main Canvas';
  }

  onBuilderAssistantClose(): void {
    this.builderAssistantCloseRequest.emit();
  }

  reloadCanvasFromYaml(): void {
    if (this.appNameInput) {
      this.agentService.getAgentBuilderTmp(this.appNameInput).subscribe({
        next: (yamlContent: string) => {
          if (yamlContent) {
            this.loadFromYaml(yamlContent, this.appNameInput);
          }
        },
        error: (error) => {
          console.error('Error reloading canvas:', error);
        }
      });
    }
  }

}
