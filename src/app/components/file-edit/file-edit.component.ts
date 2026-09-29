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

import {ChangeDetectionStrategy, Component, computed, input, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';

import {collapseUnchangedLines, diffLines, DiffRow, getFileEdit, getFileEditError} from '../../core/models/FileEdit';
import type {FunctionCall, FunctionResponse} from '../../core/models/types';
import {TerminalOutputComponent} from '../terminal-output/terminal-output.component';

const DIFF_MARKERS = {context: ' ', added: '+', removed: '-'} as const;

/**
 * Renders a file edit tool call as a diff of the replaced text, or a failed
 * file edit response as its error. Successful responses render nothing, since
 * the call already shows the change.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-file-edit',
  templateUrl: './file-edit.component.html',
  styleUrl: './file-edit.component.scss',
  standalone: true,
  imports: [MatIconModule, TerminalOutputComponent],
})
export class FileEditComponent {
  readonly functionCall = input<FunctionCall>();
  readonly functionResponse = input<FunctionResponse>();

  protected readonly markers = DIFF_MARKERS;
  protected readonly edit = computed(() => getFileEdit(this.functionCall()));
  protected readonly lines = computed(() => {
    const edit = this.edit();
    return edit ? diffLines(edit.oldText, edit.newText) : [];
  });
  protected readonly addedCount =
      computed(() => this.lines().filter(line => line.type === 'added').length);
  protected readonly removedCount = computed(
      () => this.lines().filter(line => line.type === 'removed').length);
  protected readonly error =
      computed(() => getFileEditError(this.functionResponse()));

  private readonly rows = computed(() => collapseUnchangedLines(this.lines()));
  private readonly expandedRows = signal<ReadonlySet<number>>(new Set());
  /** Rows to render, with collapsed runs the user opened shown as lines. */
  protected readonly displayRows = computed(() => {
    const expanded = this.expandedRows();
    return this.rows().flatMap(
        (row, index): Array<{row: DiffRow, index: number}> =>
            row.type === 'collapsed' && expanded.has(index) ?
            row.lines.map(line => ({row: line, index})) :
            [{row, index}]);
  });

  protected expandRow(index: number) {
    this.expandedRows.update(rows => new Set([...rows, index]));
  }
}
