/**
 * @license
 * Copyright 2026 Google LLC
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

import {Component, inject, OnInit, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {Vflow, Edge, HtmlTemplateDynamicNode} from 'ngx-vflow';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';

export interface AgentStructureGraphDialogData {
  appName: string;
}

interface NodeData {
  name: string;
  label: string;
  agentClass?: string;
}

@Component({
  selector: 'app-agent-structure-graph-dialog',
  templateUrl: './agent-structure-graph-dialog.html',
  styleUrls: ['./agent-structure-graph-dialog.scss'],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    Vflow,
  ],
})
export class AgentStructureGraphDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AgentStructureGraphDialogComponent>);
  readonly data = inject<AgentStructureGraphDialogData>(MAT_DIALOG_DATA);
  private readonly agentService = inject(AGENT_SERVICE);

  public nodes = signal<HtmlTemplateDynamicNode<NodeData>[]>([]);
  public edges = signal<Edge[]>([]);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  get appName(): string {
    return this.data.appName;
  }

  ngOnInit(): void {
    this.loadAgentGraph();
  }

  private loadAgentGraph(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Use agentInfo to get the graph data
    this.agentService.getAppInfo(this.appName).subscribe({
      next: (agentData: any) => {
        try {
          this.buildGraph(agentData.root_agent);
          this.isLoading.set(false);
        } catch (error) {
          console.error('Error building graph:', error);
          this.errorMessage.set('Failed to build agent structure graph.');
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        console.error('Error loading agent graph:', error);
        this.errorMessage.set('Failed to load agent structure.');
        this.isLoading.set(false);
      },
    });
  }

  private buildGraph(agentData: any): void {
    const nodes: HtmlTemplateDynamicNode<NodeData>[] = [];
    const edges: Edge[] = [];
    const ySpacing = 150;
    const xPosition = 300;

    // Handle graph structure from the data
    if (agentData.graph && agentData.graph.nodes) {
      const startY = 100;

      agentData.graph.nodes.forEach((node: any, index: number) => {
        const nodeName = node.name || node.agent?.name || `node_${index}`;
        const isStartNode = nodeName === '__START__';
        console.log('Node ID:', nodeName);
        nodes.push({
          id: nodeName,
          type: 'html-template',
          point: signal({x: xPosition, y: startY + (index * ySpacing)}),
          width: signal(200),
          height: signal(80),
          data: signal({
            name: nodeName,
            label: isStartNode ? 'START' : nodeName,
            agentClass: node.agent?.agent_class || 'Agent',
          }),
        });
      });

      // Add edges from graph.edges
      if (agentData.graph.edges) {
        agentData.graph.edges.forEach((edge: any) => {
          const fromName = edge.from_node?.name || edge.from_node?.agent?.name;
          const toName = edge.to_node?.name || edge.to_node?.agent?.name;

          if (fromName && toName) {
            edges.push({
              id: `${fromName}_to_${toName}`,
              source: fromName,
              target: toName,
              type: 'template',
              markers: {
                end: {
                  type: 'arrow-closed',
                  width: 20,
                  height: 20,
                  color: 'rgba(138, 180, 248, 0.8)',
                },
              },
            });
          }
        });
      }
    }

    this.nodes.set(nodes);
    this.edges.set(edges);
  }
}
