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

import {Component, ElementRef, ViewChild, AfterViewInit, OnInit} from '@angular/core';
import { AgentNode } from '../../core/models/AgentBuilder';
import { MatDialog } from '@angular/material/dialog';
import { AgentNodeCreateDialogComponent } from './agent-node-create-dialog/agent-node-create-dialog.component';
import Konva from "konva";
import {CanvasUtils} from "../../../utils/canvas";

interface DiagramNode {
  id: string;
  type: string;
  x: number;
  y: number;
  label: string;
  color: string;
  icon: string;
  data: AgentNode;
}

interface DiagramConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss',
  standalone: false
})
export class CanvasComponent implements AfterViewInit, OnInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('svgCanvas', { static: false }) svgCanvasRef!: ElementRef<SVGElement>;

  private stage!: Konva.Stage;
  private layer!: Konva.Layer;

  private ctx!: CanvasRenderingContext2D;
  public nodes: DiagramNode[] = [];
  public connections: DiagramConnection[] = [];
  private draggedNode: DiagramNode | null = null;
  private dragOffset = { x: 0, y: 0 };
  private nodeIdCounter = 0;
  private connectionIdCounter = 0;
  public isConnecting = false;
  private connectionStart: DiagramNode | null = null;

  constructor(private dialog: MatDialog) {}

  ngOnInit() {
    this.createKonvaCanvas();
  }

  ngAfterViewInit() {
    //this.initializeCanvas();
  }

  private initializeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    // Use setTimeout to ensure the canvas is properly sized after Angular rendering
    setTimeout(() => {
      this.resizeCanvas();
      this.drawCanvas();
    }, 0);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement!;
    const rect = container.getBoundingClientRect();

    // Adjust for device pixel ratio to ensure crisp rendering on high-DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    // Set the display size of the canvas
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    this.drawCanvas();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const componentType = event.dataTransfer!.getData('text/plain');
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dialogRef = this.dialog.open(AgentNodeCreateDialogComponent, {
          maxWidth: '220vw',
          maxHeight: '220vh',
          data: {
            type: componentType,
          },
    });

    dialogRef.afterClosed().subscribe((data) => {
      if (data) {
        this.addNode(componentType, x, y, data)
      }
    })
  }

  private addNode(type: string, x: number, y: number, data: AgentNode) {
    const nodeConfig = this.getNodeConfig(type);
    const node: DiagramNode = {
      id: `node_${this.nodeIdCounter++}`,
      type,
      x: x - 50, // Center the node
      y: y - 25,
      label: nodeConfig.label,
      color: nodeConfig.color,
      icon: nodeConfig.icon,
      data: data
    };
    
    this.nodes.push(node);
    this.drawCanvas();
  }

  private getNodeConfig(type: string) {
    const configs = {
      agent: { label: 'Agent', color: '#1A202C', icon: '🤖' },
      tool: { label: 'Tool', color: '#34a853', icon: '🔧' }
    };
    return configs[type as keyof typeof configs] || configs.agent;
  }

  // onMouseDown(event: MouseEvent) {
  //   const rect = this.canvasRef.nativeElement.getBoundingClientRect();
  //   const x = event.clientX - rect.left;
  //   const y = event.clientY - rect.top;
  //
  //   const clickedNode = this.getNodeAt(x, y);
  //   if (clickedNode) {
  //     if (event.shiftKey) {
  //       // Start connection mode
  //       this.startConnection(clickedNode);
  //     } else {
  //       // Start dragging
  //       this.draggedNode = clickedNode;
  //       this.dragOffset.x = x - clickedNode.x;
  //       this.dragOffset.y = y - clickedNode.y;
  //     }
  //   }
  // }

  onMouseMove(event: MouseEvent) {
    if (this.draggedNode) {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      this.draggedNode.x = x - this.dragOffset.x;
      this.draggedNode.y = y - this.dragOffset.y;
      
      this.updateConnections();
      this.drawCanvas();
    }
  }

  onMouseUp(event: MouseEvent) {
    if (this.isConnecting && this.connectionStart) {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const targetNode = this.getNodeAt(x, y);
      if (targetNode && targetNode !== this.connectionStart) {
        this.createConnection(this.connectionStart, targetNode);
      }
      
      this.isConnecting = false;
      this.connectionStart = null;
    }
    
    this.draggedNode = null;
  }

  private startConnection(node: DiagramNode) {
    this.isConnecting = true;
    this.connectionStart = node;
  }

  private createConnection(fromNode: DiagramNode, toNode: DiagramNode) {
    const connection: DiagramConnection = {
      id: `connection_${this.connectionIdCounter++}`,
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      fromX: fromNode.x + 50,
      fromY: fromNode.y + 25,
      toX: toNode.x + 50,
      toY: toNode.y + 25
    };
    
    this.connections.push(connection);
    this.drawCanvas();
  }

  private updateConnections() {
    this.connections.forEach(connection => {
      const fromNode = this.nodes.find(n => n.id === connection.fromNodeId);
      const toNode = this.nodes.find(n => n.id === connection.toNodeId);
      
      if (fromNode && toNode) {
        connection.fromX = fromNode.x + 50;
        connection.fromY = fromNode.y + 25;
        connection.toX = toNode.x + 50;
        connection.toY = toNode.y + 25;
      }
    });
  }

  private getNodeAt(x: number, y: number): DiagramNode | null {
    return this.nodes.find(node => 
      x >= node.x && x <= node.x + 100 &&
      y >= node.y && y <= node.y + 50
    ) || null;
  }

  private drawCanvas() {
    // Draw nodes
    this.drawNodes();
  }

  private drawConnections() {
    this.connections.forEach(connection => {
      this.drawArrow(connection.fromX, connection.fromY, connection.toX, connection.toY);
    });
  }

  private drawArrow(fromX: number, fromY: number, toX: number, toY: number) {
    const headlen = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    // Draw line
    this.ctx.strokeStyle = '#8ab4f8';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
    
    // Draw arrowhead
    this.ctx.fillStyle = '#8ab4f8';
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawNodes() {
    this.nodes.forEach(node => {
      this.drawNode(node);
    });
  }

  private drawNode(node: DiagramNode) {
    switch (node.type) {
      case 'agent':
        CanvasUtils.drawAgentNode(this.layer, node, this.nodeSettingsClicked.bind(this));
    }
  }

  nodeSettingsClicked(node: DiagramNode, group: Konva.Group) {
    const dialogRef = this.dialog.open(AgentNodeCreateDialogComponent, {
      maxWidth: '220vw',
      maxHeight: '220vh',
      data: {
        type: node.type,
        node: node.data
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      node.data = result;
      const agentTypeText = group.findOne('.agent-type') as Konva.Text
      agentTypeText.text(node.data.agentType)
      const agentModelText = group.findOne('.agent-model') as Konva.Text
      agentModelText.text(node.data.model)
      const agentInsText = group.findOne('.agent-instructions') as Konva.Text
      agentInsText.text(node.data.instructions)
      const agentNameText = group.findOne('.agent-name') as Konva.Text
      agentNameText.text(node.icon + node.data.agentName)
      group.draw();
    })
  }

  private darkenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor));
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }

  private lightenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) * (1 + factor));
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) * (1 + factor));
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) * (1 + factor));
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }

  clearCanvas() {
    this.nodes = [];
    this.connections = [];
    this.nodeIdCounter = 0;
    this.connectionIdCounter = 0;
    this.drawCanvas();
  }

  exportDiagram() {
    const canvas = this.canvasRef.nativeElement;
    const dataURL = canvas.toDataURL('image/png');
    
    // Create download link
    const link = document.createElement('a');
    link.download = 'adk-workflow-diagram.png';
    link.href = dataURL;
    link.click();
  }

  cancelConnection() {
    this.isConnecting = false;
    this.connectionStart = null;
  }

  save() {
    const rootAgentNode = this.nodes.filter(n => n.type === 'agent' && n.data.isRoot)[0];
  }

  createKonvaCanvas(): void {
    // Create the Konva Stage
    this.stage = new Konva.Stage({
      container: 'konva-container', // id of the div that will contain the canvas
      width: window.innerWidth,
      height: window.innerHeight
    });

    // Create a Layer for drawing
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
  }
}
