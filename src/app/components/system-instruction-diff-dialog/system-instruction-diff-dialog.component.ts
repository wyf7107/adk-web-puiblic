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

import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface SystemInstructionDiffData {
  precedingInstruction: string;
  currentInstruction: string;
}

export interface TokenDiff {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
}

export interface AlignedRow {
  left: {
    type: 'unchanged' | 'removed' | 'empty';
    value: string;
    lineNumber?: number;
    tokens?: TokenDiff[];
  };
  right: {
    type: 'unchanged' | 'added' | 'empty';
    value: string;
    lineNumber?: number;
    tokens?: TokenDiff[];
  };
}

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-system-instruction-diff-dialog',
  templateUrl: './system-instruction-diff-dialog.component.html',
  styleUrls: ['./system-instruction-diff-dialog.component.scss'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class SystemInstructionDiffDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<SystemInstructionDiffDialogComponent>);
  readonly data = inject<SystemInstructionDiffData>(MAT_DIALOG_DATA);

  diffRows: AlignedRow[] = [];

  ngOnInit(): void {
    const left = this.data.precedingInstruction || '';
    const right = this.data.currentInstruction || '';
    
    const rawDiff = this.diffLines(left, right);
    this.diffRows = this.alignDiff(rawDiff);
  }

  private diffLines(left: string, right: string): DiffLine[] {
    const a = left.split('\n');
    const b = right.split('\n');
    const n = a.length;
    const m = b.length;

    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const result: DiffLine[] = [];
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        result.unshift({
          type: 'unchanged',
          value: a[i - 1],
          leftLineNumber: i,
          rightLineNumber: j,
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({
          type: 'added',
          value: b[j - 1],
          rightLineNumber: j,
        });
        j--;
      } else {
        result.unshift({
          type: 'removed',
          value: a[i - 1],
          leftLineNumber: i,
        });
        i--;
      }
    }

    return result;
  }

  private alignDiff(diffLines: DiffLine[]): AlignedRow[] {
    const rows: AlignedRow[] = [];
    
    let i = 0;
    while (i < diffLines.length) {
      const line = diffLines[i];
      
      if (line.type === 'unchanged') {
        rows.push({
          left: { type: 'unchanged', value: line.value, lineNumber: line.leftLineNumber },
          right: { type: 'unchanged', value: line.value, lineNumber: line.rightLineNumber }
        });
        i++;
      } else if (line.type === 'removed') {
        // Look ahead to see if next is an addition so we pair them
        if (i + 1 < diffLines.length && diffLines[i + 1].type === 'added') {
          const nextLine = diffLines[i + 1];
          const charDiff = this.diffChars(line.value, nextLine.value);
          
          rows.push({
            left: { 
              type: 'removed', 
              value: line.value, 
              lineNumber: line.leftLineNumber,
              tokens: charDiff.left
            },
            right: { 
              type: 'added', 
              value: nextLine.value, 
              lineNumber: nextLine.rightLineNumber,
              tokens: charDiff.right
            }
          });
          i += 2;
        } else {
          rows.push({
            left: { type: 'removed', value: line.value, lineNumber: line.leftLineNumber },
            right: { type: 'empty', value: '' }
          });
          i++;
        }
      } else if (line.type === 'added') {
        rows.push({
          left: { type: 'empty', value: '' },
          right: { type: 'added', value: line.value, lineNumber: line.rightLineNumber }
        });
        i++;
      }
    }
    
    return rows;
  }

  private diffChars(left: string, right: string): { left: TokenDiff[], right: TokenDiff[] } {
    const a = left.split('');
    const b = right.split('');
    const n = a.length;
    const m = b.length;

    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    let i = n;
    let j = m;

    const leftTokens: TokenDiff[] = [];
    const rightTokens: TokenDiff[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        const val = a[i - 1];
        leftTokens.unshift({ type: 'unchanged', value: val });
        rightTokens.unshift({ type: 'unchanged', value: val });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        rightTokens.unshift({ type: 'added', value: b[j - 1] });
        j--;
      } else {
        leftTokens.unshift({ type: 'removed', value: a[i - 1] });
        i--;
      }
    }

    return {
      left: this.mergeTokens(leftTokens),
      right: this.mergeTokens(rightTokens)
    };
  }

  private mergeTokens(tokens: TokenDiff[]): TokenDiff[] {
    if (tokens.length === 0) return [];
    const merged: TokenDiff[] = [tokens[0]];
    
    for (let i = 1; i < tokens.length; i++) {
      const current = tokens[i];
      const last = merged[merged.length - 1];
      
      if (current.type === last.type) {
        last.value += current.value;
      } else {
        merged.push(current);
      }
    }
    
    return merged;
  }

  close(): void {
    this.dialogRef.close();
  }
}
