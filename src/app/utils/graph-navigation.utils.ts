/**
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

import {getNodeName} from './graph-layout.utils';

export interface NavigationStackItem {
  name: string;
  data: any;
}

/**
 * Default layout configuration for graph visualization
 */
export const DEFAULT_LAYOUT_CONFIG = {
  ySpacing: 200,
  xSpacing: 350,
  startX: 400,
  startY: 100,
};

/**
 * Get current path from navigation stack
 */
export function getCurrentPath(navigationStack: NavigationStackItem[]): string {
  return navigationStack.map(item => item.name).join('/');
}

/**
 * Check if a node has nested structure (sub-workflows or agents)
 */
export function hasNestedStructure(nodeData: any): boolean {
  return !!(nodeData.graph || nodeData.nodes || (nodeData.sub_agents && nodeData.sub_agents.length > 0));
}

/**
 * Get nodes at a specific level (works for both graph.nodes and nodes fields)
 */
export function getNodesAtLevel(agentData: any): any[] {
  if (agentData.graph?.nodes) {
    return agentData.graph.nodes;
  } else if (agentData.nodes) {
    return agentData.nodes;
  }
  return [];
}

/**
 * Find node data by name in the current level
 */
export function findNodeInLevel(currentData: any, nodeName: string): any | null {
  // Search in nodes array
  if (currentData.nodes) {
    const found = currentData.nodes.find((n: any) => n.name === nodeName);
    if (found) return found;
  }
  // Search in graph.nodes array
  if (currentData.graph?.nodes) {
    const found = currentData.graph.nodes.find((n: any) => n.name === nodeName);
    if (found) return found;
  }
  // Search in sub_agents array
  if (currentData.sub_agents) {
    const found = currentData.sub_agents.find((n: any) => n.name === nodeName);
    if (found) return found;
  }
  return null;
}

/**
 * Navigate to a specific path (e.g., "order_processing_pipeline/validation_stage")
 * Returns the navigation stack to reach that path
 */
export function buildNavigationStackFromPath(
  rootAgent: any,
  nodePath: string
): NavigationStackItem[] {
  const pathParts = nodePath.split('/');
  const stack: NavigationStackItem[] = [{name: rootAgent.name, data: rootAgent}];

  let currentData = rootAgent;

  // Navigate through each level (skip first part as it's root)
  for (let i = 1; i < pathParts.length; i++) {
    const targetName = pathParts[i];
    const nodes = getNodesAtLevel(currentData);

    // Find the node with this name
    const targetNode = nodes.find(node => getNodeName(node) === targetName);

    if (targetNode) {
      stack.push({name: targetName, data: targetNode});
      currentData = targetNode;
    } else {
      console.warn(`Could not find node '${targetName}' in path '${nodePath}'`);
      break;
    }
  }

  return stack;
}
