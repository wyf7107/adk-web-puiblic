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

import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';

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
  ],
})
export class AgentStructureGraphDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AgentStructureGraphDialogComponent>);
  readonly data = inject<AgentStructureGraphDialogData>(MAT_DIALOG_DATA);

  get appName(): string {
    return this.data.appName;
  }
}
