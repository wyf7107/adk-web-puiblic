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

import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {from, interval, of, Subscription} from 'rxjs';
import {catchError, map, mergeMap} from 'rxjs/operators';

import {CloudSessionsResponse, CloudSessionSummary} from '../../core/models/Cloud';
import {Deployment} from '../../core/models/Deploy';
import {Session} from '../../core/models/Session';
import {Event} from '../../core/models/types';
import {CLOUD_SERVICE} from '../../core/services/interfaces/cloud';
import {DEPLOY_SERVICE} from '../../core/services/interfaces/deploy';
import {CloudConnectDialogComponent} from '../cloud-connect-dialog/cloud-connect-dialog.component';
import {deploymentName, DeploymentPickerComponent} from '../deployment-picker/deployment-picker.component';
import {relativeTime} from '../deployments/deployments.component';

/** How often "Updated 12s ago" and relative times are recomputed. */
const CLOCK_TICK_MS = 5_000;
/** Longest tool argument or result shown inline in the preview. */
const PREVIEW_VALUE_CHARS = 140;
/** Sessions shown in the table before "Show more". */
const PAGE_SIZE = 25;
/** Sessions fetched at once to fill in the table's previews. */
const PREVIEW_CONCURRENCY = 4;

/** An error event's text, split into its status line and readable message. */
export interface ParsedError {
  /** E.g. "404 NOT_FOUND"; empty when the text has no status line. */
  code: string;
  message: string;
}

/** One line of the conversation preview. */
export interface TranscriptItem {
  kind: 'user'|'agent'|'tool-call'|'tool-result'|'error';
  author: string;
  text: string;
  /** Seconds since the epoch. */
  timestamp?: number;
  /** Set for errors. */
  error?: ParsedError;
}

/** How a session's last turn ended. */
export type SessionOutcome = 'replied'|'error'|'no-reply'|'empty';

/** What the sessions table shows about a session, from its events. */
export interface SessionOverview {
  /** The first user message, on one line; empty when there is none. */
  title: string;
  eventCount: number;
  outcome: SessionOutcome;
  /** Seconds since the epoch. */
  startTime?: number;
  /** The first error's message, for the outcome's tooltip. */
  errorMessage?: string;
}

/** A row of the sessions table; `overview` is null until its preview loads. */
export interface SessionRow {
  key: string;
  summary: CloudSessionSummary;
  overview: SessionOverview|null;
  previewFailed: boolean;
}

const OUTCOME_LABELS: Record<SessionOutcome, string> = {
  'replied': 'Replied',
  'error': 'Error',
  'no-reply': 'No reply',
  'empty': 'Empty',
};

/**
 * Splits model and API errors such as
 * `404 NOT_FOUND. {'error': {'message': '...'}}` into the status line and the
 * message inside. Other text is returned as the message.
 */
export function parseError(text: string): ParsedError {
  const head = /^\s*(\d{3}\s+[A-Z_]+)\.?\s*/.exec(text);
  const body = head ? text.slice(head[0].length) : text;
  const quoted = /['"]message['"]\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/s.exec(body);
  const message = (quoted ? quoted[2] : body).trim();
  return {code: head?.[1] ?? '', message: message || text.trim()};
}

/** Summarizes a session's events for the sessions table. */
export function overview(session: Session): SessionOverview {
  const events = session.events ?? [];
  const items = transcript(events);
  const last = items[items.length - 1];
  const firstError = items.find((item) => item.kind === 'error');
  let outcome: SessionOutcome = 'empty';
  if (last) {
    outcome = last.kind === 'error' ? 'error' :
        last.kind === 'agent'       ? 'replied' :
                                      'no-reply';
  }
  return {
    title: items.find((item) => item.kind === 'user')
               ?.text.replace(/\s+/g, ' ')
               .trim() ??
        '',
    eventCount: events.length,
    outcome,
    startTime: events[0]?.timestamp,
    errorMessage: firstError?.error?.message,
  };
}

function sessionKey(summary: CloudSessionSummary): string {
  return `${summary.userId}/${summary.id}`;
}

/** A session to replay in the Playground's read-only view. */
export interface OpenSessionRequest {
  session: Session;
  /** Shown in the read-only chip, e.g. "hello_world_ma · ae-smoke". */
  label: string;
}

/**
 * Whether sessions can be read from a deployment: Agent Runtime from its
 * session store, Cloud Run through the service's own API, which needs its URL.
 */
export function isSessionSource(deployment: Deployment): boolean {
  return deployment.target === 'agent_engine' ||
      (deployment.target === 'cloud_run' && !!deployment.serviceUrl);
}

function truncate(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? {});
  return text.length > PREVIEW_VALUE_CHARS ?
      `${text.slice(0, PREVIEW_VALUE_CHARS - 1)}…` :
      text;
}

/** Turns stored events into a compact, readable transcript. */
export function transcript(events: Event[]): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  for (const event of events) {
    const author = event.author || 'agent';
    const timestamp = event.timestamp;
    const isUser = author === 'user' || event.content?.role === 'user';
    for (const part of event.content?.parts ?? []) {
      if (part.text && !part.thought) {
        items.push({
          kind: isUser ? 'user' : 'agent',
          author,
          text: part.text,
          timestamp,
        });
      } else if (part.functionCall) {
        items.push({
          kind: 'tool-call',
          author,
          text: `${part.functionCall.name}(${truncate(part.functionCall.args)})`,
          timestamp,
        });
      } else if (part.functionResponse) {
        items.push({
          kind: 'tool-result',
          author,
          text: `${part.functionResponse.name} → ${
              truncate(part.functionResponse.response)}`,
          timestamp,
        });
      }
    }
    if (event.errorMessage || event.errorCode) {
      const text = event.errorMessage || event.errorCode || 'Error';
      items.push({kind: 'error', author, text, timestamp, error: parseError(text)});
    }
  }
  return items;
}

/**
 * The Operate > Sessions page: conversations a deployed agent has stored,
 * read from Agent Runtime, with a preview and a way to replay one in the
 * Playground.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-cloud-sessions',
  templateUrl: './cloud-sessions.component.html',
  styleUrl: './cloud-sessions.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    DeploymentPickerComponent,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
})
export class CloudSessionsComponent {
  private readonly cloudService = inject(CLOUD_SERVICE);
  private readonly deployService = inject(DEPLOY_SERVICE);
  private readonly dialog = inject(MatDialog);

  readonly appName = input<string>('');
  /** "Back to Playground" was clicked. */
  readonly backToPlayground = output<void>();
  /** Go to the Deployments page, e.g. to deploy to Agent Runtime. */
  readonly goToDeployments = output<void>();
  /** Replay a session in the Playground, read-only. */
  readonly openSession = output<OpenSessionRequest>();

  readonly status = this.cloudService.status;
  readonly connected = computed(() => !!this.status()?.connected);
  readonly statusFailed = signal(false);
  readonly checking = computed(() => !this.status() && !this.statusFailed());

  /** Deployments in the project whose sessions can be read. */
  readonly sources = signal<Deployment[]|null>(null);
  readonly sourcesError = signal('');
  readonly selectedSourceId = signal<string|null>(null);

  readonly sessions = signal<CloudSessionsResponse|null>(null);
  readonly loadingSessions = signal(false);
  readonly sessionsError = signal('');
  readonly lastUpdated = signal<number|null>(null);
  userFilter = '';
  /** The filter the current list was fetched with. */
  readonly appliedFilter = signal('');

  /** The row being fetched to open in the Playground. */
  readonly openingKey = signal<string|null>(null);
  readonly openError = signal('');

  /**
   * Fetched sessions by user/id, for the table's previews and for opening
   * in the Playground; null when one could not be fetched.
   */
  readonly previews = signal<ReadonlyMap<string, Session|null>>(new Map());
  readonly pageSize = signal(PAGE_SIZE);

  private readonly now = signal(Date.now());

  readonly selectedSource = computed(
      () => (this.sources() ?? [])
                .find((d) => d.id === this.selectedSourceId()) ??
          null);
  /** The selected source lists one user's sessions at a time (Cloud Run). */
  readonly needsUser =
      computed(() => this.selectedSource()?.target === 'cloud_run');
  readonly visibleSessions = computed(
      () => this.sessions()?.sessions.slice(0, this.pageSize()) ?? []);
  readonly hiddenCount = computed(
      () => (this.sessions()?.sessions.length ?? 0) -
          this.visibleSessions().length);
  readonly rows = computed<SessionRow[]>(() => {
    const previews = this.previews();
    return this.visibleSessions().map((summary) => {
      const key = sessionKey(summary);
      const session = previews.get(key);
      return {
        key,
        summary,
        overview: session ? overview(session) : null,
        previewFailed: session === null,
      };
    });
  });
  readonly updatedText = computed(() => {
    if (this.loadingSessions() && this.sessions()) {
      return 'Refreshing…';
    }
    const at = this.lastUpdated();
    if (!at) {
      return '';
    }
    const seconds = Math.max(0, Math.round((this.now() - at) / 1000));
    return seconds < 60 ?
        `Updated ${seconds}s ago` :
        `Updated ${relativeTime(new Date(at).toISOString(), this.now())}`;
  });

  private readonly subscriptions = new Subscription();
  private sessionsRequest?: Subscription;
  private openRequest?: Subscription;
  private previewRequests = new Subscription();
  private readonly previewsInFlight = new Set<string>();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.subscriptions.unsubscribe();
      this.sessionsRequest?.unsubscribe();
      this.openRequest?.unsubscribe();
      this.previewRequests.unsubscribe();
    });
    this.subscriptions.add(
        interval(CLOCK_TICK_MS).subscribe(() => this.now.set(Date.now())));
    if (!this.status()) {
      this.subscriptions.add(this.cloudService.refreshStatus().subscribe({
        error: () => this.statusFailed.set(true),
      }));
    }
    // Starts over for another app or connection, but not when a status
    // refresh returns the same one.
    const scope = computed(() => {
      const status = this.status();
      return status?.connected && this.appName() ?
          `${this.appName()}|${status.project}|${status.region}` :
          '';
    });
    effect(() => {
      const current = scope();
      untracked(() => {
        this.sources.set(null);
        this.sourcesError.set('');
        this.selectedSourceId.set(null);
        this.clearSessions();
        if (current) {
          this.loadSources();
        }
      });
    });
  }

  relativeTime(seconds: number|null|undefined): string {
    return seconds ?
        relativeTime(new Date(seconds * 1000).toISOString(), this.now()) :
        '';
  }

  fullTime(seconds: number|null|undefined): string {
    return seconds ? new Date(seconds * 1000).toLocaleString() : '';
  }

  initial(userId: string): string {
    return (userId || '?').charAt(0).toUpperCase();
  }

  /** Shown next to Cloud Run options in the deployment menu. */
  readonly sourceNote = (deployment: Deployment) =>
      deployment.target === 'cloud_run' ? 'one user at a time' : '';

  outcomeLabel(outcome: SessionOutcome): string {
    return OUTCOME_LABELS[outcome];
  }

  connect(): void {
    this.dialog.open(CloudConnectDialogComponent, {maxWidth: '90vw'});
  }

  selectSource(deployment: Deployment): void {
    if (deployment.id === this.selectedSourceId()) {
      return;
    }
    this.selectedSourceId.set(deployment.id);
    this.clearSessions();
    this.loadSessions();
  }

  applyFilter(): void {
    this.loadSessions();
  }

  clearFilter(): void {
    this.userFilter = '';
    this.applyFilter();
  }

  /** Narrows the list to one user, e.g. from a row's user cell. */
  filterByUser(userId: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.userFilter = userId;
    this.applyFilter();
  }

  showMore(): void {
    this.pageSize.update((size) => size + PAGE_SIZE);
    this.loadPreviews();
  }

  refresh(): void {
    if (this.selectedSourceId()) {
      this.loadSessions();
    } else {
      this.loadSources();
    }
  }

  /** Replays a session in the Playground, fetching it first if needed. */
  openRow(row: SessionRow): void {
    // Ignore a click on a row from a list that was just replaced.
    if (!this.sessions()?.sessions.includes(row.summary)) {
      return;
    }
    const cached = this.previews().get(row.key);
    if (cached) {
      this.emitOpen(row.summary, cached);
      return;
    }
    const sourceId = this.selectedSourceId();
    if (!sourceId || this.openingKey() === row.key) {
      return;
    }
    this.openRequest?.unsubscribe();
    this.openingKey.set(row.key);
    this.openError.set('');
    this.openRequest =
        this.cloudService
            .getSession(
                this.appName(), sourceId, row.summary.id, row.summary.userId)
            .subscribe({
              next: (session) => {
                this.openingKey.set(null);
                this.storePreview(row.key, session);
                this.emitOpen(row.summary, session);
              },
              error: (err) => {
                this.openingKey.set(null);
                this.openError.set(
                    err?.error?.detail ?? err?.message ??
                    'Could not load the session.');
              },
            });
  }

  private emitOpen(summary: CloudSessionSummary, session: Session): void {
    this.openError.set('');
    this.openSession.emit({
      session,
      label: `${deploymentName(this.selectedSource()!)} · ${summary.userId}`,
    });
  }

  private clearSessions(): void {
    this.sessionsRequest?.unsubscribe();
    this.sessions.set(null);
    this.sessionsError.set('');
    this.loadingSessions.set(false);
    this.lastUpdated.set(null);
    this.openRequest?.unsubscribe();
    this.openingKey.set(null);
    this.openError.set('');
    this.clearPreviews();
  }

  private clearPreviews(): void {
    this.previewRequests.unsubscribe();
    this.previewRequests = new Subscription();
    this.previewsInFlight.clear();
    this.previews.set(new Map());
    this.pageSize.set(PAGE_SIZE);
  }

  private storePreview(key: string, session: Session|null): void {
    const next = new Map(this.previews());
    next.set(key, session);
    this.previews.set(next);
  }

  /** Fetches the visible sessions that have no preview yet, a few at a time. */
  private loadPreviews(): void {
    const appName = this.appName();
    const sourceId = this.selectedSourceId();
    if (!appName || !sourceId) {
      return;
    }
    const pending = this.visibleSessions().filter((summary) => {
      const key = sessionKey(summary);
      return !this.previews().has(key) && !this.previewsInFlight.has(key);
    });
    pending.forEach((summary) => this.previewsInFlight.add(sessionKey(summary)));
    this.previewRequests.add(
        from(pending)
            .pipe(mergeMap(
                (summary) =>
                    this.cloudService
                        .getSession(appName, sourceId, summary.id, summary.userId)
                        .pipe(
                            map((session): Session|null => session),
                            catchError(() => of(null)),
                            map((session) => ({summary, session}))),
                PREVIEW_CONCURRENCY))
            .subscribe(({summary, session}) => {
              const key = sessionKey(summary);
              this.previewsInFlight.delete(key);
              this.storePreview(key, session);
            }));
  }

  private loadSources(): void {
    const appName = this.appName();
    this.subscriptions.add(this.deployService.listDeployments(appName).subscribe({
      next: (response) => {
        if (appName !== this.appName()) {
          return;
        }
        const sources = response.deployments.filter(isSessionSource);
        this.sources.set(sources);
        // Open on this agent's own deployment, preferring Agent Runtime: it
        // lists every user's sessions without asking for a user ID.
        const mine = sources.filter((d) => d.matchesApp);
        const first =
            mine.find((d) => d.target === 'agent_engine') ?? mine[0];
        if (first) {
          this.selectSource(first);
        }
      },
      error: (err) => {
        if (appName !== this.appName()) {
          return;
        }
        this.sources.set([]);
        this.sourcesError.set(
            err?.error?.detail ?? err?.message ??
            'Could not look up deployments.');
      },
    }));
  }

  private loadSessions(): void {
    const appName = this.appName();
    const runtimeId = this.selectedSourceId();
    if (!appName || !runtimeId) {
      return;
    }
    const filter = this.userFilter.trim();
    this.sessionsRequest?.unsubscribe();
    if (this.needsUser() && !filter) {
      // Cloud Run's API lists one user's sessions at a time; wait for one.
      this.sessions.set(null);
      this.appliedFilter.set('');
      this.loadingSessions.set(false);
      this.sessionsError.set('');
      return;
    }
    this.loadingSessions.set(true);
    this.sessionsError.set('');
    this.sessionsRequest =
        this.cloudService.listSessions(appName, runtimeId, filter).subscribe({
          next: (response) => {
            // Sessions may have new events since their previews were fetched.
            this.clearPreviews();
            this.sessions.set(response);
            this.appliedFilter.set(filter);
            this.loadingSessions.set(false);
            this.lastUpdated.set(Date.now());
            this.now.set(Date.now());
            this.loadPreviews();
          },
          error: (err) => {
            this.loadingSessions.set(false);
            this.sessionsError.set(
                err?.error?.detail ?? err?.message ??
                'Could not list sessions.');
          },
        });
  }
}
