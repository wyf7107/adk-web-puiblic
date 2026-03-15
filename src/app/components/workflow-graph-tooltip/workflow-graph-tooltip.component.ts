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
import {Vflow, Edge, HtmlTemplateDynamicNode, ConnectionSettings} from 'ngx-vflow';
import {NodeState, NodeStatus} from '../../core/models/types';
import {calculateGraphLayout, getNodeName, getNodeTypeIcon, getNodeTypeLabel} from '../../utils/graph-layout.utils';
import {buildNavigationStackFromPath, findNodeInLevel, getCurrentPath, getNodesAtLevel, hasNestedStructure, NavigationStackItem, DEFAULT_LAYOUT_CONFIG} from '../../utils/graph-navigation.utils';

interface WorkflowNodeData {
  name: string;
  type: string;
  status: NodeStatus;
  input?: any;
  triggeredBy?: string;
  retryCount?: number;
  executionId?: string;
  hasNestedStructure?: boolean;
  nodeData?: any;
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
  @Input() nodePath: string | null = null;
  @Input() allNodes: {[path: string]: {[nodeName: string]: NodeState}} | null = null;
  @Input() isPinned: boolean = false;
  @Input() onClose?: () => void;

  public graphNodes = signal<HtmlTemplateDynamicNode<WorkflowNodeData>[]>([]);
  public graphEdges = signal<Edge[]>([]);
  public NodeStatus = NodeStatus;
  public connection: ConnectionSettings = {
    mode: 'loose',
  };

  // Navigation state
  private fullAgentData: any = null;
  private navigationStack: NavigationStackItem[] = [];
  public breadcrumbs = signal<string[]>([]);

  close() {
    if (this.onClose) {
      this.onClose();
    }
  }

  ngOnInit(): void {
    this.buildGraph();
  }

  private buildGraph(): void {
    if (this.agentGraphData?.root_agent) {
      this.fullAgentData = this.agentGraphData.root_agent;
      this.navigationStack = [{name: this.agentGraphData.root_agent.name, data: this.agentGraphData.root_agent}];

      // Navigate to the level specified by nodePath
      if (this.nodePath) {
        this.navigateToNodePath(this.nodePath);
      }

      this.updateBreadcrumbs();
      const currentLevel = this.navigationStack[this.navigationStack.length - 1].data;
      this.buildGraphFromStructure(currentLevel);
    } else {
      this.buildGraphFromStateOnly();
    }
  }

  private buildGraphFromStructure(agentData: any): void {
    const nodes: HtmlTemplateDynamicNode<WorkflowNodeData>[] = [];
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
        const nodeState = this.nodes ? this.nodes[nodeName] : null;
        const nodeType = node.type || 'agent';
        const position = layout.positions.get(nodeName) || {x: DEFAULT_LAYOUT_CONFIG.startX, y: DEFAULT_LAYOUT_CONFIG.startY};
        const hasNested = hasNestedStructure(node);

        // Get status - either direct state or RUNNING if children are executing
        const status = this.getNodeStatusAtLevel(nodeName, node);

        nodes.push({
          id: nodeName,
          type: 'html-template',
          point: signal({x: position.x, y: position.y}),
          width: signal(180),
          height: signal(80),
          data: signal({
            name: nodeName,
            type: nodeType,
            status: status,
            input: nodeState?.input,
            triggeredBy: nodeState?.triggered_by,
            retryCount: nodeState?.retry_count,
            executionId: nodeState?.execution_id,
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
            // Check if source node is RUNNING
            const fromNodeStatus = this.getNodeStatusAtLevel(fromName, edge.from_node);
            const toNodeStatus = this.getNodeStatusAtLevel(toName, edge.to_node);

            // Highlight edge if source is running or completed and target is running/pending
            const isActive = fromNodeStatus === NodeStatus.RUNNING ||
                           (fromNodeStatus === NodeStatus.COMPLETED &&
                            (toNodeStatus === NodeStatus.RUNNING || toNodeStatus === NodeStatus.PENDING));

            edges.push({
              id: `${fromName}_to_${toName}_${index}`,
              source: fromName,
              target: toName,
              type: 'template',
              floating: true,
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

  private buildMeshGraph(
    meshNodes: any[],
    nodes: HtmlTemplateDynamicNode<WorkflowNodeData>[],
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
      const coordinatorName = getNodeName(coordinator);
      const status = this.getNodeStatusAtLevel(coordinatorName, coordinator);

      nodes.push({
        id: coordinatorName,
        type: 'html-template',
        point: signal({x: 400, y: startY}),
        width: signal(180),
        height: signal(80),
        data: signal({
          name: coordinatorName,
          type: 'agent',
          status: status,
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
      const nodeName = getNodeName(node);
      const status = this.getNodeStatusAtLevel(nodeName, node);

      nodes.push({
        id: nodeName,
        type: 'html-template',
        point: signal({x, y}),
        width: signal(180),
        height: signal(80),
        data: signal({
          name: nodeName,
          type: 'agent',
          status: status,
          hasNestedStructure: hasNested,
          nodeData: node,
        }),
      });

      // Add edge: coordinator -> sub-agent
      if (coordinator) {
        const coordinatorName = getNodeName(coordinator);
        const coordinatorStatus = this.getNodeStatusAtLevel(coordinatorName, coordinator);
        const isActive = coordinatorStatus === NodeStatus.RUNNING ||
                       (coordinatorStatus === NodeStatus.COMPLETED &&
                        (status === NodeStatus.RUNNING || status === NodeStatus.PENDING));

        edges.push({
          id: `${coordinatorName}_to_${nodeName}`,
          source: coordinatorName,
          target: nodeName,
          type: 'template',
          floating: true,
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
          type: nodeName === '__START__' ? 'start' : 'agent',
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
          floating: true,
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

  private updateBreadcrumbs(): void {
    this.breadcrumbs.set(this.navigationStack.map(item => item.name));
  }

  navigateIntoNode(nodeName: string): void {
    const currentData = this.navigationStack[this.navigationStack.length - 1].data;
    const nodeData = findNodeInLevel(currentData, nodeName);

    if (nodeData && hasNestedStructure(nodeData)) {
      this.navigationStack.push({name: nodeName, data: nodeData});
      this.updateBreadcrumbs();
      this.buildGraphFromStructure(nodeData);
    }
  }

  navigateToLevel(index: number): void {
    if (index >= 0 && index < this.navigationStack.length) {
      this.navigationStack = this.navigationStack.slice(0, index + 1);
      this.updateBreadcrumbs();
      const currentData = this.navigationStack[this.navigationStack.length - 1].data;
      this.buildGraphFromStructure(currentData);
    }
  }

  private navigateToNodePath(nodePath: string): void {
    this.navigationStack = buildNavigationStackFromPath(this.agentGraphData.root_agent, nodePath);
  }

  private getNodeStatusAtLevel(nodeName: string, nodeData: any): NodeStatus {
    // Get the current navigation path
    const currentPath = getCurrentPath(this.navigationStack);

    // Only use direct state if we're at the execution level
    if (this.nodePath && currentPath === this.nodePath) {
      const directState = this.nodes ? this.nodes[nodeName] : null;
      if (directState) {
        return directState.status;
      }
    }

    // If we're viewing a higher level than where execution is happening,
    // check if this node is in the execution path (should show as RUNNING)
    if (this.nodePath && hasNestedStructure(nodeData) && this.isInExecutionPath(nodeName, currentPath)) {
      return NodeStatus.RUNNING;
    }

    // Check allNodes for historical state at the current path level
    // allNodes is now organized by path: { "path1": { "node1": state }, "path2": { ... } }
    if (this.allNodes && this.allNodes[currentPath] && this.allNodes[currentPath][nodeName]) {
      return this.allNodes[currentPath][nodeName].status;
    }

    return NodeStatus.INACTIVE;
  }

  private isInExecutionPath(nodeName: string, currentPath: string): boolean {
    // If nodePath is not available, we can't determine
    if (!this.nodePath) {
      return false;
    }

    // Check if nodePath starts with currentPath (we're viewing a parent level)
    // and if nodeName is the next segment in the execution path
    if (this.nodePath.startsWith(currentPath + '/')) {
      const remainingPath = this.nodePath.substring(currentPath.length + 1);
      const nextSegment = remainingPath.split('/')[0];
      return nodeName === nextSegment;
    }

    return false;
  }

  // Expose utility functions for use in template
  getNodeTypeIcon = getNodeTypeIcon;
  getNodeTypeLabel = getNodeTypeLabel;
}
