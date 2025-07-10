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