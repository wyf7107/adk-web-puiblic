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
import {Vflow, Edge, HtmlTemplateDynamicNode, ConnectionSettings} from 'ngx-vflow';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';
import {calculateGraphLayout, getNodeName, getNodeTypeIcon, getNodeTypeLabel} from '../../utils/graph-layout.utils';
import {findNodeInLevel, hasNestedStructure, NavigationStackItem, DEFAULT_LAYOUT_CONFIG} from '../../utils/graph-navigation.utils';

export interface AgentStructureGraphDialogData {
  appName: string;
}

interface NodeData {
  name: string;
  label: string;
  type: string;
  agentClass?: string;
  hasNestedStructure?: boolean;
  nodeData?: any; // Store the full node data for navigation
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
  public connection: ConnectionSettings = {
    mode: 'loose',
  };

  // Navigation state
  private fullAgentData: any = null;
  private navigationStack: NavigationStackItem[] = [];
  public currentAgentName = signal<string>('');
  public breadcrumbs = signal<string[]>([]);

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
          this.fullAgentData = agentData.root_agent;
          this.navigationStack = [{name: agentData.root_agent.name, data: agentData.root_agent}];
          this.updateBreadcrumbs();
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

    // Handle LlmAgent/Mesh with nodes field
    if (agentData.nodes && Array.isArray(agentData.nodes)) {
      this.buildMeshGraph(agentData.nodes, nodes, edges);
    }
    // Handle WorkflowAgent/SingleLlmAgent with graph field
    else if (agentData.graph && agentData.graph.nodes) {
      // Calculate layout using utility function
      const layout = calculateGraphLayout(
        agentData.graph.nodes,
        agentData.graph.edges || [],
        DEFAULT_LAYOUT_CONFIG
      );

      // Create nodes with calculated positions
      agentData.graph.nodes.forEach((node: any, index: number) => {
        const nodeName = getNodeName(node, `node_${index}`);
        const isStartNode = nodeName === '__START__';
        const nodeType = node.type || 'agent';
        const position = layout.positions.get(nodeName) || {x: DEFAULT_LAYOUT_CONFIG.startX, y: DEFAULT_LAYOUT_CONFIG.startY};
        const hasNested = hasNestedStructure(node);

        nodes.push({
          id: nodeName,
          type: 'html-template',
          point: signal({x: position.x, y: position.y}),
          width: signal(200),
          height: signal(80),
          data: signal({
            name: nodeName,
            label: isStartNode ? 'START' : nodeName,
            type: nodeType,
            agentClass: node.agent?.agent_class || node.model || undefined,
            hasNestedStructure: hasNested,
            nodeData: node,
          }),
        });
      });

      // Add edges from graph.edges
      if (agentData.graph.edges) {
        agentData.graph.edges.forEach((edge: any, index: number) => {
          const fromName = getNodeName(edge.from_node);
          const toName = getNodeName(edge.to_node);

          if (fromName && toName) {
            edges.push({
              id: `${fromName}_to_${toName}_${index}`,
              source: fromName,
              target: toName,
              type: 'template',
              floating: true,
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

  private buildMeshGraph(
    meshNodes: any[],
    nodes: HtmlTemplateDynamicNode<NodeData>[],
    edges: Edge[]
  ): void {
    // For LlmAgent/Mesh: nodes array contains coordinator + sub-agents
    // Layout: coordinator at top, sub-agents in row below
    const coordinatorIndex = meshNodes.findIndex(n =>
      (n.name === meshNodes[0]?.name) || n.type === 'coordinator'
    );

    const coordinator = coordinatorIndex >= 0 ? meshNodes[coordinatorIndex] : null;
    const subAgents = meshNodes.filter((_, i) => i !== coordinatorIndex);

    const startY = 100;
    const ySpacing = 200;
    const xSpacing = 300;

    // Calculate center X based on number of sub-agents
    const totalWidth = (subAgents.length - 1) * xSpacing;
    const startX = 400 - totalWidth / 2;

    // Add coordinator node at top center
    if (coordinator) {
      const hasNested = hasNestedStructure(coordinator);
      nodes.push({
        id: coordinator.name,
        type: 'html-template',
        point: signal({x: 400, y: startY}),
        width: signal(200),
        height: signal(80),
        data: signal({
          name: coordinator.name,
          label: coordinator.name,
          type: 'agent',
          agentClass: coordinator.model || 'LlmAgent',
          hasNestedStructure: hasNested,
          nodeData: coordinator,
        }),
      });
    }

    // Add sub-agent nodes in a row below coordinator
    subAgents.forEach((node: any, index: number) => {
      const x = startX + (index * xSpacing);
      const y = startY + ySpacing;
      const hasNested = hasNestedStructure(node);

      nodes.push({
        id: node.name,
        type: 'html-template',
        point: signal({x, y}),
        width: signal(200),
        height: signal(80),
        data: signal({
          name: node.name,
          label: node.name,
          type: 'agent',
          agentClass: node.model || 'Agent',
          hasNestedStructure: hasNested,
          nodeData: node,
        }),
      });

      // Add edge: coordinator -> sub-agent
      if (coordinator) {
        edges.push({
          id: `${coordinator.name}_to_${node.name}`,
          source: coordinator.name,
          target: node.name,
          type: 'template',
          floating: true,
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

  private updateBreadcrumbs(): void {
    this.breadcrumbs.set(this.navigationStack.map(item => item.name));
    this.currentAgentName.set(this.navigationStack[this.navigationStack.length - 1]?.name || '');
  }

  navigateIntoNode(nodeName: string): void {
    const currentData = this.navigationStack[this.navigationStack.length - 1].data;
    const nodeData = findNodeInLevel(currentData, nodeName);

    if (nodeData && hasNestedStructure(nodeData)) {
      this.navigationStack.push({name: nodeName, data: nodeData});
      this.updateBreadcrumbs();
      this.buildGraph(nodeData);
    }
  }

  navigateToLevel(index: number): void {
    if (index >= 0 && index < this.navigationStack.length) {
      this.navigationStack = this.navigationStack.slice(0, index + 1);
      this.updateBreadcrumbs();
      const currentData = this.navigationStack[this.navigationStack.length - 1].data;
      this.buildGraph(currentData);
    }
  }

  // Expose utility functions for use in template
  getNodeIcon = getNodeTypeIcon;
  getNodeTypeLabel = getNodeTypeLabel;
}
