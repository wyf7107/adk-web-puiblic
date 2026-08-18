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

export interface GraphEdge {
  from_node?: any;
  to_node?: any;
}

export interface GraphNode {
  name?: string;
  agent?: {
    name?: string;
  };
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface LayoutConfig {
  ySpacing?: number;
  xSpacing?: number;
  startX?: number;
  startY?: number;
}

export interface LayoutResult {
  levels: Map<string, number>;
  nodesByLevel: Map<number, string[]>;
  positions: Map<string, NodePosition>;
}

/**
 * Calculates graph layout with support for fan-out visualization.
 * Uses BFS to assign nodes to levels, keeping nodes at minimum depth for better fan-out display.
 */
export function calculateGraphLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: LayoutConfig = {}
): LayoutResult {
  const {
    ySpacing = 200,
    xSpacing = 350,
    startX = 400,
    startY = 100,
  } = config;

  // Extract node names
  const nodeNames = nodes.map((node) =>
    node.name || node.agent?.name || ''
  );

  // Build adjacency list and in-degree map
  const adjacencyList: Map<string, string[]> = new Map();
  const inDegreeMap: Map<string, number> = new Map();

  // Initialize
  nodeNames.forEach((name: string) => {
    adjacencyList.set(name, []);
    inDegreeMap.set(name, 0);
  });

  // Build adjacency list and count in-degrees
  edges.forEach((edge) => {
    const fromName = edge.from_node?.name || edge.from_node?.agent?.name;
    const toName = edge.to_node?.name || edge.to_node?.agent?.name;

    if (fromName && toName) {
      adjacencyList.get(fromName)?.push(toName);
      inDegreeMap.set(toName, (inDegreeMap.get(toName) || 0) + 1);
    }
  });

  // Calculate levels using BFS - use minimum level for better fan-out visualization
  // This handles cycles by ignoring back edges
  const levels: Map<string, number> = new Map();
  const queue: string[] = [];
  const inDegree = new Map(inDegreeMap); // Copy for processing
  const visited = new Set<string>();

  // Start with nodes that have no incoming edges
  nodeNames.forEach((name: string) => {
    if (inDegree.get(name) === 0) {
      queue.push(name);
      levels.set(name, 0);
      visited.add(name);
    }
  });

  // Process queue
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) || 0;

    adjacencyList.get(current)?.forEach((neighbor) => {
      // Ignore back edges (edges to already visited nodes at same or earlier level)
      const existingLevel = levels.get(neighbor);
      if (existingLevel !== undefined && existingLevel <= currentLevel) {
        return; // Skip back edge
      }

      // Set level based on first parent (minimum level)
      const newLevel = currentLevel + 1;
      if (existingLevel === undefined) {
        levels.set(neighbor, newLevel);
      }

      // Decrement in-degree
      const currentInDegree = inDegree.get(neighbor) || 0;
      inDegree.set(neighbor, currentInDegree - 1);

      // Add to queue when all parents processed
      if (inDegree.get(neighbor) === 0 && !visited.has(neighbor)) {
        queue.push(neighbor);
        visited.add(neighbor);
      }
    });
  }

  // Handle unreached nodes (due to cycles) - add them sequentially
  let maxLevel = Math.max(...Array.from(levels.values()), 0);
  nodeNames.forEach((name: string) => {
    if (!levels.has(name)) {
      levels.set(name, maxLevel + 1);
      maxLevel++;
    }
  });

  // Group nodes by level
  const nodesByLevel: Map<number, string[]> = new Map();
  levels.forEach((level, nodeName) => {
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)?.push(nodeName);
  });

  // Calculate positions for each node
  const positions: Map<string, NodePosition> = new Map();
  nodes.forEach((node) => {
    const nodeName = node.name || node.agent?.name || '';
    const level = levels.get(nodeName) || 0;
    const nodesAtLevel = nodesByLevel.get(level) || [];
    const indexInLevel = nodesAtLevel.indexOf(nodeName);

    // Center nodes horizontally if there are multiple at the same level
    const totalNodesAtLevel = nodesAtLevel.length;
    const xOffset = (indexInLevel - (totalNodesAtLevel - 1) / 2) * xSpacing;

    positions.set(nodeName, {
      x: startX + xOffset,
      y: startY + (level * ySpacing),
    });
  });

  return {
    levels,
    nodesByLevel,
    positions,
  };
}

/**
 * Extracts the name from a graph node or edge node reference
 */
export function getNodeName(node: any, fallback: string = ''): string {
  return node?.name || node?.agent?.name || fallback;
}

/**
 * Returns the Material icon name for a given node type
 */
export function getNodeTypeIcon(nodeType: string): string {
  switch (nodeType) {
    case 'start':
      return 'play_arrow';
    case 'function':
      return 'code';
    case 'tool':
      return 'build';
    case 'join':
      return 'merge';
    case 'agent':
    default:
      return 'smart_toy';
  }
}

/**
 * Returns the display label for a given node type
 */
export function getNodeTypeLabel(nodeType: string): string {
  switch (nodeType) {
    case 'start':
      return 'Start';
    case 'function':
      return 'Function';
    case 'tool':
      return 'Tool';
    case 'join':
      return 'Join';
    case 'agent':
    default:
      return 'Agent';
  }
}
