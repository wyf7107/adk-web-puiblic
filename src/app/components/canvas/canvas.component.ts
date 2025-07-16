/**
 * @license
 * Copyright 2025 Google LLC
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

import {Component, ElementRef, ViewChild, AfterViewInit, OnInit, inject, signal, EventEmitter, Output, Input, OnChanges, NO_ERRORS_SCHEMA, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { DiagramNode, DiagramConnection, AgentNode } from '../../core/models/AgentBuilder';
import { MatDialog } from '@angular/material/dialog';
import { AgentService } from '../../core/services/agent.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {Vflow, DynamicNode, Edge} from 'ngx-vflow'
import { MatIcon } from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss',
  standalone: true,
  imports: [Vflow, MatIcon, MatMenuModule, MatButtonModule, CommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.Default
})
export class CanvasComponent implements AfterViewInit, OnInit, OnChanges {
  @Input() selectedAgentNode: AgentNode | null = null;
  @Output() exitBuilderModeEvent = new EventEmitter<void>();
  @Output() nodeSelectedEvent = new EventEmitter<AgentNode>();
  private _snackBar = inject(MatSnackBar);
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('svgCanvas', { static: false }) svgCanvasRef!: ElementRef<SVGElement>;
  //public nodes = signal<DiagramNode[]>([]);
  public connections = signal<DiagramConnection[]>([]);
  private draggedNode: DiagramNode | null = null;
  private dragOffset = { x: 0, y: 0 };
  private nodeIdCounter = 0;
  private connectionIdCounter = 0;
  public isConnecting = false;
  private connectionStart: DiagramNode | null = null;

  nodeId = 2; // Start from 2 since the first agent is already created
  edgeId = 1;

  public nodes = signal<any[]>([]);
  public nodesKey = signal(0); // Key to force re-rendering

  public edges = signal<Edge[]>([]);
  public selectedNodeId = signal<string | null>(null);
  
  // Store agent data for each node
  private nodeAgentData = new Map<string, AgentNode>();

  constructor(private dialog: MatDialog, private agentService: AgentService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    //this.createKonvaCanvas();
    this.createRootAgent();
  }

  ngOnChanges() {
    console.log('ngOnChanges called, selectedAgentNode:', this.selectedAgentNode);
    console.log('nodes length:', this.nodes().length);
    
    if (this.selectedAgentNode && this.nodes().length > 0) {
      // Update the first node (root agent) with the new data
      this.updateNodeData('1', this.selectedAgentNode);
    }
  }

  ngAfterViewInit() {
    //this.initializeCanvas();
  }

  createRootAgent() {
    if (this.nodes().length == 0) {
      console.log('Creating root agent...');
      
      // Create default agent with specified default values
      const defaultAgent: AgentNode = {
        isRoot: true,
        agentName: 'agent_1',
        agentType: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instructions: 'You are a helpful assistant.'
      };
      
      // Create the root agent node
      const rootNode: DynamicNode = {
        id: '1',
        point: signal({ x: 100, y: 100 }),
        type: 'html-template',
        draggable: signal(true)
      };
      
      // Store the agent data separately
      this.nodeAgentData.set('1', defaultAgent);
      
      // Set nodes with only the root agent
      this.nodes.set([rootNode]);
      console.log('Root agent created:', rootNode);
      
      // Set empty edges array initially
      this.edges.set([]);
      
      // Select the root agent by default
      this.nodeSelectedEvent.emit(defaultAgent);
      
      // Verify after a delay
      setTimeout(() => {
        console.log('Final nodes:', this.nodes());
        console.log('Final edges:', this.edges());
        console.log('Node count:', this.nodes().length);
        console.log('Edge count:', this.edges().length);
      }, 500);
    }
  }

  onNodeClick(nodeData: any) {
    const nodeId = nodeData.id;
    const node = this.nodes().find((n: DynamicNode) => n.id === nodeId);
    
    if (node) {
      // Update selected node
      this.selectedNodeId.set(nodeId);
      
      // Get the stored agent data for this node
      const agentData = this.nodeAgentData.get(nodeId);
      
      if (agentData) {
        // Use the stored agent data
        this.nodeSelectedEvent.emit(agentData);
      } else {
        // Fallback to creating default agent data
        const defaultAgentData: AgentNode = {
          isRoot: nodeId === '1', // First agent is root
          agentName: `agent_${nodeId}`, // Use node ID as fallback name
          agentType: 'LlmAgent',
          model: 'gemini-2.5-flash',
          instructions: 'You are a helpful assistant.'
        };
        
        // Store the default data
        this.nodeAgentData.set(nodeId, defaultAgentData);
        this.nodeSelectedEvent.emit(defaultAgentData);
      }
    }
  }

  onCanvasClick(event: any) {
    // Deselect when clicking on empty space
    if (!event.target || !event.target.closest('.vflow-node')) {
      this.selectedNodeId.set(null);
    }
  }

  addSubAgent(parentNodeId: string, event: Event) {
    console.log('addSubAgent called with parentNodeId:', parentNodeId);
    event.stopPropagation(); // Prevent node selection when clicking the button
    // Create a new sub-agent with default values
    const subAgent: AgentNode = {
      isRoot: false,
      agentName: `agent_${this.nodeId}`,
      agentType: 'LlmAgent',
      model: 'gemini-2.5-flash',
      instructions: 'You are a helpful assistant.'
    };
    // Get the parent node's position
    const parentNode = this.nodes().find((n: DynamicNode) => n.id === parentNodeId);
    if (!parentNode) return;
    const parentPoint = (parentNode as any).point();
    // Position the new node directly below the parent
    const newX = parentPoint.x;
    const newY = parentPoint.y + 120; // 120px below parent
    // Create the new node
    const newNode: DynamicNode = {
      id: this.nodeId.toString(),
      point: signal({ x: newX, y: newY }),
      type: 'html-template',
      draggable: signal(true)
    };
    
    // Store the agent data for the new node
    this.nodeAgentData.set(this.nodeId.toString(), subAgent);
    
    // Add the new node
    this.nodes.set([...this.nodes(), newNode]);
    
    // Create an edge connecting parent to child
    const newEdge: Edge = {
      id: `${parentNodeId}->${this.nodeId}`,
      source: parentNodeId,
      target: this.nodeId.toString()
    };
    this.edges.set([...this.edges(), newEdge]);
    
    // Force re-rendering by updating the key
    this.nodesKey.set(this.nodesKey() + 1);
    
    // Increment the node ID for next use
    this.nodeId++;
    
    console.log('Added subagent:', subAgent.agentName);
    console.log('New node:', newNode);
    console.log('New edge:', newEdge);
    console.log('Total nodes:', this.nodes().length);
    console.log('Total edges:', this.edges().length);
  }

  updateNodeData(nodeId: string, updatedAgentData: AgentNode) {
    const currentNodes = this.nodes();
    const nodeIndex = currentNodes.findIndex((n: DynamicNode) => n.id === nodeId);
    
    if (nodeIndex !== -1) {
      // Create a completely new node object with updated text
      const existingNode = currentNodes[nodeIndex];
      const updatedNode: DynamicNode = {
        id: existingNode.id,
        point: existingNode.point,
        type: existingNode.type,
        text: signal(updatedAgentData.agentName),
        draggable: existingNode.draggable
      };
      
      // Create a new array with the updated node
      const updatedNodes = [...currentNodes];
      updatedNodes[nodeIndex] = updatedNode;
      
      // Update the nodes signal
      this.nodes.set(updatedNodes);
      
      // Update the stored agent data
      this.nodeAgentData.set(nodeId, updatedAgentData);
      
      // Increment the key to force re-rendering
      this.nodesKey.set(this.nodesKey() + 1);
      
      // Force change detection
      this.cdr.detectChanges();
      
      console.log('Updated node data:', nodeId, updatedAgentData.agentName);
      console.log('Current nodes after update:', this.nodes());
    }
  }

  exitBuilderMode() {
    this.exitBuilderModeEvent.emit();
  }

  getNodeButtonPosition(node: any): { x: number, y: number } {
    // Get the node's position from the signal
    const nodePoint = (node as any).point();
    
    // Position the button under the bottom of the node, center aligned
    // Assuming nodes are roughly 120px wide and 60px tall
    return {
      x: nodePoint.x + 60, // Center of the node (120px / 2)
      y: nodePoint.y + 70  // Below the node (60px + 10px gap)
    };
  }

  isNodeSelected(nodeId: string): boolean {
    return this.selectedNodeId() === nodeId;
  }

  getNodeDisplayName(nodeId: string): string {
    const agentData = this.nodeAgentData.get(nodeId);
    return agentData ? agentData.agentName : `agent_${nodeId}`;
  }


  // private initializeCanvas() {
  //   const canvas = this.canvasRef.nativeElement;
  //   this.ctx = canvas.getContext('2d')!;
    
  //   // Use setTimeout to ensure the canvas is properly sized after Angular rendering
  //   setTimeout(() => {
  //     this.resizeCanvas();
  //     this.drawCanvas();
  //   }, 0);
    
  //   // Handle window resize
  //   window.addEventListener('resize', () => {
  //     this.resizeCanvas();
  //   });
  // }

  // private resizeCanvas() {
  //   const canvas = this.canvasRef.nativeElement;
  //   const container = canvas.parentElement!;
  //   const rect = container.getBoundingClientRect();

  //   // Adjust for device pixel ratio to ensure crisp rendering on high-DPI screens
  //   const dpr = window.devicePixelRatio || 1;
  //   canvas.width = rect.width * dpr;
  //   canvas.height = rect.height * dpr;
  //   this.ctx.scale(dpr, dpr);

  //   // Set the display size of the canvas
  //   canvas.style.width = `${rect.width}px`;
  //   canvas.style.height = `${rect.height}px`;

  //   this.drawCanvas();
  // }

  // onDragOver(event: DragEvent) {
  //   event.preventDefault();
  //   event.dataTransfer!.dropEffect = 'copy';
  // }

  // onDrop(event: DragEvent) {
  //   event.preventDefault();
  //   const componentType = event.dataTransfer!.getData('text/plain') as 'agent' | 'tool';

  //   if (componentType !== 'agent' && componentType !== 'tool') {
  //     return;
  //   }

  //   const rect = (event.target as HTMLElement).getBoundingClientRect();
  //   const x = event.clientX - rect.left;
  //   const y = event.clientY - rect.top;

  //   const dialogConfig = {
  //     maxWidth: '220vw',
  //     maxHeight: '220vh',
  //     data: { type: componentType, isRootAgentEditable: true},
  //   };

  //   const dialogRef = componentType === 'agent'
  //       ? this.dialog.open(AgentNodeCreateDialogComponent, dialogConfig)
  //       : this.dialog.open(ToolNodeCreateDialogComponent, dialogConfig);

  //   dialogRef.afterClosed().subscribe((data: AgentNode | ToolNode) => {
  //     if (data) {
  //       this.addNode(componentType, x, y, data);
  //     }
  //   });
  // }

  // private addNode(type: 'agent' | 'tool', x: number, y: number, data: AgentNode | ToolNode): DiagramNode {
  //   const nodeConfig = this.getNodeConfig(type);
  //   const dimensions = this.getNodeDimensions(type);
  //   const node: DiagramNode = {
  //     id: `node_${this.nodeIdCounter++}`,
  //     type,
  //     x: x - (dimensions.width / 2), // Center the node
  //     y: y - (dimensions.height / 2),
  //     label: nodeConfig.label,
  //     color: nodeConfig.color,
  //     icon: nodeConfig.icon,
  //     data: data
  //   };
    
  //   this.nodes.update(nodes => [...nodes, node]);
  //   this.drawCanvas();
  //   return node;
  // }

  // private getNodeConfig(type: 'agent' | 'tool') {
  //   const configs = {
  //     agent: { label: 'Agent', color: '#1A202C', icon: '🤖' },
  //     tool: { label: 'Tool', color: '#34a853', icon: '🔧' }
  //   };
  //   return configs[type as keyof typeof configs] || configs.agent;
  // }

  // // onMouseDown(event: MouseEvent) {
  // //   const rect = this.canvasRef.nativeElement.getBoundingClientRect();
  // //   const x = event.clientX - rect.left;
  // //   const y = event.clientY - rect.top;
  // //
  // //   const clickedNode = this.getNodeAt(x, y);
  // //   if (clickedNode) {
  // //     if (event.shiftKey) {
  // //       // Start connection mode
  // //       this.startConnection(clickedNode);
  // //     } else {
  // //       // Start dragging
  // //       this.draggedNode = clickedNode;
  // //       this.dragOffset.x = x - clickedNode.x;
  // //       this.dragOffset.y = y - clickedNode.y;
  // //     }
  // //   }
  // // }

  // onMouseMove(event: MouseEvent) {
  //   if (this.draggedNode) {
  //     const rect = this.canvasRef.nativeElement.getBoundingClientRect();
  //     const x = event.clientX - rect.left;
  //     const y = event.clientY - rect.top;
      
  //     this.draggedNode.x = x - this.dragOffset.x;
  //     this.draggedNode.y = y - this.dragOffset.y;
      
  //     this.updateConnections();
  //     this.drawCanvas();
  //   }
  // }

  // onMouseUp(event: MouseEvent) {
  //   if (this.isConnecting && this.connectionStart) {
  //     const rect = this.canvasRef.nativeElement.getBoundingClientRect();
  //     const x = event.clientX - rect.left;
  //     const y = event.clientY - rect.top;
      
  //     const targetNode = this.getNodeAt(x, y);
  //     if (targetNode && targetNode !== this.connectionStart) {
  //       this.createConnection(this.connectionStart, targetNode);
  //     }
      
  //     this.isConnecting = false;
  //     this.connectionStart = null;
  //   }
    
  //   this.draggedNode = null;
  // }

  // private startConnection(node: DiagramNode) {
  //   this.isConnecting = true;
  //   this.connectionStart = node;
  // }

  // private createConnection(fromNode: DiagramNode, toNode: DiagramNode) {
  //   const fromDimensions = this.getNodeDimensions(fromNode.type);
  //   const toDimensions = this.getNodeDimensions(toNode.type);

  //   const connection: DiagramConnection = {
  //     id: `connection_${this.connectionIdCounter++}`,
  //     fromNodeId: fromNode.id,
  //     toNodeId: toNode.id,
  //     fromX: fromNode.x + fromDimensions.width / 2,
  //     fromY: fromNode.y + fromDimensions.height,
  //     toX: toNode.x + toDimensions.width / 2,
  //     toY: toNode.y
  //   };

  //   this.connections.update(conns => [...conns, connection]);
  //   this.drawCanvas();
  // }

  // private updateConnections() {
  //   this.connections().forEach(connection => {
  //     const fromNode = this.nodes().find(n => n.id === connection.fromNodeId);
  //     const toNode = this.nodes().find(n => n.id === connection.toNodeId);
      
  //     if (fromNode && toNode) {
  //       const fromDimensions = this.getNodeDimensions(fromNode.type);
  //       const toDimensions = this.getNodeDimensions(toNode.type);

  //       connection.fromX = fromNode.x + fromDimensions.width / 2;
  //       connection.fromY = fromNode.y + fromDimensions.height;
  //       connection.toX = toNode.x + toDimensions.width / 2;
  //       connection.toY = toNode.y;
  //     }
  //   });
  // }

  // private getNodeDimensions(type: 'agent' | 'tool'): { width: number, height: number } {
  //   if (type === 'agent') {
  //     return { width: 300, height: 300 };
  //   }
  //   // type === 'tool'
  //   return { width: 250, height: 150 };
  // }

  // private getNodeAt(x: number, y: number): DiagramNode | null {
  //   return this.nodes().find(node => 
  //     x >= node.x && x <= node.x + 100 &&
  //     y >= node.y && y <= node.y + 50
  //   ) || null;
  // }

  // private drawCanvas() {
  //   // Clear the layer to prevent drawing nodes on top of each other
  //   this.layer.destroyChildren();
  //   // Draw connections first so they appear behind the nodes
  //   this.drawConnections();
  //   this.drawNodes();
  //   // Use batchDraw for better performance
  //   this.layer.batchDraw();
  // }

  // private drawConnections() {
  //   this.connections().forEach(connection => {
  //     this.drawArrow(connection.fromX, connection.fromY, connection.toX, connection.toY, connection.id);
  //   });
  // }

  // private drawArrow(fromX: number, fromY: number, toX: number, toY: number, id: string) {
  //   const arrow = new Konva.Arrow({
  //     points: [fromX, fromY, toX, toY],
  //     pointerLength: 10,
  //     pointerWidth: 10,
  //     fill: '#8ab4f8',
  //     stroke: '#8ab4f8',
  //     strokeWidth: 3,
  //     id,
  //   });
  //   this.layer.add(arrow);
  // }

  // private drawNodes() {
  //   this.nodes().forEach(node => {
  //     this.drawNode(node)
  //   });
  // }

  // private drawNode(node: DiagramNode) {
  //   switch (node.type) {
  //     case 'agent':
  //       CanvasUtils.drawAgentNode(
  //         this.layer,
  //         node,
  //         this.nodeSettingsClicked.bind(this),
  //         this.addSubAgentClicked.bind(this),
  //         this.addToolClicked.bind(this),
  //         this.nodeDragging.bind(this),
  //         this.nodeDragged.bind(this), // dragEndCallback
  //       );
  //       break;
  //     case 'tool':
  //       CanvasUtils.drawToolNode(
  //         this.layer,
  //         node,
  //         this.nodeSettingsClicked.bind(this),
  //         this.nodeDragging.bind(this),
  //         this.nodeDragged.bind(this), // dragEndCallback
  //       );
  //       break;
  //   }
  // }

  // addSubAgentClicked(node: DiagramNode, group: Konva.Group) {
  //   if (node.type !== 'agent' || !('agentName' in node.data)) {
  //     return ;
  //   }
    
  //   const dialogRef = this.dialog.open(AgentNodeCreateDialogComponent, {
  //     maxWidth: '220vw',
  //     maxHeight: '220vh',
  //     data: {
  //       type: 'agent',
  //       isRootAgentEditable: false,
  //     },
  //   });

  //   dialogRef.afterClosed().subscribe((agentData: AgentNode) => {
  //     if (agentData) {
  //       // Update the agent node's data model with the new subagent
  //       const agentNode = node.data as AgentNode;
  //       if (!agentNode.subAgents) {
  //         agentNode.subAgents = [];
  //       }
  //       agentNode.subAgents.push(agentData);

  //       // Position the new tool node below the agent node
  //       const agentPosition = group.position();
  //       const agentDimensions = this.getNodeDimensions('agent');
  //       const toolDimensions = this.getNodeDimensions('tool');

  //       // Calculate the center for the new tool node
  //       const x = agentPosition.x + (agentDimensions.width / 2) + 200;
  //       const y = agentPosition.y + agentDimensions.height + 100 + (agentDimensions.height / 2);

  //       const newToolNode = this.addNode('agent', x, y, agentData);
  //       this.createConnection(node, newToolNode);
  //     }
  //   });

  // }

  // addToolClicked(node: DiagramNode, group: Konva.Group) {
  //   if (node.type !== 'agent') return;

  //   const dialogRef = this.dialog.open(ToolNodeCreateDialogComponent, {
  //     maxWidth: '220vw',
  //     maxHeight: '220vh',
  //     data: {
  //       type: 'tool',
  //     },
  //   });

  //   dialogRef.afterClosed().subscribe((toolData: ToolNode) => {
  //     if (toolData) {
  //       // Update the agent node's data model with the new tool
  //       const agentNode = node.data as AgentNode;
  //       if (!agentNode.tools) {
  //         agentNode.tools = [];
  //       }
  //       agentNode.tools.push(toolData);

  //       // Position the new tool node below the agent node
  //       const agentPosition = group.position();
  //       const agentDimensions = this.getNodeDimensions('agent');
  //       const toolDimensions = this.getNodeDimensions('tool');

  //       // Calculate the center for the new tool node
  //       const x = agentPosition.x + (agentDimensions.width / 2) - 200;
  //       const y = agentPosition.y + agentDimensions.height + 100 + (toolDimensions.height / 2);

  //       const newToolNode = this.addNode('tool', x, y, toolData);
  //       this.createConnection(node, newToolNode);
  //     }
  //   });
  // }

  // nodeDragged(node: DiagramNode, position: { x: number, y: number }) {
  //   const targetNode = this.nodes().find(n => n.id === node.id);
  //   if (targetNode) {
  //     // Sync the model with the new view position
  //     targetNode.x = position.x;
  //     targetNode.y = position.y;
      
  //     // After dragging, we need to update connection positions and redraw
  //     this.updateConnections();
  //     this.drawCanvas();
  //   }
  // }

  // nodeDragging(node: DiagramNode, group: Konva.Group) {
  //   const position = group.position();
  //   // Update connections
  //   this.connections().forEach(conn => {
  //     const fromNode = this.nodes().find(n => n.id === conn.fromNodeId);
  //     const toNode = this.nodes().find(n => n.id === conn.toNodeId);

  //     if (fromNode && toNode) {
  //       const fromDimensions = this.getNodeDimensions(fromNode.type);
  //       const toDimensions = this.getNodeDimensions(toNode.type);

  //       if (conn.fromNodeId === node.id) {
  //         const arrow = this.layer.findOne(`#${conn.id}`) as Konva.Arrow;
  //         if (arrow) {
  //           arrow.points([position.x + fromDimensions.width / 2, position.y + fromDimensions.height, conn.toX, conn.toY]);
  //         }
  //       } else if (conn.toNodeId === node.id) {
  //         const arrow = this.layer.findOne(`#${conn.id}`) as Konva.Arrow;
  //         if (arrow) {
  //           arrow.points([conn.fromX, conn.fromY, position.x + toDimensions.width / 2, position.y]);
  //         }
  //       }
  //     }
  //   });
  //   this.layer.batchDraw();
  // }

  // nodeSettingsClicked(node: DiagramNode, group: Konva.Group) {
  //   if (node.type === 'agent' && 'agentName' in node.data) {
  //     const dialogRef = this.dialog.open(AgentNodeCreateDialogComponent, {
  //       maxWidth: '220vw',
  //       maxHeight: '220vh',
  //       data: {
  //         type: node.type,
  //         node: node.data
  //       },
  //     });

  //     dialogRef.afterClosed().subscribe((result: AgentNode) => {
  //       if (result) {
  //         node.data = result;
  //         const agentTypeText = group.findOne('.agent-type') as Konva.Text;
  //         agentTypeText.text(node.data.agentType);
  //         const agentModelText = group.findOne('.agent-model') as Konva.Text;
  //         agentModelText.text(node.data.model);
  //         const agentInsText = group.findOne('.agent-instructions') as Konva.Text;
  //         agentInsText.text(node.data.instructions);
  //         const agentNameText = group.findOne('.agent-name') as Konva.Text;
  //         agentNameText.text(node.icon + node.data.agentName);
  //         group.draw();
  //       }
  //     });
  //   } else if (node.type === 'tool' && 'toolName' in node.data) {
  //     const dialogRef = this.dialog.open(ToolNodeCreateDialogComponent, {
  //       maxWidth: '220vw',
  //       maxHeight: '220vh',
  //       data: {
  //         type: node.type,
  //         node: node.data
  //       },
  //     });

  //     dialogRef.afterClosed().subscribe((result: ToolNode) => {
  //       if (result) {
  //         node.data = result;
  //         const toolNameText = group.findOne('.tool-name') as Konva.Text;
  //         if (toolNameText) {
  //           toolNameText.text(node.icon + (node.data as ToolNode).toolName);
  //         }
  //         const toolTypeText = group.findOne('.tool-type') as Konva.Text;
  //         if (toolTypeText) {
  //           toolTypeText.text((node.data as ToolNode).toolType);
  //         }
  //         group.draw();
  //       }
  //     });
  //   }
  // }

  // private darkenColor(color: string, factor: number): string {
  //   const hex = color.replace('#', '');
  //   const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor));
  //   const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor));
  //   const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor));
  //   return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  // }

  // private lightenColor(color: string, factor: number): string {
  //   const hex = color.replace('#', '');
  //   const r = Math.min(255, parseInt(hex.substr(0, 2), 16) * (1 + factor));
  //   const g = Math.min(255, parseInt(hex.substr(2, 2), 16) * (1 + factor));
  //   const b = Math.min(255, parseInt(hex.substr(4, 2), 16) * (1 + factor));
  //   return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  // }

  // clearCanvas() {
  //   this.nodes.set([]);
  //   this.connections.set([]);
  //   this.nodeIdCounter = 0;
  //   this.connectionIdCounter = 0;
  //   this.drawCanvas();
  // }

  // exportDiagram() {
  //   const canvas = this.canvasRef.nativeElement;
  //   const dataURL = canvas.toDataURL('image/png');
    
  //   // Create download link
  //   const link = document.createElement('a');
  //   link.download = 'adk-workflow-diagram.png';
  //   link.href = dataURL;
  //   link.click();
  // }

  // cancelConnection() {
  //   this.isConnecting = false;
  //   this.connectionStart = null;
  // }

  // save() {
  //   const rootAgentNode = this.nodes().find(n =>
  //     n.type === 'agent' && (n.data as AgentNode).isRoot
  //   );
  //   if (rootAgentNode) {
  //     const agentData = rootAgentNode.data as AgentNode;
  //     const req: AgentBuildRequest = {
  //       root: agentData,
  //     }
  //     this.agentService.agentBuild(req).subscribe((success) => {
  //       if (success) {
  //         this.router.navigate(['/'], {
  //           queryParams: { app: agentData.agentName }
  //         }).then(() => {
  //           window.location.reload();
  //         });
  //       } else {
  //         this._snackBar.open("Something went wrong, please try again", "OK");
  //       }
  //     })
  //   }
  // }

  // createKonvaCanvas(): void {
  //   // Create the Konva Stage
  //   this.stage = new Konva.Stage({
  //     container: 'konva-container', // id of the div that will contain the canvas
  //     width: window.innerWidth,
  //     height: window.innerHeight,
  //     draggable: true,
  //   });

  //   // Create a Layer for drawing
  //   this.layer = new Konva.Layer();
  //   this.stage.add(this.layer);

  //   this.stage.on('wheel', (e) => {
  //     e.evt.preventDefault();
  //     const scaleBy = 1.1;
  //     const oldScale = this.stage.scaleX();
  //     const pointer = this.stage.getPointerPosition();

  //     if (!pointer) return;

  //     const mousePointTo = {
  //       x: (pointer.x - this.stage.x()) / oldScale,
  //       y: (pointer.y - this.stage.y()) / oldScale,
  //     };

  //     const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

  //     this.stage.scale({ x: newScale, y: newScale });

  //     const newPos = {
  //       x: pointer.x - mousePointTo.x * newScale,
  //       y: pointer.y - mousePointTo.y * newScale,
  //     };
  //     this.stage.position(newPos);
  //     this.stage.batchDraw();
  //   });
  // }

  // zoomIn() {
  //   const scaleBy = 1.2;
  //   const oldScale = this.stage.scaleX();
  //   const newScale = oldScale * scaleBy;
  //   this.stage.scale({ x: newScale, y: newScale });
  //   this.stage.batchDraw();
  // }

  // zoomOut() {
  //   const scaleBy = 1.2;
  //   const oldScale = this.stage.scaleX();
  //   const newScale = oldScale / scaleBy;
  //   this.stage.scale({ x: newScale, y: newScale });
  //   this.stage.batchDraw();
  // }

  // resetZoom() {
  //   this.stage.scale({ x: 1, y: 1 });
  //   this.stage.position({ x: 0, y: 0 });
  //   this.stage.batchDraw();
  // }
}
