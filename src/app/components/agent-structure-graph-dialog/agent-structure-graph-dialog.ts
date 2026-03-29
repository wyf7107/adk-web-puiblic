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

    // First, fetch full app data for navigation
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
              this.onNodeClick(nodeName);
            }, expandableNodes);
          }, 100);
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

}
