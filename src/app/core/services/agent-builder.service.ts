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
  private isCreatingNewAgentSubject = new BehaviorSubject<boolean>(true);

  constructor() { }

  /**
   * Returns the node data.
   */
  getNode(agentName: string): AgentNode|undefined {
    const node = this.nodes.find(node => node.name === agentName);
    return node;
  }

  /**
   * Adds a new AgentNode to the list.
   * @param newNode The agentNode to add.
   */
  addNode(newNode: AgentNode): void {
    this.nodes.push(newNode);
  }

  getNodes(): AgentNode[] {
    return this.nodes;
  }

  clear() {
    this.nodes = [];
    this.setSelectedNode(undefined);
    this.setSelectedTool(undefined);
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

  setLoadedAgentData(agent: string | undefined) {
    this.loadedAgentDataSubject.next(agent);
  }

  getLoadedAgentData(): Observable<string|undefined> {
    return this.loadedAgentDataSubject.asObservable();
  }

  setIsCreatingNewAgent(newAgent: boolean) {
    this.isCreatingNewAgentSubject.next(newAgent);
  }

  getIsCreatingNewAgent() {
    return this.isCreatingNewAgentSubject.asObservable();
  }
}