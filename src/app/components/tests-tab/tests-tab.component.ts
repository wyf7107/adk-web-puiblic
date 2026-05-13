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
import { Component, inject, input, OnChanges, OnInit, output, signal, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCell, MatCellDef, MatColumnDef, MatHeaderCell, MatHeaderCellDef, MatHeaderRow, MatHeaderRowDef, MatRow, MatRowDef, MatTable, MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TestsService } from '../../core/services/tests.service';
import { SESSION_SERVICE } from '../../core/services/interfaces/session';
import { ConsoleDialogComponent } from '../console-dialog/console-dialog.component';
import { PromptDialogComponent } from '../prompt-dialog/prompt-dialog.component';

@Component({
  selector: 'app-tests-tab',
  templateUrl: './tests-tab.component.html',
  styleUrl: './tests-tab.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatDialogModule,
    PromptDialogComponent,
  ],
})
export class TestsTabComponent implements OnInit, OnChanges {
  appName = input<string>('');
  sessionId = input<string>('');
  userId = input<string>('');
  isViewOnlySession = input<boolean>(false);

  private readonly testsService = inject(TestsService);
  private readonly dialog = inject(MatDialog);
  private readonly sessionService = inject(SESSION_SERVICE);

  dataSource = new MatTableDataSource<string>([]);
  consoleOutput = signal<string>('');
  selectedTest = signal<string | null>(null);
  readonly testSelected = output<{ testName: string; events: any[] }>();
  isRunning = signal<boolean>(false);
  isRebuilding = signal<boolean>(false);

  displayedColumns: string[] = ['name', 'actions'];

  ngOnInit() {
    this.loadTests();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['appName'] && !changes['appName'].isFirstChange()) {
      this.loadTests();
    }
  }

  loadTests() {
    if (!this.appName()) return;
    this.testsService.listTests(this.appName()).subscribe((tests) => {
      this.dataSource.data = tests;
    });
  }

  selectTest(test: string) {
    this.selectedTest.set(test);
    this.testsService.getTest(this.appName(), test).subscribe((testData: any) => {
      this.testSelected.emit({ testName: test, events: testData.events || [] });
    });
  }

  promoteCurrentSessionToTest() {
    if (!this.sessionId()) return;

    this.sessionService.getSession(this.userId(), this.appName(), this.sessionId())
      .subscribe((fullSession) => {
        const displayName = (fullSession.state as any)?.['__session_metadata__']?.displayName || this.sessionId();
        const sanitizedName = displayName.replace(/ /g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        
        const sessionData = { events: fullSession.events };

        this.dialog.open(PromptDialogComponent, {
          data: {
            title: 'Add Current Session as Test',
            label: 'Test Name',
            value: sanitizedName,
            onSubmit: (testName: string) => this.testsService.createTest(this.appName(), testName, sessionData).pipe(
              switchMap(() => this.testsService.rebuildTests(this.appName(), testName))
            )
          }
        }).afterClosed().subscribe((result) => {
          if (result) {
            this.loadTests();
          }
        });
      });
  }

  renameTest(testName: string) {
    this.dialog.open(PromptDialogComponent, {
      data: {
        title: 'Rename Test',
        label: 'New Name',
        value: testName.replace('.json', ''),
        onSubmit: (newName: string) => {
          const sanitizedNewName = newName.replace(/ /g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
          
          return this.testsService.getTest(this.appName(), testName).pipe(
            switchMap((testData) => this.testsService.createTest(this.appName(), sanitizedNewName, testData)),
            switchMap(() => this.testsService.deleteTest(this.appName(), testName))
          );
        }
      }
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.loadTests();
      }
    });
  }

  runAllTests() {
    this.runTest();
  }

  runTest(testName?: string) {
    this.isRunning.set(true);
    const output$ = new Subject<string>();
    
    this.dialog.open(ConsoleDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '80vh',
      data: {
        title: `Running ${testName || 'all tests'}`,
        output$: output$.asObservable()
      }
    });

    this.testsService.runTests(this.appName(), testName).subscribe({
      next: (chunk) => {
        output$.next(chunk);
      },
      error: (err) => {
        output$.next(`\nError: ${err.message || err}`);
        this.isRunning.set(false);
        output$.complete();
      },
      complete: () => {
        this.isRunning.set(false);
        output$.complete();
      },
    });
  }

  deleteTest(testName: string) {
    if (confirm(`Are you sure you want to delete test ${testName}?`)) {
      this.testsService.deleteTest(this.appName(), testName).subscribe(() => {
        this.loadTests();
      });
    }
  }

  rebuildAllTests() {
    this.rebuildTest();
  }

  rebuildTest(testName?: string) {
    this.isRebuilding.set(true);
    const output$ = new Subject<string>();
    
    this.dialog.open(ConsoleDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '80vh',
      data: {
        title: `Rebuilding ${testName || 'all tests'}`,
        output$: output$.asObservable()
      }
    });

    output$.next('Rebuilding tests...\n');

    this.testsService.rebuildTests(this.appName(), testName).subscribe({
      next: () => {
        output$.next('Successfully rebuilt tests.\n');
        this.isRebuilding.set(false);
        this.loadTests();
        output$.complete();
      },
      error: (err) => {
        output$.next(`Error rebuilding tests: ${err.message || err}\n`);
        this.isRebuilding.set(false);
        output$.complete();
      },
    });
  }

  clearConsole() {
    this.consoleOutput.set('');
  }
}
