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

import {AfterViewInit, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, output, signal, viewChild} from '@angular/core';
import {replaceFragment, trustedResourceUrl} from 'safevalues';
import {setIframeSrc} from 'safevalues/dom';

/** The app, user and session the Luminous playground shows. */
export interface LuminousSession {
  app: string;
  userId: string;
  session: string;
}

/** What the host tells the frame: the session to show and the theme. */
export interface LuminousContext extends LuminousSession {
  theme: 'dark'|'light';
}

/**
 * The Luminous build, served next to the dev UI (`public/luminous/`). Relative,
 * so it resolves under whatever path the dev UI is served from.
 */
const LUMINOUS_ENTRY = trustedResourceUrl`luminous/index.html`;

/** The playground route inside the Luminous app (a hash route). */
const PLAYGROUND_ROUTE = '/ge-web/dev-tools/adk/playground';

/** The frame's initial hash route: the playground for `context`, embedded. */
export function luminousFragment(context: LuminousContext): string {
  const params = new URLSearchParams();
  if (context.app) params.set('app', context.app);
  params.set('userId', context.userId || 'user');
  if (context.session) params.set('session', context.session);
  params.set('embed', '1');
  params.set('theme', context.theme);
  return `${PLAYGROUND_ROUTE}?${params.toString()}`;
}

/**
 * The Luminous playground (the command center's new design), shown in place
 * of the classic one when the Playground's design switch is on Luminous.
 *
 * It is the ACC prototype's playground in embed mode, in a same-origin frame:
 * it calls the same backend through the same origin, and talks to this host
 * over `postMessage`:
 *
 *   - frame -> host `acc:ready` once it can take a context;
 *   - host -> frame `acc:context {app, userId, session, theme}` then, and
 *     whenever any of them changes here (the toolbar's pickers, the theme);
 *   - frame -> host `acc:session-changed {app, userId, session}` when the
 *     frame moves to another session itself (a first message creates one, or
 *     the user starts over), so the classic playground follows.
 *
 * The frame loads only once the host knows its app, so it starts on the
 * host's app and session rather than resolving its own and reporting it back.
 * Messages from any other origin or window are ignored.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-luminous-playground',
  template: `<iframe #frame class="luminous-frame" title="Luminous playground"
    allow="clipboard-read; clipboard-write; microphone"></iframe>`,
  styleUrl: './luminous-playground.component.scss',
  standalone: true,
})
export class LuminousPlaygroundComponent implements AfterViewInit {
  readonly appName = input('');
  readonly userId = input('user');
  readonly sessionId = input('');
  readonly theme = input<'dark'|'light'>('dark');

  /** The frame moved to another session on its own. */
  readonly sessionChange = output<LuminousSession>();

  private readonly frame =
      viewChild.required<ElementRef<HTMLIFrameElement>>('frame');

  private readonly context = computed<LuminousContext>(() => ({
                                                         app: this.appName(),
                                                         userId: this.userId() || 'user',
                                                         session: this.sessionId(),
                                                         theme: this.theme(),
                                                       }));

  /** The frame element exists (after the first render). */
  private readonly viewReady = signal(false);
  /** The frame has been pointed at the playground. */
  private loaded = false;
  /** The frame said `acc:ready`; before that, posts would be lost. */
  private ready = false;
  /** The last context sent, so an unchanged one isn't sent again. */
  private lastPosted = '';

  constructor() {
    effect(() => {
      const context = this.context();
      if (!this.viewReady()) {
        return;
      }
      if (!this.loaded) {
        // Wait for the host's app: a frame started without one resolves an
        // app itself and reports a session back before it hears from us.
        if (context.app) {
          this.loaded = true;
          this.lastPosted = JSON.stringify(context);
          setIframeSrc(
              this.frame().nativeElement,
              replaceFragment(LUMINOUS_ENTRY, luminousFragment(context)));
        }
        return;
      }
      if (this.ready) {
        this.post(context);
      }
    });

    const onMessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };
    window.addEventListener('message', onMessage);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('message', onMessage);
    });
  }

  ngAfterViewInit() {
    this.viewReady.set(true);
  }

  /** Handles a message from the frame. Public for tests. */
  handleMessage(event: MessageEvent) {
    const frameWindow = this.frame().nativeElement.contentWindow;
    if (event.origin !== window.location.origin || !frameWindow ||
        event.source !== frameWindow) {
      return;
    }
    const data = event.data;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
      return;
    }
    if (data.type === 'acc:ready') {
      this.ready = true;
      this.post(this.context(), /* force= */ true);
    } else if (data.type === 'acc:session-changed') {
      if (typeof data.app !== 'string' || typeof data.session !== 'string') {
        return;
      }
      this.sessionChange.emit({
        app: data.app,
        userId: typeof data.userId === 'string' ? data.userId : this.userId(),
        session: data.session,
      });
    }
  }

  private post(context: LuminousContext, force = false) {
    const key = JSON.stringify(context);
    if (!force && key === this.lastPosted) {
      return;
    }
    this.lastPosted = key;
    this.frame().nativeElement.contentWindow?.postMessage(
        {type: 'acc:context', ...context}, window.location.origin);
  }
}
