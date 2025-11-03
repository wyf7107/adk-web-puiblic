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

import {ComponentFixture, TestBed,} from '@angular/core/testing';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, it,}
import {of} from 'rxjs';

import {SESSION_SERVICE, SessionService,} from '../../core/services/interfaces/session';
import {UI_STATE_SERVICE,} from '../../core/services/interfaces/ui-state';
import {MockSessionService} from '../../core/services/testing/mock-session.service';
import {MockUiStateService} from '../../core/services/testing/mock-ui-state.service';
import {fakeAsync, initTestBed} from '../../testing/utils';

import {SessionTabComponent} from './session-tab.component';

describe('SessionTabComponent', () => {
  let component: SessionTabComponent;
  let fixture: ComponentFixture<SessionTabComponent>;
  let mockUiStateService: MockUiStateService;
  let sessionService: MockSessionService;

  beforeEach(async () => {
    sessionService = new MockSessionService();
    mockUiStateService = new MockUiStateService();

    sessionService.listSessionsResponse.next([]);
    sessionService.canEditResponse.next(true);

    initTestBed();  // required for 1p compatibility
    await TestBed
        .configureTestingModule({
          imports: [MatDialogModule, SessionTabComponent, NoopAnimationsModule],
          providers: [
            {
              provide: MatDialog,
              useValue: jasmine.createSpyObj('MatDialog', ['open']),
            },
            {provide: SESSION_SERVICE, useValue: sessionService},
            {provide: UI_STATE_SERVICE, useValue: mockUiStateService},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(SessionTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when getting a session', () => {
    beforeEach(() => {
      spyOn(component.sessionSelected, 'emit');
    });

    it('should set session loading state to true', () => {
      component.getSession('session1');
      expect(mockUiStateService.setIsSessionLoading).toHaveBeenCalledWith(true);
    });

    describe('when getting a session is successful', () => {
      beforeEach(() => {
        sessionService.getSessionResponse.next({} as any);
        component.getSession('session1');
      });

      it('emits sessionSelected', () => {
        expect(component.sessionSelected.emit).toHaveBeenCalled();
      });

      it('sets session loading state to false', fakeAsync(() => {
                    expect(mockUiStateService.setIsSessionLoading)
                        .toHaveBeenCalledWith(
                            false,
                        );
                  }));
    });

    describe('when getting a session throws error', () => {
      beforeEach(() => {
        sessionService.getSessionResponse.error(new Error('error'));
        component.getSession('session1');
      });

      it('hides session loading state', fakeAsync(() => {
                    expect(mockUiStateService.setIsSessionLoading)
                        .toHaveBeenCalledWith(
                            false,
                        );
                  }));

      it(
          'does not emit sessionSelected', fakeAsync(() => {
            expect(component.sessionSelected.emit).not.toHaveBeenCalled();
          }));

      describe('on retry', () => {
        beforeEach(() => {
          sessionService.getSession.calls.reset();
          sessionService.getSessionResponse.next({} as any);
          component.getSession('session1');
        });

        it('fetches session again', () => {
          expect(sessionService.getSession).toHaveBeenCalled();
        });
      });
    });
  });
});
