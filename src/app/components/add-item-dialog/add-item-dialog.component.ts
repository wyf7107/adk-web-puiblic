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

import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import { AgentNode } from '../../core/models/AgentBuilder';


@Component({
  selector: 'app-add-item-dialog',
  templateUrl: './add-item-dialog.component.html',
  styleUrl: './add-item-dialog.component.scss',
  standalone: false,
})
export class AddItemDialogComponent {
  // TODO: Replace the eval dialogs to use this common dialog component
  // newCaseId: string = 'case' + uuidv4().slice(0, 6);
  protected newAppName = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {appName: string},
    public dialogRef: MatDialogRef<AddItemDialogComponent>,
  ) {}

  createNewApp() {
    const rootAgent: AgentNode = {
      agentClass: 'LlmAgent',
      instruction: 'You are the root agent that coordinates other agents.',
      isRoot: true,
      model: 'gemini-2.5-flash',
      name: 'RootAgent',
      sub_agents: [],
      tools: [],
    }

    const formData = new FormData();

    this.generateYamlFile(rootAgent, formData, rootAgent.name);

    this.agentService.agentBuild(formData).subscribe((success) => {
      if (success) {
        this.router.navigate(['/'], {
          queryParams: { app: rootAgent.name }
        }).then(() => {
          window.location.reload();
        });
      } else {
        this._snackBar.open("Something went wrong, please try again", "OK");
      }
    })
  }
}
