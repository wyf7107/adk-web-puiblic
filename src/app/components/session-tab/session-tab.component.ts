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

import {AsyncPipe, NgClass} from '@angular/common';
import {ChangeDetectorRef, Component, EventEmitter, inject, Input, OnInit, Output, signal} from '@angular/core';
import {MatChip} from '@angular/material/chips';
import {MatProgressBar} from '@angular/material/progress-bar';
import {Subject} from 'rxjs';
import {debounceTime, switchMap, tap} from 'rxjs/operators';

import {Session} from '../../core/models/Session';
import {SESSION_SERVICE} from '../../core/services/interfaces/session';
import {UI_STATE_SERVICE} from '../../core/services/interfaces/ui-state';

import {SessionTabMessagesInjectionToken} from './session-tab.component.i18n';

@Component({
  selector: 'app-session-tab',
  templateUrl: './session-tab.component.html',
  styleUrl: './session-tab.component.scss',
  imports: [NgClass, AsyncPipe, MatChip, MatProgressBar],
  standalone: true,
})
export class SessionTabComponent implements OnInit {
  @Input() userId: string = '';
  @Input() appName: string = '';
  @Input() sessionId: string = '';

  @Output() readonly sessionSelected = new EventEmitter<Session>();
  @Output() readonly sessionReloaded = new EventEmitter<Session>();

  sessionList: any[] = [];

  private refreshSessionsSubject = new Subject<void>();
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  protected readonly sessionService = inject(SESSION_SERVICE);
  protected readonly uiStateService = inject(UI_STATE_SERVICE);
  protected readonly i18n = inject(SessionTabMessagesInjectionToken);

  constructor() {
    this.refreshSessionsSubject
        .pipe(
            tap(() => {
              this.uiStateService.setIsSessionListLoading(true);
            }),
            switchMap(
                () => this.sessionService.listSessions(
                    this.userId, this.appName)),
            tap((res) => {
              res = res.sort(
                  (a: any, b: any) =>
                      Number(b.lastUpdateTime) - Number(a.lastUpdateTime),
              );
              this.sessionList = res;
              this.changeDetectorRef.markForCheck();
            }),
            debounceTime(300),
            )
        .subscribe(
            () => {
              this.uiStateService.setIsSessionListLoading(false);
            },
            () => {
              this.uiStateService.setIsSessionListLoading(false);
            },
        );
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.refreshSessionsSubject.next();
    }, 500);
  }

  getSession(sessionId: string) {
    this.uiStateService.setIsSessionLoading(true);
    this.sessionService.getSession(this.userId, this.appName, sessionId)
        .subscribe(
            (res) => {
              const session = this.fromApiResultToSession(res);
              this.sessionSelected.emit(session);
              this.uiStateService.setIsSessionLoading(false);
            },
            () => {
              this.uiStateService.setIsSessionLoading(false);
            });
  }

  protected getDate(session: any): string {
    let timeStamp = session.lastUpdateTime;

    const date = new Date(timeStamp * 1000);

    return date.toLocaleString();
  }

  private fromApiResultToSession(res: any): Session {
    return {
      id: res?.id ?? '',
      appName: res?.appName ?? '',
      userId: res?.userId ?? '',
      state: res?.state ?? [],
      events: res?.events ?? [],
    };
  }

  reloadSession(sessionId: string) {
    this.sessionService.getSession(this.userId, this.appName, sessionId)
        .subscribe((res) => {
          const session = this.fromApiResultToSession(res);
          this.sessionReloaded.emit(session);
        });
  }

  refreshSession(session?: string) {
    this.refreshSessionsSubject.next();
    if (this.sessionList.length <= 1) {
      return undefined;
    } else {
      let index = this.sessionList.findIndex((s) => s.id == session);
      if (index == this.sessionList.length - 1) {
        index = -1;
      }
      return this.sessionList[index + 1];
    }
  }
}
