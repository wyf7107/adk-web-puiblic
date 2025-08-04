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
  private agentToolsSubject = new BehaviorSubject<{ agentName: string, tools: ToolNode[] } | undefined>(undefined);
  private newTabSubject = new BehaviorSubject<{tabName: string, currentAgentName?: string}|undefined>(undefined);

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

    this.setSelectedNode(this.selectedNodeSubject.value);
  }

  getNodes(): AgentNode[] {
    return this.nodes;
  }

  clear() {
    this.nodes = [];
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

  requestNewTab(tabName: string, currentAgentName?: string) {
    this.newTabSubject.next({tabName, currentAgentName});
  }

  requestTabSwitch(tabName: string) {
    this.newTabSubject.next({tabName});
  }

  getNewTabRequest(): Observable<{tabName: string, currentAgentName?: string}|undefined> {
    return this.newTabSubject.asObservable();
  }

  getAgentTools(): Observable<{ agentName: string, tools: ToolNode[] } | undefined> {
    return this.agentToolsSubject.asObservable();
  }

  setAgentTools(agentName?: string, tools?: ToolNode[]) {
    if (agentName && tools) {
      this.agentToolsSubject.next({ agentName, tools });
    } else {
      this.agentToolsSubject.next(undefined);
    }
  }

  getParentNode(current: AgentNode|undefined, target: AgentNode, parent: AgentNode|undefined): AgentNode|undefined {
    if (!current) {
        return undefined;
    }
    
    if (current.name === target.name) {
        return parent;
    }

    for (const subNode of current.sub_agents) {
        const foundParent = this.getParentNode(subNode, target, current);
        if (foundParent) {
            return foundParent;
        }
    }

    return undefined;
  }

  deleteNode(agentNode: AgentNode) {
    this.nodes = this.nodes.filter(node => node.name !== agentNode.name);

    this.setSelectedNode(this.selectedNodeSubject.value);
  }
}