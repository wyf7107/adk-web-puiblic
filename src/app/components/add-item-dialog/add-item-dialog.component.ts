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

import {Component, inject, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {Router} from '@angular/router';
import { AgentNode } from '../../core/models/AgentBuilder';
import { YamlUtils } from '../../../utils/yaml-utils';
import { AgentService } from '../../core/services/agent.service';
import { MatSnackBar } from '@angular/material/snack-bar';


@Component({
  selector: 'app-add-item-dialog',
  templateUrl: './add-item-dialog.component.html',
  styleUrl: './add-item-dialog.component.scss',
  standalone: false,
})
export class AddItemDialogComponent {
  // TODO: Replace the eval dialogs to use this common dialog component
  protected newAppName = '';
  private agentService = inject(AgentService);
  private _snackBar = inject(MatSnackBar);
  private router = inject(Router);

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {existingAppNames: string[]},
    public dialogRef: MatDialogRef<AddItemDialogComponent>,
  ) {}

  createNewApp() {
    if (this.data.existingAppNames.includes(this.newAppName)) {
      this._snackBar.open(
        'App name already exists. Please choose a different name.',
        'OK',
      );
      return;
    }
    const rootAgent: AgentNode = {
      agent_class: 'LlmAgent',
      instruction: 'You are the root agent that coordinates other agents.',
      isRoot: true,
      model: 'gemini-2.5-flash',
      name: this.newAppName,
      sub_agents: [],
      tools: [],
    };

    const formData = new FormData();

    YamlUtils.generateYamlFile(rootAgent, formData, this.newAppName);

    this.agentService.agentBuild(formData).subscribe((success) => {
      if (success) {
        this.router.navigate(['/'], {
            queryParams: { app: this.newAppName, mode: 'builder' }
          }).then(() => {
            window.location.reload();
          });
        this.dialogRef.close(true);
      } else {
        this._snackBar.open('Something went wrong, please try again', 'OK');
      }
    });
  }
}
