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
import { DiagramConnection, AgentNode, ToolNode, YamlConfig } from '../../core/models/AgentBuilder';
import { MatDialog } from '@angular/material/dialog';
import { AgentService } from '../../core/services/agent.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import {Vflow, HtmlTemplateDynamicNode, Edge} from 'ngx-vflow'
import { MatIcon } from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import {MatChipsModule} from '@angular/material/chips';
import {MatTooltipModule} from '@angular/material/tooltip';
import { AgentBuilderService } from '../../core/services/agent-builder.service';
import * as YAML from 'yaml';
import { parse } from 'yaml';
import { firstValueFrom } from 'rxjs';
import { YamlUtils } from '../../../utils/yaml-utils';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';


@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss',
  standalone: true,
  imports: [Vflow, MatIcon, MatMenuModule, MatButtonModule, MatChipsModule, MatTooltipModule]
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
  toolId = 1;

  public nodes = signal<HtmlTemplateDynamicNode[]>([]);

  public edges = signal<Edge[]>([]);

  public selectedTool: any;

  existingAgent: string | undefined = undefined;

  constructor(
    private dialog: MatDialog,
    private agentService: AgentService,
    private router: Router
  ) {}

  ngOnInit() {
    this.agentBuilderService.getIsCreatingNewAgent().subscribe(res => {
      if (!res) {
        this.agentBuilderService.getLoadedAgentData().subscribe(agent => {
          this.existingAgent = agent;
          this.loadAgent();
          this.agentBuilderService.getSelectedTool().subscribe(tool => {
            this.selectedTool = tool;
          });
          this.agentBuilderService.getAgentTools().subscribe(update => {
            if (update) {
              const node = this.nodes().find(node => node.data ? node.data().name === update.agentName : undefined);
              if (node && node.data) {
                const data = node.data();
                data.tools = update.tools;
                node.data.set(data);
              }
            }
          });
        })
      }
    })
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
      this.agentBuilderService.setAgentTools(
        agentNodeData.name,
        agentNodeData.tools,
      );
    }
  }

  onAddResource(nodeId: string) {
    // This method can be used for general resource addition logic
  }

  addSubAgent(parentNodeId: string, event: MouseEvent) {
    const nodeElement = (event.target as HTMLElement).closest('.custom-node') as HTMLElement;
    if (!nodeElement) return;

    const nodeHeight = nodeElement.offsetHeight;

    // Find the parent node
    const parentNode: HtmlTemplateDynamicNode = this.nodes().find(node => node.id === parentNodeId) as HtmlTemplateDynamicNode;
    if (!parentNode || !parentNode.data) return;

    // Create a new sub-agent node
    this.nodeId++;

    const agentNodeData: AgentNode = {
        name: `sub_agent_${this.nodeId}`,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'You are a sub-agent that performs specialized tasks.',
        isRoot: false,
        sub_agents: [],
        tools: []
      };

    const subAgentIndex = parentNode.data().sub_agents.length;

    const subAgentNode: HtmlTemplateDynamicNode = {
      id: `sub_agent_${this.nodeId}`,
      point: signal({ 
        x: parentNode.point().x + subAgentIndex * 400 + 50, 
        y: parentNode.point().y + nodeHeight + 50 // Position below the parent
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
      source: parentNodeId,
      target: subAgentNode.id,
    };

    // Add the edge
    this.edges.set([...this.edges(), edge]);
  }

  addTool(parentNodeId: string) {
    // Find the parent node
    const parentNode = this.nodes().find(node => node.id === parentNodeId) as HtmlTemplateDynamicNode;
    if (!parentNode) return;
    if (!parentNode.data) return;

    const tool = {
      toolType: 'Custom tool',
      name: `.tool_${this.toolId}`,
      args: []
    }
    this.toolId++;
    this.agentBuilderService.addTool(parentNode.data().name, tool);
  }

  deleteTool(agentName: string, tool: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: { 
        title: 'Delete Tool',
        message: `Are you sure you want to delete ${tool.name}?`,
        confirmButtonText: 'Delete'
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.agentBuilderService.deleteTool(agentName, tool);
        this.cdr.detectChanges();
      }
    });
  }

  selectTool(tool: any, node: HtmlTemplateDynamicNode) {
    if (node.data) {
      const agentNodeData = this.agentBuilderService.getNode(node.data().name);
      if (agentNodeData) {
        this.agentBuilderService.setSelectedNode(agentNodeData);
      }
    }
    this.agentBuilderService.setSelectedTool(tool);
  }

  saveAgent(appName: string) {
    const rootAgent: AgentNode|undefined = this.agentBuilderService.getRootNode();

    if (!rootAgent) {
      this._snackBar.open("Please create an agent first.", "OK");

      return ;
    }

    const formData = new FormData();

    YamlUtils.generateYamlFile(rootAgent, formData, appName);

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

  async loadAgent() {
    if (!this.existingAgent) { return; }
    this.nodeId = 1;
    this.edgeId = 1;
    const rootAgent = parse(this.existingAgent) as AgentNode;
    rootAgent.isRoot = true;
    this.loadAgentTools(rootAgent);
    await this.loadSubAgents(rootAgent);
    this.agentBuilderService.addNode(rootAgent);
  }

  loadAgentTools(agent: AgentNode) {
    if (!agent.tools) { agent.tools = [] } 
    else {
      agent.tools.map(tool => {
        if (tool.name.includes('.')) {
          tool.toolType = "Custom tool"
        } else {
          tool.toolType = "Built-in tool"
        }
      })
    }
  }

  async loadSubAgents(rootAgent: AgentNode) {
    type BFSItem = {
      node: AgentNode;
      depth: number;
      index: number;
      parentId?: number;  // used to draw edges
    };
    const appName = rootAgent.name;
    const queue: BFSItem[] = [{ node: rootAgent, depth: 1, index: 1 }];

    while (queue.length > 0) {
      let { node, depth, index, parentId } = queue.shift()!;

      if (node && node.config) {
        this.nodeId ++;
        const subAgentData = await firstValueFrom(this.agentService.getSubAgentBuilder(appName, node.config));
        const subAgent = parse(subAgentData) as AgentNode;

        const parentNode: HtmlTemplateDynamicNode = this.nodes().find(node => node.id === parentId?.toString()) as HtmlTemplateDynamicNode;
        if (!parentNode || !parentNode.data) return;
        const subAgentNode: HtmlTemplateDynamicNode = {
          id: `${this.nodeId}`,
          point: signal({ 
            x: (index-1) * 350 + 50, 
            y: depth * 150 + 50 // Position below the parent
          }),
          type: 'html-template',
          data: signal(subAgent)
        };
        this.nodes.set([...this.nodes(), subAgentNode])

        if (parentId) {
          const edge: Edge = {
            id: this.edgeId.toString(),
            source: parentId.toString(),
            target: subAgentNode.id,
          };
          this.edgeId++;
          // Add the edge
          this.edges.set([...this.edges(), edge]);
        }
        if (subAgent.sub_agents && subAgent.sub_agents.length > 0) {
          index = 1
          for (const sub of subAgent.sub_agents) {
            queue.push({ node: sub, parentId: this.nodeId, depth: depth + 1, index: index })
            index ++;
          }
        }
      } else {
         const rootNode: HtmlTemplateDynamicNode = {
          id: this.nodeId.toString(),
          point: signal({ x: 100, y: 150 }),
          type: 'html-template',
          data: signal(rootAgent)
        };

        this.nodes.set([rootNode])

        if (node.sub_agents && node.sub_agents.length > 0) {
          index = 1
          for (const sub of node.sub_agents) {
            queue.push({ node: sub, parentId: this.nodeId, depth: depth + 1, index: index})
            index ++;
          }
        }
      }
    }
  }
}
