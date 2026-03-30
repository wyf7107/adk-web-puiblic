/**
 * @license
 * Copyright 2026 Google LLC
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

import { Component, inject, OnInit, signal, Input, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { SafeHtml } from '@angular/platform-browser';
import { AGENT_SERVICE } from '../../core/services/interfaces/agent';
import { GRAPH_SERVICE } from '../../core/services/interfaces/graph';
import { SAFE_VALUES_SERVICE } from '../../core/services/interfaces/safevalues';
import { THEME_SERVICE } from '../../core/services/interfaces/theme';
import { addSvgNodeHoverEffects } from '../../utils/svg-interaction.utils';
import { NavigationStackItem, hasNestedStructure, findNodeInLevel, getNodesAtLevel } from '../../utils/graph-navigation.utils';
import { getNodeName } from '../../utils/graph-layout.utils';

@Component({
  selector: 'app-agent-structure-graph-dialog',
  templateUrl: './agent-structure-graph-dialog.html',
  styleUrls: ['./agent-structure-graph-dialog.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
})
export class AgentStructureGraphDialogComponent implements OnInit {
  @Input() appName!: string;
  @Input() preloadedAppData?: any;
  @Input() preloadedLightGraphSvg?: string | null;
  @Input() preloadedDarkGraphSvg?: string | null;
  @Output() close = new EventEmitter<void>();

  private readonly agentService = inject(AGENT_SERVICE);
  private readonly graphService = inject(GRAPH_SERVICE);
  private readonly sanitizer = inject(SAFE_VALUES_SERVICE);
  private readonly themeService = inject(THEME_SERVICE);

  public renderedGraph = signal<SafeHtml | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  // Navigation state
  private fullAppData: any = null;
  private navigationStack: NavigationStackItem[] = [];
  public breadcrumbs = signal<string[]>([]);

  // Panning and zooming state
  private isPanning = false;
  private wasDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private startPanX = 0;
  private startPanY = 0;
  private scale = 1;
  private translateX = 0;
  private translateY = 0;

  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      !target.closest('svg') && 
      !target.closest('.overlay-header') &&
      !target.closest('.loading-container') &&
      !target.closest('.error-container') &&
      !target.closest('.no-graph-container')
    ) {
      this.close.emit();
    }
  }

  ngOnInit(): void {
    this.loadAgentGraph();
  }

  private loadAgentGraph(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.renderedGraph.set(null);

    // If preloaded app data is provided, use it directly
    if (this.preloadedAppData) {
      this.fullAppData = this.preloadedAppData;
      this.navigationStack = [{
        name: this.fullAppData.root_agent?.name || this.appName,
        data: this.fullAppData.root_agent
      }];
      this.updateBreadcrumbs();
      this.renderCurrentLevel();
      return;
    }

    // Otherwise fetch full app data for navigation
    this.agentService.getAppInfo(this.appName).subscribe({
      next: (appData: any) => {
        this.fullAppData = appData;
        this.navigationStack = [{
          name: appData.root_agent?.name || this.appName,
          data: appData.root_agent
        }];
        this.updateBreadcrumbs();
        this.renderCurrentLevel();
      },
      error: (error) => {
        console.error('Error loading app data:', error);
        this.errorMessage.set('Agent structure graph not available.');
        this.isLoading.set(false);
      },
    });
  }

  private renderCurrentLevel(): void {
    const isDarkMode = this.themeService.currentTheme() === 'dark';
    const currentPath = this.getCurrentPath();

    if (currentPath === '') {
      const preloadedGraph = isDarkMode ? this.preloadedDarkGraphSvg : this.preloadedLightGraphSvg;
      if (preloadedGraph) {
        this.renderedGraph.set(this.sanitizer.bypassSecurityTrustHtml(preloadedGraph));
        this.isLoading.set(false);
        setTimeout(() => {
          const expandableNodes = this.getExpandableNodes();
          addSvgNodeHoverEffects('.svg-container', (nodeName) => {
            if (this.wasDragging) return;
            this.onNodeClick(nodeName);
          }, expandableNodes);

          this.initializeSvgTransform();
        }, 50);
        return;
      }
    }

    this.agentService.getAppGraphImage(this.appName, isDarkMode, currentPath).subscribe({
      next: async (response: any) => {
        try {
          if (!response?.dotSrc) {
            this.errorMessage.set('Agent structure graph not available.');
            this.isLoading.set(false);
            return;
          }
          const svg = await this.graphService.render(response.dotSrc);
          this.renderedGraph.set(this.sanitizer.bypassSecurityTrustHtml(svg));
          this.isLoading.set(false);

          // Add hover effects after rendering
          setTimeout(() => {
            const expandableNodes = this.getExpandableNodes();
            addSvgNodeHoverEffects('.svg-container', (nodeName) => {
              if (this.wasDragging) return; // Prevent click if user was panning graph
              this.onNodeClick(nodeName);
            }, expandableNodes);

            this.initializeSvgTransform();
          }, 50);
        } catch (error) {
          console.error('Error rendering graph:', error);
          this.errorMessage.set('Agent structure graph not available.');
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        console.error('Error loading agent graph:', error);
        this.errorMessage.set('Agent structure graph not available.');
        this.isLoading.set(false);
      },
    });
  }

  private getCurrentPath(): string {
    if (this.navigationStack.length <= 1) {
      return '';
    }
    // Skip the first element (root) and join the rest
    return this.navigationStack.slice(1).map(item => item.name).join('/');
  }

  private updateBreadcrumbs(): void {
    this.breadcrumbs.set(this.navigationStack.map(item => item.name));
  }

  private onNodeClick(nodeName: string): void {
    const currentData = this.navigationStack[this.navigationStack.length - 1].data;
    const nodeData = findNodeInLevel(currentData, nodeName);

    if (nodeData && hasNestedStructure(nodeData)) {
      this.navigateIntoNode(nodeName, nodeData);
    }
  }

  navigateIntoNode(nodeName: string, nodeData: any): void {
    this.navigationStack.push({ name: nodeName, data: nodeData });
    this.updateBreadcrumbs();
    this.isLoading.set(true);
    this.renderCurrentLevel();
  }

  navigateToLevel(index: number): void {
    if (index >= 0 && index < this.navigationStack.length) {
      this.navigationStack = this.navigationStack.slice(0, index + 1);
      this.updateBreadcrumbs();
      this.isLoading.set(true);
      this.renderCurrentLevel();
    }
  }

  private getExpandableNodes(): Set<string> {
    const expandableNodes = new Set<string>();

    if (!this.navigationStack.length) {
      return expandableNodes;
    }

    const currentData = this.navigationStack[this.navigationStack.length - 1].data;
    const currentNodeName = this.navigationStack[this.navigationStack.length - 1].name;
    const nodes = getNodesAtLevel(currentData);

    nodes.forEach((node: any) => {
      const nodeName = getNodeName(node);
      if (nodeName !== currentNodeName && hasNestedStructure(node)) {
        expandableNodes.add(nodeName);
      }
    });

    return expandableNodes;
  }

  // --- Pan and Zoom logic ---
  private getSvgElement(): SVGSVGElement | null {
    return document.querySelector('.svg-container svg') as SVGSVGElement | null;
  }

  private applyTransform() {
    const svg = this.getSvgElement();
    if (svg) {
      svg.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    }
  }

  private initializeSvgTransform() {
    const svg = this.getSvgElement();
    const container = document.querySelector('.svg-container') as HTMLElement;
    if (!svg || !container) return;

    const svgRect = svg.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Scale slightly to fit inside container with some padding if it's too big
    const padding = 48;
    const scaleX = (containerRect.width - padding) / svgRect.width;
    const scaleY = (containerRect.height - padding) / svgRect.height;
    this.scale = Math.min(1, scaleX, scaleY);

    const scaledWidth = svgRect.width * this.scale;
    const scaledHeight = svgRect.height * this.scale;

    // Center properly
    this.translateX = (containerRect.width - scaledWidth) / 2;
    this.translateY = (containerRect.height - scaledHeight) / 2;

    this.applyTransform();
    
    // Reveal visually after transforming to avoid flash!
    requestAnimationFrame(() => {
      svg.classList.add('ready');
    });
  }

  onWheel(event: WheelEvent) {
    const container = document.querySelector('.svg-container') as HTMLElement;
    const svg = this.getSvgElement();
    if (!container || !svg) return;

    // Prevent modal scrolling
    event.preventDefault();

    const clampedDelta = Math.max(-100, Math.min(100, event.deltaY));
    const zoomFactor = Math.pow(1.002, -clampedDelta);
    const newScale = this.scale * zoomFactor;

    const rect = container.getBoundingClientRect();
    const posX = event.clientX - rect.left;
    const posY = event.clientY - rect.top;

    const localX = (posX - this.translateX) / this.scale;
    const localY = (posY - this.translateY) / this.scale;

    this.translateX = posX - localX * newScale;
    this.translateY = posY - localY * newScale;
    this.scale = newScale;

    this.applyTransform();
  }

  onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return; // Only target left clicks
    const target = event.target as HTMLElement;
    if (!target.closest('svg')) return; // Ensure they grabbed the small SVG panel!

    this.isPanning = true;
    this.wasDragging = false;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    
    this.startPanX = event.clientX;
    this.startPanY = event.clientY;

    const svg = this.getSvgElement();
    if (svg) svg.style.cursor = 'grabbing';
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isPanning) return;
    
    if (!this.wasDragging) {
      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;
      if (dx * dx + dy * dy > 25) { // 5px threshold for drag vs click
        this.wasDragging = true;
      }
    }
    
    this.translateX += (event.clientX - this.startPanX);
    this.translateY += (event.clientY - this.startPanY);

    this.startPanX = event.clientX;
    this.startPanY = event.clientY;

    this.applyTransform();
  }

  onMouseUp() {
    this.isPanning = false;
    const svg = this.getSvgElement();
    if (svg) svg.style.cursor = '';
    
    // Reset wasDragging safely after the event loop handles clicks
    setTimeout(() => {
      this.wasDragging = false;
    }, 50);
  }

  resetZoomPan() {
    this.initializeSvgTransform();
  }

}
