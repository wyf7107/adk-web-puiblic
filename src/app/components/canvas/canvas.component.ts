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

import {Component, ElementRef, ViewChild, AfterViewInit, OnInit, inject, signal, Input, Output, EventEmitter} from '@angular/core';
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
        })
      } else {
        this.createRootAgent();
        this.agentBuilderService.getSelectedTool().subscribe(tool => {
          this.selectedTool = tool;
        });
      }
    })
  }

  ngAfterViewInit() {
  }

  createRootAgent() {
    if (this.nodes().length == 0) {
      this.nodeId = 1;

      const agentNodeData: AgentNode = {
          name: 'RootAgent',
          agentClass: 'LlmAgent',
          model: 'gemini-2.5-flash',
          instruction: 'You are the root agent that coordinates other agents.',
          isRoot: true,
          sub_agents: [],
          tools: []
        };

      const rootNode: HtmlTemplateDynamicNode = {
        id: 'RootAgent',
        point: signal({ x: 100, y: 100 }),
        type: 'html-template',
        data: signal(agentNodeData)
      };
      this.nodes.set([rootNode]);

      this.agentBuilderService.addNode(agentNodeData);
    }
  }

  onCustomTemplateNodeClick(clickedVflowNode: HtmlTemplateDynamicNode) {
    if (!clickedVflowNode.data) {
      return ;
    }
    const agentNodeData = this.agentBuilderService.getNode(clickedVflowNode.data().name);

    if (!!agentNodeData) {
      this.agentBuilderService.setSelectedNode(agentNodeData);
      this.agentBuilderService.setSelectedTool(undefined);
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
        agentClass: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'You are a sub-agent that performs specialized tasks.',
        isRoot: false,
        sub_agents: [],
        tools: []
      };

    const subAgentNode: HtmlTemplateDynamicNode = {
      id: `sub_agent_${this.nodeId}`,
      point: signal({ 
        x: parentNode.point().x, 
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
      name: `tool_${this.toolId}`,
      args: []
    }
    this.toolId++;

    const data = parentNode.data();
    data.tools.push(tool);
    parentNode.data.set(data);
  }

  selectTool(tool: any) {
    this.agentBuilderService.setSelectedTool(tool);
    this.agentBuilderService.setSelectedNode(undefined);
  }

  saveAgent() {
    const rootAgent: AgentNode|undefined = this.agentBuilderService.getNodes().find((node: AgentNode) => !!node.isRoot);

    if (!rootAgent) {
      this._snackBar.open("Please create an agent first.", "OK");

      return ;
    }

    const formData = new FormData();

    this.generateYamlFile(rootAgent, formData, rootAgent.name);

    this.agentService.agentBuild(formData).subscribe((success) => {
      if (success) {
        this.router.navigate(['/'], {
          queryParams: { app: rootAgent.name }
        }).then(() => {
          window.location.reload();
        });
      } else {
        this._snackBar.open("Something went wrong, please try again", "OK");
      }
    })
  }

  private generateYamlFile(agentNode: AgentNode, formData: FormData, rootAgentName: string) {
    const fileName = agentNode.isRoot ? 'root_agent.yaml' : `${agentNode.name}.yaml`;

    const folderName = `${rootAgentName}/${fileName}`;
    const subAgents = agentNode.sub_agents?
      agentNode.sub_agents.map((subAgentNode) => {return {config_path: `./${subAgentNode.name}.yaml`};}) : []

    const yamlConfig: YamlConfig = {
      name: agentNode.name,
      model: agentNode.model,
      agent_class: agentNode.agentClass,
      description: '',
      instruction: agentNode.instruction,
      sub_agents: subAgents,
      tools: this.buildToolsConfig(agentNode.tools)
    }

    const yamlString = YAML.stringify(yamlConfig);
    const blob = new Blob([yamlString], { type: 'application/x-yaml' });
    const file = new File([blob], folderName, { type: 'application/x-yaml' });
    
    formData.append('files', file);

    for (const subNode of agentNode.sub_agents ?? []) {
      this.generateYamlFile(subNode, formData, rootAgentName);
    }
  }

  private buildToolsConfig(tools: ToolNode[] | undefined): any[] {
    if (!tools || tools.length === 0) {
      return [];
    }

    return tools.map(tool => {
      const config: any = {
        name: tool.name,
      };

      if (tool.args && tool.args.length > 0) {
        config.args = tool.args.map(arg => {
          const value = arg.value;

          if (typeof value !== 'string') {
            return arg;
          }

          if (value.toLowerCase() === 'true') {
            return { ...arg, value: true };
          }

          if (value.toLowerCase() === 'false') {
            return { ...arg, value: false };
          }

          if (value.trim() !== '' && Number(value)) {
            return { ...arg, value: Number(value) };
          }

          return arg;
        });
      }

      return config;
    });
  }

  loadAgent() {
    if (!this.existingAgent) { return; }

    this.nodeId = 1;
    const rootAgent = parse(this.existingAgent) as AgentNode;
    rootAgent.isRoot = true;
    if (!rootAgent.tools) { rootAgent.tools = [] } 
    else {
      rootAgent.tools.map(tool => {
        if (tool.name.includes('.')) {
          tool.toolType = "Custom tool"
        } else {
          tool.toolType = "Built-in tool"
        }
      })
    }
    const rootNode: HtmlTemplateDynamicNode = {
      id: rootAgent.name,
      point: signal({ x: 100, y: 100 }),
      type: 'html-template',
      data: signal(rootAgent)
    };
    this.nodes.set([rootNode]);
    this.agentBuilderService.addNode(rootAgent);
  }
}
