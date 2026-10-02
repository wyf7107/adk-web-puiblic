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

import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {Subject, Subscription} from 'rxjs';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';

import {CloudProvider, ProjectSummary} from '../../core/models/Cloud';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {SAFE_VALUES_SERVICE} from '../../core/services/interfaces/safevalues';

interface ProviderOption {
  id: CloudProvider|'aws'|'azure';
  label: string;
  icon: string;
  available: boolean;
}

const PROVIDERS: readonly ProviderOption[] = [
  {id: 'gcp', label: 'Google Cloud', icon: 'cloud', available: true},
  {id: 'aws', label: 'AWS', icon: 'cloud_off', available: false},
  {id: 'azure', label: 'Azure', icon: 'cloud_off', available: false},
];

/** Regions offered for the default; any other can be typed in. */
export const COMMON_REGIONS: readonly string[] = [
  'us-central1',
  'us-east1',
  'us-east4',
  'us-west1',
  'europe-west1',
  'europe-west4',
  'asia-northeast1',
  'asia-southeast1',
  'australia-southeast1',
];

const DEFAULT_REGION = 'us-central1';
const PROJECT_SEARCH_DEBOUNCE_MS = 300;

/** Where the sign-in step is. */
type SignInPhase = 'idle'|'starting'|'awaiting-code'|'verifying'|'error';

/** A project ID split around the searched text, for highlighting it. */
export interface HighlightedId {
  before: string;
  match: string;
  after: string;
}

/** Splits `id` around the first case-insensitive occurrence of `query`. */
export function highlight(id: string, query: string): HighlightedId {
  const term = query.trim().toLowerCase();
  const at = term ? id.toLowerCase().indexOf(term) : -1;
  if (at < 0) {
    return {before: id, match: '', after: ''};
  }
  return {
    before: id.slice(0, at),
    match: id.slice(at, at + term.length),
    after: id.slice(at + term.length),
  };
}

/**
 * Connects the dev UI to a cloud project: sign in, then pick a project and a
 * default region. Closes with `true` once connected.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-cloud-connect-dialog',
  templateUrl: './cloud-connect-dialog.component.html',
  styleUrl: './cloud-connect-dialog.component.scss',
  standalone: true,
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
})
export class CloudConnectDialogComponent {
  private readonly cloudService = inject(CLOUD_SERVICE);
  private readonly safeValuesService = inject(SAFE_VALUES_SERVICE);
  private readonly dialogRef = inject(MatDialogRef<CloudConnectDialogComponent>);
  private readonly subscriptions = new Subscription();

  readonly providers = PROVIDERS;
  readonly regions = COMMON_REGIONS;
  readonly status = this.cloudService.status;

  readonly loadingStatus = signal(true);
  readonly error = signal('');

  readonly signInPhase = signal<SignInPhase>('idle');
  /** Why the last code was rejected, shown under the code field. */
  readonly signInError = signal('');
  private loginId = '';
  private authUrl = '';
  code = '';

  /** Opened on an existing connection, to change or remove it. */
  readonly editing = signal(false);
  /** Dismissed the advice to sign in with a personal account. */
  readonly keepServiceAccount = signal(false);

  readonly projects = signal<ProjectSummary[]>([]);
  readonly loadingProjects = signal(false);
  readonly projectsError = signal('');
  readonly projectQuery = signal('');
  region = DEFAULT_REGION;
  readonly saving = signal(false);

  readonly signedIn = computed(() => !!this.status()?.credentialsFound);
  /** Signed in as this machine's identity rather than a person. */
  readonly usingServiceAccount = computed(
      () => this.status()?.credentialType === 'service_account');
  /** Showing the code entry (waiting, verifying, or rejected). */
  readonly enteringCode = computed(
      () => ['awaiting-code', 'verifying', 'error'].includes(
          this.signInPhase()));
  /** Step 1 is complete and not being redone. */
  readonly signInDone = computed(() => this.signedIn() && !this.enteringCode());
  readonly accountInitial = computed(
      () => (this.status()?.account ?? '?').charAt(0).toUpperCase());

  /** Search terms typed into the project field, searched after a pause. */
  private readonly projectSearches = new Subject<string>();
  private projectSearch?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.cancelPendingLogin();
      this.subscriptions.unsubscribe();
    });
    this.subscriptions.add(
        this.projectSearches
            .pipe(
                debounceTime(PROJECT_SEARCH_DEBOUNCE_MS),
                distinctUntilChanged())
            .subscribe((query) => this.loadProjects(query)));
    this.subscriptions.add(this.cloudService.refreshStatus().subscribe({
      next: (status) => {
        this.loadingStatus.set(false);
        this.editing.set(status.connected);
        // Only prefill a project the user chose. The one ADC suggests is
        // often a machine's own (e.g. a cloudtop's), not one to deploy to.
        this.projectQuery.set(status.connected ? (status.project ?? '') : '');
        this.region = status.region || DEFAULT_REGION;
        if (status.credentialsFound) {
          this.loadProjects();
        }
      },
      error: (err) => {
        this.loadingStatus.set(false);
        this.error.set(describeError(
            err,
            'Cloud connections are only available on a local `adk web` ' +
                'server.'));
      },
    }));
  }

  get canConnect(): boolean {
    return this.signInDone() && !!this.projectQuery().trim() &&
        !!this.region.trim() && !this.saving();
  }

  signIn(): void {
    this.error.set('');
    this.signInError.set('');
    this.signInPhase.set('starting');
    this.subscriptions.add(this.cloudService.startLogin().subscribe({
      next: (login) => {
        this.loginId = login.loginId;
        this.authUrl = login.authUrl;
        this.code = '';
        this.signInPhase.set('awaiting-code');
        this.openSignInPage();
      },
      error: (err) => {
        this.signInPhase.set('idle');
        this.error.set(describeError(err, 'Could not start signing in.'));
      },
    }));
  }

  openSignInPage(): void {
    if (this.authUrl) {
      this.safeValuesService.windowOpen(
          window, this.authUrl, '_blank', 'noopener');
    }
  }

  submitCode(): void {
    const code = this.code.trim();
    if (!code || this.signInPhase() !== 'awaiting-code') {
      return;
    }
    this.error.set('');
    this.signInPhase.set('verifying');
    this.subscriptions.add(
        this.cloudService.completeLogin(this.loginId, code).subscribe({
          next: () => {
            this.loginId = '';
            this.signInPhase.set('idle');
            this.loadProjects();
          },
          error: (err) => {
            // The server ends the attempt on failure, so "Try again" starts
            // a fresh one.
            this.loginId = '';
            this.signInPhase.set('error');
            this.signInError.set(describeError(err, 'Sign-in failed.'));
          },
        }));
  }

  cancelSignIn(): void {
    this.cancelPendingLogin();
    this.signInError.set('');
    this.signInPhase.set('idle');
  }

  /** The code entry's primary action: submit, or start over after a failure. */
  continueSignIn(): void {
    if (this.signInPhase() === 'error') {
      this.signIn();
    } else {
      this.submitCode();
    }
  }

  clearProject(): void {
    this.onProjectInput('');
  }

  highlight(id: string): HighlightedId {
    return highlight(id, this.projectQuery());
  }

  connect(): void {
    if (!this.canConnect) {
      return;
    }
    this.error.set('');
    this.saving.set(true);
    this.subscriptions.add(this.cloudService
                               .connect({
                                 provider: 'gcp',
                                 project: this.projectQuery().trim(),
                                 region: this.region.trim(),
                               })
                               .subscribe({
                                 next: (status) => {
                                   this.saving.set(false);
                                   if (status.connected) {
                                     this.dialogRef.close(true);
                                   } else {
                                     this.error.set(
                                         status.message ?? 'Not connected.');
                                   }
                                 },
                                 error: (err) => {
                                   this.saving.set(false);
                                   this.error.set(describeError(
                                       err, 'Could not save the connection.'));
                                 },
                               }));
  }

  disconnect(): void {
    this.subscriptions.add(this.cloudService.disconnect().subscribe({
      next: () => this.dialogRef.close(false),
      error: (err) =>
          this.error.set(describeError(err, 'Could not disconnect.')),
    }));
  }

  close(): void {
    this.dialogRef.close(!!this.status()?.connected);
  }

  /** Searches projects as the user types. */
  onProjectInput(query: string): void {
    this.projectQuery.set(query);
    if (this.signedIn()) {
      this.projectSearches.next(query.trim());
    }
  }

  /** Searches now, superseding any search still in flight. */
  private loadProjects(query = this.projectQuery().trim()): void {
    this.projectSearch?.unsubscribe();
    this.loadingProjects.set(true);
    this.projectsError.set('');
    this.projectSearch = this.cloudService.listProjects(query).subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loadingProjects.set(false);
      },
      error: (err) => {
        this.loadingProjects.set(false);
        // Not fatal: a project ID can still be typed in.
        this.projectsError.set(describeError(
            err, 'Could not search projects; type a project ID instead.'));
      },
    });
    this.subscriptions.add(this.projectSearch);
  }

  private cancelPendingLogin(): void {
    if (this.loginId) {
      this.cloudService.cancelLogin(this.loginId).subscribe({error: () => {}});
      this.loginId = '';
    }
  }
}

function describeError(err: any, fallback: string): string {
  if (err?.status === 404 && !err?.error?.detail) {
    return fallback;
  }
  const detail = err?.error?.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail) && detail[0]?.msg) {
    return String(detail[0].msg).replace(/^Value error, /, '');
  }
  return err?.message ?? fallback;
}
