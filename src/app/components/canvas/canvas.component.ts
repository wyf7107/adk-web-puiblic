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
import {Vflow, DynamicNode, Edge} from 'ngx-vflow'
import { MatIcon } from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';


@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss',
  standalone: true,
  imports: [Vflow, MatIcon, MatMenuModule, MatButtonModule]
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

  public nodes = signal<DynamicNode[]>([]);

  public edges = signal<Edge[]>([]);

  constructor(private dialog: MatDialog, private agentService: AgentService, private router: Router) {}

  ngOnInit() {
    this.createRootAgent();
  }

  ngAfterViewInit() {
  }

  createRootAgent() {
    if (this.nodes().length == 0) {
      this.nodeId = 1;
      const rootNode: DynamicNode = {
        id: this.nodeId.toString(),
        point: signal({ x: 100, y: 100 }),
        type: 'html-template',
        data: signal({
          agentName: 'root_agent',
          agentType: 'llm',
          model: 'gemini-2.0-flash',
          instructions: 'You are the root agent that coordinates other agents.',
          isRoot: true
        })
      };
      this.nodes.set([rootNode]);
    }
  }

  onAddResource(nodeId: string) {
    // This method can be used for general resource addition logic
    console.log('Adding resource to node:', nodeId);
  }

  addSubAgent(parentNodeId: string) {
    // Find the parent node
    const parentNode = this.nodes().find(node => node.id === parentNodeId);
    if (!parentNode) return;

    // Create a new sub-agent node
    this.nodeId++;
    const subAgentNode: DynamicNode = {
      id: this.nodeId.toString(),
      point: signal({ 
        x: parentNode.point().x, 
        y: parentNode.point().y + 150 // Position below the parent
      }),
      type: 'html-template',
      data: signal({
        agentName: `sub_agent_${this.nodeId}`,
        agentType: 'llm',
        model: 'gemini-2.0-flash',
        instructions: 'You are a sub-agent that performs specialized tasks.',
        isRoot: false
      })
    };

    // Add the new node
    this.nodes.set([...this.nodes(), subAgentNode]);

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













}
