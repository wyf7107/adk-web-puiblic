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

import {Component, Input, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {Vflow, Edge, HtmlTemplateDynamicNode} from 'ngx-vflow';
import {NodeState, NodeStatus} from '../../core/models/types';

interface WorkflowNodeData {
  name: string;
  status: NodeStatus;
  input?: any;
  triggeredBy?: string;
  retryCount?: number;
  executionId?: string;
}

@Component({
  selector: 'app-workflow-graph-tooltip',
  templateUrl: './workflow-graph-tooltip.component.html',
  styleUrls: ['./workflow-graph-tooltip.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    Vflow,
  ],
})
export class WorkflowGraphTooltipComponent implements OnInit {
  @Input() nodes: {[key: string]: NodeState} | null = null;
  @Input() agentGraphData: any = null;
  @Input() isPinned: boolean = false;
  @Input() onClose?: () => void;

  public graphNodes = signal<HtmlTemplateDynamicNode<WorkflowNodeData>[]>([]);
  public graphEdges = signal<Edge[]>([]);
  public NodeStatus = NodeStatus;

  close() {
    if (this.onClose) {
      this.onClose();
    }
  }

  ngOnInit(): void {
    this.buildGraph();
  }

  private buildGraph(): void {
    if (this.agentGraphData?.root_agent?.graph) {
      this.buildGraphFromStructure(this.agentGraphData.root_agent);
    } else {
      this.buildGraphFromStateOnly();
    }
  }

  private buildGraphFromStructure(agentData: any): void {
    const nodes: HtmlTemplateDynamicNode<WorkflowNodeData>[] = [];
    const edges: Edge[] = [];
    const ySpacing = 120;
    const xPosition = 200;
    const startY = 50;

    if (agentData.graph && agentData.graph.nodes) {
      agentData.graph.nodes.forEach((node: any, index: number) => {
        const nodeName = node.name || node.agent?.name || `node_${index}`;
        const nodeState = this.nodes ? this.nodes[nodeName] : null;

        nodes.push({
          id: nodeName,
          type: 'html-template',
          point: signal({x: xPosition, y: startY + (index * ySpacing)}),
          width: signal(180),
          height: signal(80),
          data: signal({
            name: nodeName,
            status: nodeState?.status ?? NodeStatus.INACTIVE,
            input: nodeState?.input,
            triggeredBy: nodeState?.triggered_by,
            retryCount: nodeState?.retry_count,
            executionId: nodeState?.execution_id,
          }),
        });
      });

      // Add edges from graph.edges
      if (agentData.graph.edges) {
        agentData.graph.edges.forEach((edge: any) => {
          const fromName = edge.from_node?.name || edge.from_node?.agent?.name;
          const toName = edge.to_node?.name || edge.to_node?.agent?.name;

          if (fromName && toName) {
            // Check if source node is RUNNING to highlight this edge
            const fromNodeState = this.nodes ? this.nodes[fromName] : null;
            const isActive = fromNodeState?.status === NodeStatus.RUNNING;

            edges.push({
              id: `${fromName}_to_${toName}`,
              source: fromName,
              target: toName,
              type: 'template',
              data: { isActive },
              markers: {
                end: {
                  type: 'arrow-closed',
                  width: 15,
                  height: 15,
                  color: isActive ? '#42A5F5' : 'rgba(138, 180, 248, 0.8)',
                },
              },
            });
          }
        });
      }
    }

    this.graphNodes.set(nodes);
    this.graphEdges.set(edges);
  }

  private buildGraphFromStateOnly(): void {
    const nodes: HtmlTemplateDynamicNode<WorkflowNodeData>[] = [];
    const edges: Edge[] = [];
    const ySpacing = 120;
    const xPosition = 200;
    const startY = 50;

    if (!this.nodes) {
      this.graphNodes.set(nodes);
      this.graphEdges.set(edges);
      return;
    }

    const nodeNames = Object.keys(this.nodes);

    nodeNames.forEach((nodeName: string, index: number) => {
      const nodeState = this.nodes![nodeName];

      nodes.push({
        id: nodeName,
        type: 'html-template',
        point: signal({x: xPosition, y: startY + (index * ySpacing)}),
        width: signal(180),
        height: signal(80),
        data: signal({
          name: nodeName,
          status: nodeState.status,
          input: nodeState.input,
          triggeredBy: nodeState.triggered_by,
          retryCount: nodeState.retry_count,
          executionId: nodeState.execution_id,
        }),
      });
    });

    // Build edges from triggered_by relationships
    nodeNames.forEach((nodeName) => {
      const nodeState = this.nodes![nodeName];
      if (nodeState.triggered_by && nodeNames.includes(nodeState.triggered_by)) {
        // Check if source node is RUNNING to highlight this edge
        const fromNodeState = this.nodes![nodeState.triggered_by];
        const isActive = fromNodeState?.status === NodeStatus.RUNNING;

        edges.push({
          id: `${nodeState.triggered_by}_to_${nodeName}`,
          source: nodeState.triggered_by,
          target: nodeName,
          type: 'template',
          data: { isActive },
          markers: {
            end: {
              type: 'arrow-closed',
              width: 15,
              height: 15,
              color: isActive ? '#42A5F5' : 'rgba(138, 180, 248, 0.8)',
            },
          },
        });
      }
    });

    this.graphNodes.set(nodes);
    this.graphEdges.set(edges);
  }

  getStatusColor(status: NodeStatus): string {
    switch (status) {
      case NodeStatus.INACTIVE:
        return '#757575';
      case NodeStatus.PENDING:
        return '#FFA726';
      case NodeStatus.RUNNING:
        return '#42A5F5';
      case NodeStatus.COMPLETED:
        return '#66BB6A';
      case NodeStatus.INTERRUPTED:
        return '#FFCA28';
      case NodeStatus.FAILED:
        return '#EF5350';
      default:
        return '#757575';
    }
  }

  getStatusLabel(status: NodeStatus): string {
    switch (status) {
      case NodeStatus.INACTIVE:
        return 'INACTIVE';
      case NodeStatus.PENDING:
        return 'PENDING';
      case NodeStatus.RUNNING:
        return 'RUNNING';
      case NodeStatus.COMPLETED:
        return 'COMPLETED';
      case NodeStatus.INTERRUPTED:
        return 'INTERRUPTED';
      case NodeStatus.FAILED:
        return 'FAILED';
      default:
        return 'UNKNOWN';
    }
  }

  getStatusIcon(status: NodeStatus): string {
    switch (status) {
      case NodeStatus.INACTIVE:
        return 'radio_button_unchecked';
      case NodeStatus.PENDING:
        return 'schedule';
      case NodeStatus.RUNNING:
        return 'play_circle';
      case NodeStatus.COMPLETED:
        return 'check_circle';
      case NodeStatus.INTERRUPTED:
        return 'pause_circle';
      case NodeStatus.FAILED:
        return 'error';
      default:
        return 'help';
    }
  }
}
