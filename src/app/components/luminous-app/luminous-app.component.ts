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

/** What the host tells the frame: the theme, and the agent picked here. */
export interface LuminousAppContext {
  theme: 'dark'|'light';
  /** The agent picked in the classic design, to start on. May be empty. */
  app: string;
}

/**
 * The Luminous app's build, served next to the dev UI
 * (`public/luminous-app/`). Relative, so it resolves under whatever path the
 * dev UI is served from.
 */
const LUMINOUS_APP_ENTRY = trustedResourceUrl`luminous-app/index.html`;

/** The route the frame opens on (a hash route): Builder's Playground. */
const LANDING_ROUTE = '/ge-web/dev-tools/adk/playground';

/** The agent the page's URL names (`?app=`), or ''. */
export function appFromUrl(search: string): string {
  return new URLSearchParams(search).get('app') ?? '';
}

/** A point in the page, in CSS pixels. */
export interface PagePoint {
  x: number;
  y: number;
}

/**
 * The frame's initial hash route, in hosted mode, for `context`. With
 * `hostControls`, the frame's top bar also carries the host's controls (the
 * theme toggle and the user menu), since the host hides its own top bar
 * while the Luminous design is shown.
 */
export function luminousAppFragment(context: LuminousAppContext): string {
  const params = new URLSearchParams();
  params.set('embed', 'app');
  params.set('hostControls', '1');
  params.set('theme', context.theme);
  if (context.app) params.set('app', context.app);
  return `${LANDING_ROUTE}?${params.toString()}`;
}

/**
 * The Luminous design: the command center's new app, whole (its own nav,
 * its Builder and Manager modes, all its pages), filling everything under
 * the top bar when the top bar's design switch is on Luminous.
 *
 * It runs in hosted mode in a same-origin frame, calling the same backend
 * through the same origin, and talks to this host over `postMessage`:
 *
 *   - frame -> host `acc:ready` once it can take a context;
 *   - host -> frame `acc:context {theme, app, hostControls}` then, and
 *     whenever the theme changes here;
 *   - frame -> host, from the host controls in the frame's top bar:
 *     `acc:set-theme {theme}` (the host applies it and echoes the context),
 *     and `acc:open-user-menu {x, y}` (open the host's user menu at that
 *     point of the frame).
 *
 * Messages from any other origin or window are ignored.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-luminous-app',
  template: `<iframe #frame class="luminous-app-frame" title="Agent Command Center"
    allow="clipboard-read; clipboard-write; microphone"></iframe>`,
  styleUrl: './luminous-app.component.scss',
  standalone: true,
})
export class LuminousAppComponent implements AfterViewInit {
  readonly theme = input<'dark'|'light'>('dark');
  readonly appName = input('');

  /** The frame's theme toggle asked for this theme. */
  readonly themeRequested = output<'dark'|'light'>();
  /** The frame's avatar was clicked: open the user menu at this point. */
  readonly userMenuRequested = output<PagePoint>();

  private readonly frame =
      viewChild.required<ElementRef<HTMLIFrameElement>>('frame');

  private readonly context = computed<LuminousAppContext>(
      () => ({theme: this.theme(), app: this.appName()}));

  /** The frame element exists (after the first render). */
  private readonly viewReady = signal(false);
  /** The frame has been pointed at the app. */
  private loaded = false;
  /** The frame said `acc:ready`; before that, posts would be lost. */
  private ready = false;
  /** The last theme sent, so an unchanged one isn't sent again. */
  private lastTheme = '';

  constructor() {
    effect(() => {
      const context = this.context();
      if (!this.viewReady()) {
        return;
      }
      if (!this.loaded) {
        this.loaded = true;
        this.lastTheme = context.theme;
        // The host may not have resolved its agent yet; the page's own
        // `?app=` names it, so the frame's first paint is already that agent.
        const start = {...context, app: context.app || appFromUrl(window.location.search)};
        setIframeSrc(
            this.frame().nativeElement,
            replaceFragment(LUMINOUS_APP_ENTRY, luminousAppFragment(start)));
        return;
      }
      // Only the theme follows the host after the start: the frame has its
      // own agent picker, and moving it with ours would fight the user.
      if (this.ready && context.theme !== this.lastTheme) {
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
    switch (data.type) {
      case 'acc:ready':
        this.ready = true;
        this.post(this.context());
        break;
      case 'acc:set-theme':
        if (data.theme === 'dark' || data.theme === 'light') {
          this.themeRequested.emit(data.theme);
        }
        break;
      case 'acc:open-user-menu':
        if (Number.isFinite(data.x) && Number.isFinite(data.y)) {
          // The frame reports its own viewport's coordinates.
          const box = this.frame().nativeElement.getBoundingClientRect();
          this.userMenuRequested.emit({x: box.left + data.x, y: box.top + data.y});
        }
        break;
      default:
        break;
    }
  }

  private post(context: LuminousAppContext) {
    this.lastTheme = context.theme;
    this.frame().nativeElement.contentWindow?.postMessage(
        {type: 'acc:context', ...context, hostControls: true},
        window.location.origin);
  }
}
