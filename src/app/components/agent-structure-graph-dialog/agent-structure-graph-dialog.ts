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

import {Component, inject, OnInit, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {SafeHtml} from '@angular/platform-browser';
import {AGENT_SERVICE} from '../../core/services/interfaces/agent';
import {GRAPH_SERVICE} from '../../core/services/interfaces/graph';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';

export interface AgentStructureGraphDialogData {
  appName: string;
}

@Component({
  selector: 'app-agent-structure-graph-dialog',
  templateUrl: './agent-structure-graph-dialog.html',
  styleUrls: ['./agent-structure-graph-dialog.scss'],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
})
export class AgentStructureGraphDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AgentStructureGraphDialogComponent>);
  readonly data = inject<AgentStructureGraphDialogData>(MAT_DIALOG_DATA);
  private readonly agentService = inject(AGENT_SERVICE);
  private readonly graphService = inject(GRAPH_SERVICE);
  private readonly sanitizer = inject(SAFE_VALUES_SERVICE);

  public renderedGraph = signal<SafeHtml | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  get appName(): string {
    return this.data.appName;
  }

  ngOnInit(): void {
    this.loadAgentGraph();
  }

  private loadAgentGraph(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.renderedGraph.set(null);

    this.agentService.getAppGraphImage(this.appName).subscribe({
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
}
