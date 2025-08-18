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

import {Component, ElementRef, ViewChild, AfterViewInit, OnInit, inject, signal, Input, Output, EventEmitter, ChangeDetectorRef} from '@angular/core';
import { DiagramConnection, AgentNode, ToolNode, CallbackNode, YamlConfig } from '../../core/models/AgentBuilder';
import { MatDialog } from '@angular/material/dialog';
import { AgentService } from '../../core/services/agent.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import {Vflow, HtmlTemplateDynamicNode, Edge} from 'ngx-vflow'
import { MatIcon } from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatChipsModule} from '@angular/material/chips';
import {MatTooltipModule} from '@angular/material/tooltip';
import { AgentBuilderService } from '../../core/services/agent-builder.service';
import * as YAML from 'yaml';
import { parse } from 'yaml';
import { firstValueFrom, take, filter, Observable } from 'rxjs';
import { YamlUtils } from '../../../utils/yaml-utils';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { AddToolDialogComponent } from '../add-tool-dialog/add-tool-dialog.component';
import { AsyncPipe } from '@angular/common';


@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss',
  standalone: true,
  imports: [Vflow, MatIcon, MatMenuModule, MatButtonModule, MatButtonToggleModule, MatChipsModule, MatTooltipModule, AsyncPipe]
})
export class CanvasComponent implements AfterViewInit, OnInit {
  private _snackBar = inject(MatSnackBar);
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('svgCanvas', { static: false }) svgCanvasRef!: ElementRef<SVGElement>;
  private agentBuilderService = inject(AgentBuilderService);
  private cdr = inject(ChangeDetectorRef);

  @Input() showSidePanel: boolean = true;
  @Output() toggleSidePanelRequest = new EventEmitter<void>();

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

  existingAgent: string | undefined = undefined;
  public toolsMap$: Observable<Map<string, ToolNode[]>>;

  // Tab management
  public selectedTab = signal('root_agent');
  public availableTabs = signal<string[]>(['root_agent']);
  public tabAgents = signal<Map<string, AgentNode>>(new Map());
  private isTabSwitching = false;

  constructor(
    private dialog: MatDialog,
    private agentService: AgentService,
    private router: Router
  ) {
    this.toolsMap$ = this.agentBuilderService.getAgentToolsMap();
    this.agentBuilderService.getSelectedTool().subscribe(tool => {
      this.selectedTool = tool;
    });
    this.agentService.getApp().subscribe((app) => {
      this.appName = app;
      console.log(this.appName)
    });
  }

  ngOnInit() {
    // Listen for new tab requests
    this.agentBuilderService.getNewTabRequest().subscribe(request => {
      if (request) {
        const {tabName, currentAgentName} = request;
        // Check if tab already exists
        const availableTabs = this.availableTabs();
        if (availableTabs.includes(tabName)) {
          // Tab exists, just switch to it
          this.selectTab(this.appName, tabName);
        } else {
          // Tab doesn't exist, create new tab
          this.addNewTab(tabName, currentAgentName);
        }
      }
    });

    // Listen for tab deletion requests
    this.agentBuilderService.getTabDeletionRequest().subscribe(tabName => {
      if (tabName) {
        this.deleteTab(tabName);
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
  }

  addTool(parentNodeId: string) {
    // Don't create tools during tab switching
    if (this.isTabSwitching) {
      return;
    }

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
          ? `Are you sure you want to delete the agent tool "${toolDisplayName}"? This will also delete the corresponding tab.`
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
    // Check if this is an agent tool that needs tab deletion
    if (tool.toolType === 'Agent Tool') {
      const agentToolName = tool.toolAgentName || tool.name;
      this.deleteAgentToolAndTab(agentName, tool, agentToolName);
    } else {
      // Regular tool deletion
      this.agentBuilderService.deleteTool(agentName, tool);
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
      this.tabAgents()
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
    // Check if this is an agent tool chip
    if (tool.toolType === 'Agent Tool') {
      // Switch to the corresponding agent tool tab
      const agentToolName = tool.name;
      const availableTabs = this.availableTabs();
      
      if (availableTabs.includes(agentToolName)) {
        this.selectTab(this.appName, agentToolName);
        return;
      } else {
        console.log('Tab not found:', agentToolName);
      }
    } else {
      console.log('Not an agent tool, toolType:', tool.toolType);
    }
    
    // Default behavior for regular tools
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

    // Generate YAML for all agents in tabAgents
    const tabAgents = this.tabAgents();
    
    YamlUtils.generateYamlFile(rootAgent, formData, appName, tabAgents);

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
    const currentTab = this.selectedTab();
    
    // If we're in the root_agent tab, use the global root agent logic
    if (currentTab === 'root_agent') {
      return this.isRootAgent(agentName);
    }
    
    // For other tabs, the agent with the same name as the tab is the root agent for that tab
    return agentName === currentTab;
  }

  loadFromYaml(yamlContent: string, appName: string) {
    try {
      // Parse the YAML content
      const yamlData = YAML.parse(yamlContent);
      
      // Clear existing state
      this.availableTabs.set(['root_agent']);
      this.tabAgents.set(new Map());
      this.agentBuilderService.clear();
      
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
      
      // Store root agent
      const currentTabAgents = this.tabAgents();
      currentTabAgents.set('root_agent', rootAgent);
      this.tabAgents.set(currentTabAgents);
      
      // Add to agent builder service
      this.agentBuilderService.addNode(rootAgent);
      this.agentBuilderService.setSelectedNode(rootAgent);
      
      // Process agent tools and create tabs
      this.processAgentToolsFromYaml(rootAgent.tools || [], appName);
      
      // Load the root agent tab
      this.loadAgentForTab(this.appName, 'root_agent');
      
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
              code: 'def callback_function(callback_context):\n    # Add your callback logic here\n    return None',
              description: 'Auto-generated callback'
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
    } else if (tool.name && tool.name.includes('.')) {
      return 'Custom tool';
    } else {
      return 'Built-in tool';
    }
  }

  private processAgentToolsFromYaml(tools: ToolNode[], appName: string) {
    const agentTools = tools.filter(tool => tool.toolType === 'Agent Tool');
    
    for (const agentTool of agentTools) {
      // Create tab for agent tool
      const currentTabs = this.availableTabs();
      if (!currentTabs.includes(agentTool.name)) {
        this.availableTabs.set([...currentTabs, agentTool.name]);
        
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
            
            // Create agent configuration from YAML
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
            
            // Store the agent tool agent
            const currentTabAgents = this.tabAgents();
            currentTabAgents.set(agentToolName, agentToolAgent);
            this.tabAgents.set(currentTabAgents);
            
            // Add to agent builder service
            this.agentBuilderService.addNode(agentToolAgent);
            
            // Process nested agent tools recursively
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
            // Fallback to default configuration
            this.createDefaultAgentToolConfiguration(agentTool);
          }
        } else {
          // No YAML file found, create default configuration
          this.createDefaultAgentToolConfiguration(agentTool);
        }
      },
      error: (error) => {
        console.error(`Error loading agent tool configuration for ${agentToolName}:`, error);
        // Fallback to default configuration
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
    
    // Store the agent tool agent
    const currentTabAgents = this.tabAgents();
    currentTabAgents.set(agentToolName, agentToolAgent);
    this.tabAgents.set(currentTabAgents);
    
    // Add to agent builder service
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
        
        if (tool.name.includes('.')) {
          tool.toolType = "Custom tool"
        } else {
          tool.toolType = "Built-in tool"
        }
      })
    }
  }

  isNodeSelected(node: HtmlTemplateDynamicNode): boolean {
    return this.selectedAgents.includes(node);
  }

  async selectTab(appName: string, tabName: string) {
    this.isTabSwitching = true;
    this.selectedTab.set(tabName);
    await this.loadAgentForTab(appName, tabName);
    // Reset the flag after a short delay to allow the UI to update
    setTimeout(() => {
      this.isTabSwitching = false;
    }, 100);
  }

  async loadAgentForTab(appName: string, tabName: string) {
    const tabAgents = this.tabAgents();
    const agent = tabAgents.get(tabName);
    if (agent) {
      // Clear existing nodes and edges
      this.nodes.set([]);
      this.edges.set([]);
      
      // Reset IDs
      this.nodeId = 1;
      this.edgeId = 1;
      
      // Load the agent for this tab
      this.loadAgentTools(agent);
      this.agentBuilderService.addNode(agent);
      
      // Update agent tools in the service only if there are actual tools
      if (agent.tools && agent.tools.length > 0) {
        this.agentBuilderService.setAgentTools(tabName, agent.tools);
      } else {
        // Clear any existing tools for this agent
        this.agentBuilderService.setAgentTools(tabName, []);
      }
      
      // Load sub-agents if any
      if (agent.sub_agents && agent.sub_agents.length > 0) {
        await this.loadSubAgents(appName, agent);
      } else {
        // Create a single node for the agent
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
  }

  addNewTab(tabName: string, currentAgentName?: string) {
    const currentTabs = this.availableTabs();
    if (!currentTabs.includes(tabName)) {
      // Add new tab
      this.availableTabs.set([...currentTabs, tabName]);
      
      // Create default agent for the new tab
      const defaultAgent: AgentNode = {
        isRoot: false,
        name: tabName,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: `You are the ${tabName} agent that can be used as a tool by other agents.`,
        sub_agents: [],
        tools: [],
        isAgentTool: true,
        skip_summarization: false,
      };

      // Store the agent for this tab
      const currentTabAgents = this.tabAgents();
      currentTabAgents.set(tabName, defaultAgent);
      this.tabAgents.set(currentTabAgents);

      // Add the agent tool to the current agent's tools (or root agent if not specified)
      const targetAgentName = currentAgentName || 'root_agent';
      this.addAgentToolToAgent(tabName, targetAgentName);

      // Auto-select the new tab
      this.selectTab(this.appName, tabName);
    }
  }

  addAgentToolToAgent(agentToolName: string, targetAgentName: string) {
    // Get the target agent
    const targetAgent = this.agentBuilderService.getNode(targetAgentName);
    
    if (targetAgent) {
      // Check if the tool already exists
      if (targetAgent.tools && targetAgent.tools.some(tool => tool.name === agentToolName)) {
        return; // Tool already exists, don't add duplicate
      }
      // Create a tool node for the agent tool
      const agentTool: ToolNode = {
        name: agentToolName,
        toolType: 'Agent Tool',
        toolAgentName: agentToolName // Use the agent name as the tool agent name
      };
      // Add the tool to the target agent
      if (!targetAgent.tools) {
        targetAgent.tools = [];
      }
      targetAgent.tools.push(agentTool);
      targetAgent.tools = targetAgent.tools.filter(tool => tool.name && tool.name.trim() !== '');

      // Update the target agent in tabAgents
      const currentTabAgents = this.tabAgents();
      currentTabAgents.set(targetAgentName, targetAgent);
      this.tabAgents.set(currentTabAgents);
      // Update the agent builder service with the complete tools array
      this.agentBuilderService.setAgentTools(targetAgentName, targetAgent.tools);
    }
  }

  addAgentToolToRoot(agentToolName: string) {
    // Get the root agent
    const rootAgent = this.tabAgents().get('root_agent');
    if (rootAgent) {
      // Check if the tool already exists
      if (rootAgent.tools && rootAgent.tools.some(tool => tool.name === agentToolName)) {
        return; // Tool already exists, don't add duplicate
      }

      // Create a tool node for the agent tool
      const agentTool: ToolNode = {
        name: agentToolName,
        toolType: 'Agent Tool',
        toolAgentName: agentToolName // Use the agent name as the tool agent name
      };

      // Add the tool to the root agent
      if (!rootAgent.tools) {
        rootAgent.tools = [];
      }
      rootAgent.tools.push(agentTool);

      // Update the root agent in tabAgents
      const currentTabAgents = this.tabAgents();
      currentTabAgents.set('root_agent', rootAgent);
      this.tabAgents.set(currentTabAgents);

      // Update the agent builder service with the complete tools array
      this.agentBuilderService.setAgentTools('root_agent', rootAgent.tools);
    }
  }

  deleteAgentToolAndTab(agentName: string, tool: any, agentToolName: string) {
    // First, delete the tool from the agent
    this.agentBuilderService.deleteTool(agentName, tool);

    // Remove the agent tool from tabAgents
    const currentTabAgents = this.tabAgents();
    currentTabAgents.delete(agentToolName);
    this.tabAgents.set(currentTabAgents);

    // Remove the tab from availableTabs
    const currentAvailableTabs = this.availableTabs();
    const updatedTabs = currentAvailableTabs.filter(tab => tab !== agentToolName);
    this.availableTabs.set(updatedTabs);

    // Remove any references to this agent tool from other agents
    for (const [tabName, agent] of currentTabAgents) {
      if (agent.tools) {
        agent.tools = agent.tools.filter(t => 
          !(t.toolType === 'Agent Tool' && (t.toolAgentName === agentToolName || t.name === agentToolName))
        );
        // Update the agent in tabAgents
        currentTabAgents.set(tabName, agent);
      }
    }
    this.tabAgents.set(currentTabAgents);

    // If the deleted tab was selected, switch to root_agent
    if (this.selectedTab() === agentToolName) {
      this.selectTab(this.appName, 'root_agent');
    }
  }

  deleteTab(tabName: string) {
    // Remove the agent tool from tabAgents
    const currentTabAgents = this.tabAgents();
    currentTabAgents.delete(tabName);
    this.tabAgents.set(currentTabAgents);

    // Remove the tab from availableTabs
    const currentAvailableTabs = this.availableTabs();
    const updatedTabs = currentAvailableTabs.filter(tab => tab !== tabName);
    this.availableTabs.set(updatedTabs);

    // Remove any references to this agent tool from other agents
    for (const [tabName, agent] of currentTabAgents) {
      if (agent.tools) {
        agent.tools = agent.tools.filter(t => 
          !(t.toolType === 'Agent Tool' && (t.toolAgentName === tabName || t.name === tabName))
        );
        // Update the agent in tabAgents
        currentTabAgents.set(tabName, agent);
      }
    }
    this.tabAgents.set(currentTabAgents);

    // If the deleted tab was selected, switch to root_agent
    if (this.selectedTab() === tabName) {
      this.selectTab(this.appName, 'root_agent');
    }
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
}
