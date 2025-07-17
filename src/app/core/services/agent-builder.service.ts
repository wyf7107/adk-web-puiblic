import { Injectable } from '@angular/core';
import { Observable, of as ObservableOf, BehaviorSubject} from 'rxjs';
import { AgentNode } from '../models/AgentBuilder';

@Injectable({
  providedIn: 'root'
})
export class AgentBuilderService {
  private nodes: AgentNode[] = [];

  private selectedNodeSubject = new BehaviorSubject<AgentNode|undefined>(undefined);

  constructor() { }

  /**
   * Returns the node data.
   */
  getNode(agentName: string): AgentNode|undefined {
    const node = this.nodes.find(node => node.agentName === agentName);

    return node;
  }

  /**
   * Adds a new AgentNode to the list.
   * @param newNode The agentNode to add.
   */
  addNode(newNode: AgentNode): void {
    this.nodes.push(newNode);
  }

  getSelectedNode(): Observable<AgentNode|undefined> {
    return this.selectedNodeSubject.asObservable();
  }

  setSelectedNode(node: AgentNode) {
    this.selectedNodeSubject.next(node);
  }
}