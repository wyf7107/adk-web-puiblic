import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { AgentNode, ToolNode } from '../models/AgentBuilder';

@Injectable({
  providedIn: 'root'
})
export class AgentBuilderService {
  private nodes: AgentNode[] = [];

  private selectedToolSubject = new BehaviorSubject<any | undefined>(undefined);
  private selectedNodeSubject = new BehaviorSubject<AgentNode|undefined>(undefined);
  private loadedAgentDataSubject = new BehaviorSubject<string|undefined>(undefined);
  private agentToolsMapSubject = new BehaviorSubject<Map<string, ToolNode[]>>(new Map());

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
    this.nodes.push(newNode);
    const currentMap = this.agentToolsMapSubject.value;
    const newMap = new Map(currentMap);
    newMap.set(newNode.name, newNode.tools || []);
    this.agentToolsMapSubject.next(newMap);
    this.setSelectedNode(this.selectedNodeSubject.value);
  }

  getNodes(): AgentNode[] {
    return this.nodes;
  }

  clear() {
    this.nodes = [];
    this.setSelectedNode(undefined);
    this.setSelectedTool(undefined);
    this.agentToolsMapSubject.next(new Map());
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

  addTool(agentName: string, tool: ToolNode) {
    const agentNode = this.getNode(agentName);
    if (agentNode) {
      const oldTools = agentNode.tools || [];
      agentNode.tools = [tool, ...oldTools];

      const currentMap = this.agentToolsMapSubject.value;
      const newMap = new Map(currentMap);
      newMap.set(agentName, agentNode.tools);
      this.agentToolsMapSubject.next(newMap);
    }
  }

  deleteTool(agentName: string, toolToDelete: ToolNode) {
    const agentNode = this.getNode(agentName);
    if (agentNode && agentNode.tools) {
      const originalLength = agentNode.tools.length;
      agentNode.tools = agentNode.tools.filter(t => t.name !== toolToDelete.name);

      if (agentNode.tools.length < originalLength) {
        const currentMap = this.agentToolsMapSubject.value;
        const newMap = new Map(currentMap);
        newMap.set(agentName, agentNode.tools);
        this.agentToolsMapSubject.next(newMap);

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

  getAgentToolsMap(): Observable<Map<string, ToolNode[]>> {
    return this.agentToolsMapSubject.asObservable();
  }
}