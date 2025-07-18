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

import {Component, ElementRef, ViewChild, AfterViewInit, OnInit, inject, signal} from '@angular/core';
import { DiagramNode, DiagramConnection } from '../../core/models/AgentBuilder';
import { MatDialog } from '@angular/material/dialog';
import { AgentService } from '../../core/services/agent.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {Vflow, DynamicNode, HtmlTemplateDynamicNode, Edge} from 'ngx-vflow'
import { MatIcon } from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import {MatChipsModule} from '@angular/material/chips';
import { AgentBuilderService } from '../../core/services/agent-builder.service';


@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss',
  standalone: true,
  imports: [Vflow, MatIcon, MatMenuModule, MatButtonModule, MatChipsModule]
})
export class CanvasComponent implements AfterViewInit, OnInit {
  private _snackBar = inject(MatSnackBar);
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('svgCanvas', { static: false }) svgCanvasRef!: ElementRef<SVGElement>;

  private ctx!: CanvasRenderingContext2D;
  //public nodes = signal<DiagramNode[]>([]);
  public connections = signal<DiagramConnection[]>([]);

  nodeId = 1;
  edgeId = 1;
  toolId = 1;

  public nodes = signal<DynamicNode[]>([]);

  public edges = signal<Edge[]>([]);

  constructor(
    private dialog: MatDialog,
    private agentService: AgentService,
    private router: Router,
    private agentBuilderService: AgentBuilderService
  ) {}

  ngOnInit() {
    this.createRootAgent();
  }

  ngAfterViewInit() {
  }

  createRootAgent() {
    if (this.nodes().length == 0) {
      this.nodeId = 1;

      const agentNodeData = {
          agentName: 'root_agent',
          agentType: 'LlmAgent',
          model: 'gemini-2.5-flash',
          instructions: 'You are the root agent that coordinates other agents.',
          isRoot: true
        };

      const rootNode: DynamicNode = {
        id: 'root_agent',
        point: signal({ x: 100, y: 100 }),
        type: 'html-template',
        data: signal(agentNodeData)
      };
      this.nodes.set([rootNode]);

      this.agentBuilderService.addNode(agentNodeData);
    }
  }

  onCustomTemplateNodeClick(clickedVflowNode: DynamicNode) {
    const agentNodeData = this.agentBuilderService.getNode(clickedVflowNode.id);

    if (!!agentNodeData) {
      this.agentBuilderService.setSelectedNode(agentNodeData);
    }
  }

  onAddResource(nodeId: string) {
    // This method can be used for general resource addition logic
    console.log('Adding resource to node:', nodeId);
  }

  addSubAgent(parentNodeId: string, event: MouseEvent) {
    const nodeElement = (event.target as HTMLElement).closest('.custom-node') as HTMLElement;
    if (!nodeElement) return;

    const nodeHeight = nodeElement.offsetHeight;

    // Find the parent node
    const parentNode = this.nodes().find(node => node.id === parentNodeId);
    if (!parentNode) return;

    // Create a new sub-agent node
    this.nodeId++;

    const agentNodeData = {
        agentName: `sub_agent_${this.nodeId}`,
        agentType: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instructions: 'You are a sub-agent that performs specialized tasks.',
        isRoot: false
      };

    const subAgentNode: DynamicNode = {
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

    // Create an edge connecting the parent to the sub-agent
    this.edgeId++;
    const edge: Edge = {
      id: this.edgeId.toString(),
      source: parentNodeId,
      target: subAgentNode.id,
    };

    // Add the edge
    this.edges.set([...this.edges(), edge]);

    console.log('Added sub-agent:', subAgentNode.id, 'connected to:', parentNodeId);
  }

  addTool(parentNodeId: string) {
    // Find the parent node
    const parentNode = this.nodes().find(node => node.id === parentNodeId) as HtmlTemplateDynamicNode;
    if (!parentNode) return;
    if (!parentNode.data) return;

    const tool = {
      toolType: 'builtInTool',
      toolName: `tool_${this.toolId}`
    }
    this.toolId++;

    const data = parentNode.data();
    data.tools.push(tool);
    parentNode.data.set(data);
  }
}
