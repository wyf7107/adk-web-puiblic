import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { AgentNode, ToolNode, CallbackNode } from '../models/AgentBuilder';

@Injectable({
  providedIn: 'root'
})
export class AgentBuilderService {
  private nodes: AgentNode[] = [];

  private selectedToolSubject = new BehaviorSubject<any | undefined>(undefined);
  private selectedNodeSubject = new BehaviorSubject<AgentNode|undefined>(undefined);
  private selectedCallbackSubject = new BehaviorSubject<CallbackNode|undefined>(undefined);
  private loadedAgentDataSubject = new BehaviorSubject<string|undefined>(undefined);
  private agentToolsMapSubject = new BehaviorSubject<Map<string, ToolNode[]>>(new Map());
  private agentToolsSubject = new BehaviorSubject<{ agentName: string, tools: ToolNode[] } | undefined>(undefined);
  private newTabSubject = new BehaviorSubject<{tabName: string, currentAgentName?: string}|undefined>(undefined);
  private agentCallbacksSubject = new BehaviorSubject<{ agentName: string, callbacks: CallbackNode[] } | undefined>(undefined);
  private tabDeletionSubject = new BehaviorSubject<string|undefined>(undefined);
  private deleteSubAgentSubject = new BehaviorSubject<string>('');
  private addSubAgentSubject = new BehaviorSubject<string>('');
  private tabChangeSubject = new BehaviorSubject<string|undefined>(undefined);

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
    this.setSelectedCallback(undefined);
    this.setAgentTools();
    this.setAgentCallbacks();
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

  getSelectedCallback(): Observable<CallbackNode|undefined> {
    return this.selectedCallbackSubject.asObservable();
  }

  setSelectedCallback(callback: CallbackNode | undefined) {
    this.selectedCallbackSubject.next(callback);
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

  addCallback(agentName: string, callback: CallbackNode): { success: boolean, error?: string } {
    try {
      const agentNode = this.getNode(agentName);
      if (!agentNode) {
        return { success: false, error: 'Agent not found' };
      }
      
      if (!agentNode.callbacks) {
        agentNode.callbacks = [];
      }
      
      // Check for duplicate callback names
      const duplicateCallback = agentNode.callbacks.find(cb => cb.name === callback.name);
      if (duplicateCallback) {
        return { success: false, error: `Callback with name '${callback.name}' already exists` };
      }
      
      // Validate callback name (must be valid Python identifier)
      const pythonIdentifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      if (!pythonIdentifierRegex.test(callback.name)) {
        return { success: false, error: 'Callback name must be a valid Python identifier' };
      }
      
      // Basic Python code validation
      if (!callback.code || callback.code.trim().length === 0) {
        return { success: false, error: 'Callback code cannot be empty' };
      }
      
      agentNode.callbacks.push(callback);
      this.agentCallbacksSubject.next({ agentName, callbacks: agentNode.callbacks });
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to add callback: ' + (error as Error).message };
    }
  }

  deleteCallback(agentName: string, callbackToDelete: CallbackNode): { success: boolean, error?: string } {
    try {
      const agentNode = this.getNode(agentName);
      if (!agentNode) {
        return { success: false, error: 'Agent not found' };
      }
      
      if (!agentNode.callbacks) {
        return { success: false, error: 'No callbacks found for this agent' };
      }
      
      const callbackIndex = agentNode.callbacks.findIndex(callback => callback.name === callbackToDelete.name);
      if (callbackIndex === -1) {
        return { success: false, error: 'Callback not found' };
      }
      
      agentNode.callbacks.splice(callbackIndex, 1);
      this.agentCallbacksSubject.next({ agentName, callbacks: agentNode.callbacks });
      
      // Clear selection if the deleted callback was selected
      if (this.selectedCallbackSubject.value?.name === callbackToDelete.name) {
        this.setSelectedCallback(undefined);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete callback: ' + (error as Error).message };
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

  requestNewTab(tabName: string, currentAgentName?: string) {
    this.newTabSubject.next({tabName, currentAgentName});
  }

  requestTabSwitch(tabName: string) {
    this.newTabSubject.next({tabName});
  }

  getNewTabRequest(): Observable<{tabName: string, currentAgentName?: string}|undefined> {
    return this.newTabSubject.asObservable();
  }

  requestTabDeletion(tabName: string) {
    this.tabDeletionSubject.next(tabName);
  }

  getTabDeletionRequest(): Observable<string|undefined> {
    return this.tabDeletionSubject.asObservable();
  }

  requestSideTabChange(tabName: string) {
    this.tabChangeSubject.next(tabName);
  }

  getSideTabChangeRequest(): Observable<string|undefined> {
    return this.tabChangeSubject.asObservable();
  }

  getAgentTools(): Observable<{ agentName: string, tools: ToolNode[] } | undefined> {
    return this.agentToolsSubject.asObservable();
  }

  getDeleteSubAgentSubject(): Observable<string> {
    return this.deleteSubAgentSubject.asObservable();
  }

  setDeleteSubAgentSubject(agentName: string) {
    this.deleteSubAgentSubject.next(agentName);
  }

  getAddSubAgentSubject(): Observable<string> {
    return this.addSubAgentSubject.asObservable();
  }

  setAddSubAgentSubject(agentName: string) {
    this.addSubAgentSubject.next(agentName);
  }

  setAgentTools(agentName?: string, tools?: ToolNode[]) {
    if (agentName && tools) {
      this.agentToolsSubject.next({ agentName, tools });
    } else {
      this.agentToolsSubject.next(undefined);
    }
  }

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