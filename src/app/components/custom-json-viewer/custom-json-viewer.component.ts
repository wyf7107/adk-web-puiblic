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

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MarkdownComponent } from '../markdown/markdown.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-markdown-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIcon,
    MatIconButton,
    MarkdownComponent
  ],
  template: `
    <div class="md-dialog-header">
      <h2 mat-dialog-title class="md-title">
        <mat-icon class="title-icon">article</mat-icon>
        Markdown Preview - {{ data.key }}
      </h2>
      <button mat-icon-button class="close-button" (click)="close()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <mat-dialog-content class="md-dialog-content">
      <app-markdown [text]="data.value"></app-markdown>
    </mat-dialog-content>
  `,
  styles: [`
    .md-dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px 8px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .md-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }
    .title-icon {
      color: var(--mat-sys-primary);
    }
    .close-button {
      color: var(--mat-sys-on-surface-variant);
    }
    .md-dialog-content {
      padding: 24px;
      min-width: 500px;
      max-width: 80vw;
      max-height: 70vh;
      overflow-y: auto;
      background-color: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
    }
  `]
})
export class MarkdownPreviewDialogComponent {
  dialogRef = inject(MatDialogRef<MarkdownPreviewDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { key: string; value: string };

  close(): void {
    this.dialogRef.close();
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-custom-json-viewer',
  templateUrl: './custom-json-viewer.component.html',
  styleUrls: ['./custom-json-viewer.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTooltip,
    MatDialogModule,
  ],
})
export class CustomJsonViewerComponent implements OnInit {
  @Input() json: any;
  @Input() key: string | number | undefined;
  @Input() expanded = true;
  @Input() depth = 0;

  private readonly dialog = inject(MatDialog);

  isExpanded = true;

  ngOnInit() {
    this.isExpanded = this.expanded;
  }

  isExpandable(): boolean {
    return this.json !== null && typeof this.json === 'object';
  }

  isObject(val: any): boolean {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  isString(val: any): boolean {
    return typeof val === 'string';
  }

  hasLineBreaks(val: any): boolean {
    return typeof val === 'string' && val.includes('\n');
  }

  isNumber(val: any): boolean {
    return typeof val === 'number';
  }

  isBoolean(val: any): boolean {
    return typeof val === 'boolean';
  }

  isNull(val: any): boolean {
    return val === null;
  }

  isUndefined(val: any): boolean {
    return val === undefined;
  }

  getKeys(val: any): string[] {
    if (!val) return [];
    return Object.keys(val);
  }

  getTypeClass(val: any): string {
    if (this.isString(val)) return 'segment-type-string';
    if (this.isNumber(val)) return 'segment-type-number';
    if (this.isBoolean(val)) return 'segment-type-boolean';
    if (this.isNull(val)) return 'segment-type-null';
    return 'segment-type-undefined';
  }

  toggleExpand(event: Event): void {
    event.stopPropagation();
    this.isExpanded = !this.isExpanded;
  }

  openMarkdownDialog(key: string | number, value: string, event: Event): void {
    event.stopPropagation();
    this.dialog.open(MarkdownPreviewDialogComponent, {
      data: { key: key.toString(), value },
      width: '800px',
      maxWidth: '90vw',
      panelClass: 'custom-md-dialog'
    });
  }
}
