export interface AgentNode {
    isRoot: boolean;
    agentName: string;
    agentType: string;
    model: string;
    instructions: string;
}

export interface ToolNode {
    toolName: string;
    toolType: string;
    toolCode?: string;
}

export interface DiagramNode {
  id: string;
  type: 'agent' | 'tool';
  x: number;
  y: number;
  label: string;
  color: string;
  icon: string;
  data: AgentNode | ToolNode;
}

export interface DiagramConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}