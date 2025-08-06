import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { AgentNode, ToolNode } from '../models/AgentBuilder';

@Injectable({
  providedIn: 'root'
})
export class AgentBuilderService {
  private nodes: AgentNode[] = [];
  private subAgentIdCounter = 1;

  private selectedToolSubject = new BehaviorSubject<any | undefined>(undefined);
  private selectedNodeSubject = new BehaviorSubject<AgentNode|undefined>(undefined);
  private loadedAgentDataSubject = new BehaviorSubject<string|undefined>(undefined);
  private agentToolsSubject = new BehaviorSubject<{ agentName: string, tools: ToolNode[] } | undefined>(undefined);

  constructor() { }

  /**
   * Returns the node data.
   */
  getNode(agentName: string): AgentNode|undefined {
    const node = this.nodes.find(node => node.name === agentName);
    return node;
  }

  /**
   * Returns the root node data.
   */
  getRootNode(): AgentNode|undefined {
    const node = this.nodes.find(node => !!node.isRoot);
    return node;
  }

  /**
   * Adds a new AgentNode to the list.
   * @param newNode The agentNode to add.
   */
  addNode(newNode: AgentNode): void {
<<<<<<< HEAD
    this.nodes.push(newNode);

=======
    const existingNodeIndex = this.nodes.findIndex(n => n.name === newNode.name);
    if (existingNodeIndex !== -1) {
      this.nodes[existingNodeIndex] = newNode;
    } else {
      this.nodes.push(newNode);
    }

    // If a new node's name matches the sub-agent pattern, update the counter
    // to avoid name collisions.
    const subAgentNamePattern = /^sub_agent_(\d+)$/;
    const match = newNode.name.match(subAgentNamePattern);
    if (match) {
      const numericPart = parseInt(match[1], 10);
      if (numericPart >= this.subAgentIdCounter) {
        this.subAgentIdCounter = numericPart + 1;
      }
    }

    const currentMap = this.agentToolsMapSubject.value;
    const newMap = new Map(currentMap);
    newMap.set(newNode.name, newNode.tools || []);
    this.agentToolsMapSubject.next(newMap);
>>>>>>> a738bd519c9f54c1542258d46e68aad746afb290
    this.setSelectedNode(this.selectedNodeSubject.value);
  }

  getNodes(): AgentNode[] {
    return this.nodes;
  }

  clear() {
    this.nodes = [];
    this.subAgentIdCounter = 1;
    this.setSelectedNode(undefined);
    this.setSelectedTool(undefined);
    this.setAgentTools();
  }

  getSelectedNode(): Observable<AgentNode|undefined> {
    return this.selectedNodeSubject.asObservable();
  }

  setSelectedNode(node: AgentNode | undefined) {
    this.selectedNodeSubject.next(node);
  }

  getSelectedTool(): Observable<ToolNode|undefined> {
    return this.selectedToolSubject.asObservable();
  }

  setSelectedTool(tool: ToolNode | undefined) {
    this.selectedToolSubject.next(tool);
  }

<<<<<<< HEAD
=======
  getSelectedCallback(): Observable<CallbackNode|undefined> {
    return this.selectedCallbackSubject.asObservable();
  }

  setSelectedCallback(callback: CallbackNode | undefined) {
    this.selectedCallbackSubject.next(callback);
  }

  getNextSubAgentName(): string {
    return `sub_agent_${this.subAgentIdCounter++}`;
  }

>>>>>>> a738bd519c9f54c1542258d46e68aad746afb290
  addTool(agentName: string, tool: ToolNode) {
    const agentNode = this.getNode(agentName);
    if (agentNode && agentNode.tools) {
      agentNode.tools.push(tool);
      this.agentToolsSubject.next({ agentName, tools: agentNode.tools });
    }
  }

  deleteTool(agentName: string, toolToDelete: ToolNode) {
    const agentNode = this.getNode(agentName);
    if (agentNode && agentNode.tools) {
      const toolIndex = agentNode.tools.findIndex(tool => tool.name === toolToDelete.name);
      if (toolIndex > -1) {
        agentNode.tools.splice(toolIndex, 1);
        this.agentToolsSubject.next({ agentName, tools: agentNode.tools });
        if (this.selectedToolSubject.value?.name === toolToDelete.name) {
          this.setSelectedTool(undefined);
        }
      }
    }
  }

  setLoadedAgentData(agent: string | undefined) {
    this.loadedAgentDataSubject.next(agent);
  }

  getLoadedAgentData(): Observable<string|undefined> {
    return this.loadedAgentDataSubject.asObservable();
  }

  getAgentTools(): Observable<{ agentName: string, tools: ToolNode[] } | undefined> {
    return this.agentToolsSubject.asObservable();
  }

  setAgentTools(agentName?: string, tools?: ToolNode[]) {
    if (agentName && tools) {
      this.agentToolsSubject.next({ agentName, tools });
      const currentMap = this.agentToolsMapSubject.value;
      const newMap = new Map(currentMap);
      newMap.set(agentName, tools);
      this.agentToolsMapSubject.next(newMap);
    } else {
      this.agentToolsSubject.next(undefined);
    }
  }

<<<<<<< HEAD
  getParentNode(current: AgentNode|undefined, target: AgentNode, parent: AgentNode|undefined): AgentNode|undefined {
=======
  getAgentCallbacks(): Observable<{ agentName: string, callbacks: CallbackNode[] } | undefined> {
    return this.agentCallbacksSubject.asObservable();
  }

  setAgentCallbacks(agentName?: string, callbacks?: CallbackNode[]) {
    if (agentName && callbacks) {
      this.agentCallbacksSubject.next({ agentName, callbacks });
    } else {
      this.agentCallbacksSubject.next(undefined);
    }
  }

  getParentNode(current: AgentNode | undefined, target: AgentNode, parent: AgentNode | undefined, allTabAgents: Map<string, AgentNode>): AgentNode | undefined {
>>>>>>> a738bd519c9f54c1542258d46e68aad746afb290
    if (!current) {
      return undefined;
    }

    if (current.name === target.name) {
      return parent;
    }

    // Search within sub-agents
    for (const subNode of current.sub_agents) {
      const foundParent = this.getParentNode(subNode, target, current, allTabAgents);
      if (foundParent) {
        return foundParent;
      }
    }

    // Search within agent tools
    if (current.tools) {
      for (const tool of current.tools) {
        if (tool.toolType === 'Agent Tool') {
          const agentToolNode = allTabAgents.get(tool.toolAgentName || tool.name);
          if (agentToolNode) {
            const foundParent = this.getParentNode(agentToolNode, target, current, allTabAgents);
            if (foundParent) {
              return foundParent;
            }
          }
        }
      }
    }

    return undefined;
  }

  deleteNode(agentNode: AgentNode) {
    this.nodes = this.nodes.filter(node => node.name !== agentNode.name);

    this.setSelectedNode(this.selectedNodeSubject.value);
  }
}