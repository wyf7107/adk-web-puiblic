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
import { Component, Inject, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Observable, Subscription } from 'rxjs';

export interface ConsoleDialogData {
  title: string;
  output$: Observable<string>;
}

@Component({
  selector: 'app-console-dialog',
  templateUrl: './console-dialog.component.html',
  styleUrls: ['./console-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressBarModule,
  ],
})
export class ConsoleDialogComponent implements OnInit, OnDestroy {
  consoleOutput = signal<string>('');
  isLoading = signal<boolean>(true);
  private subscription?: Subscription;

  @ViewChild('consoleArea') consoleArea!: ElementRef;

  constructor(
    public dialogRef: MatDialogRef<ConsoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConsoleDialogData,
  ) {}

  ngOnInit() {
    this.subscription = this.data.output$.subscribe({
      next: (text) => {
        this.consoleOutput.update(current => current + text);
        this.scrollToBottom();
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.consoleArea) {
        const element = this.consoleArea.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 0);
  }

  close(): void {
    this.dialogRef.close();
  }
}
