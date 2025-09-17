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

import {Location} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {BehaviorSubject, NEVER, of, Subject, throwError} from 'rxjs';

import {AGENT_SERVICE, AgentService} from '../../core/services/agent.service';
import {ARTIFACT_SERVICE, ArtifactService,} from '../../core/services/artifact.service';
import {AUDIO_SERVICE, AudioService} from '../../core/services/audio.service';
import {DOWNLOAD_SERVICE, DownloadService,} from '../../core/services/download.service';
import {EVAL_SERVICE, EvalService} from '../../core/services/eval.service';
import {EVENT_SERVICE, EventService} from '../../core/services/event.service';
import {FEATURE_FLAG_SERVICE, FeatureFlagService,} from '../../core/services/feature-flag.service';
import {SESSION_SERVICE, SessionService,} from '../../core/services/session.service';
import {TRACE_SERVICE, TraceService} from '../../core/services/trace.service';
import {VIDEO_SERVICE, VideoService} from '../../core/services/video.service';
import {WEBSOCKET_SERVICE, WebSocketService,} from '../../core/services/websocket.service';
import {ChatPanelComponent} from '../chat-panel/chat-panel.component';

import {ChatComponent} from './chat.component';

const SESSION_1_ID = 'session-1';
const SESSION_2_ID = 'session-2';
const TEST_APP_1_NAME = 'test-app';
const TEST_APP_2_NAME = 'test-app-2';
const ANOTHER_APP_NAME = 'another-app';
const INVALID_APP_NAME = 'invalid-app';
const USER_ID = 'user';
const EVENT_1_ID = 'event1';
const OK_BUTTON_TEXT = 'OK';
const APP_QUERY_PARAM = 'app';
const SESSION_QUERY_PARAM = 'session';
const SSE_ERROR_RESPONSE = '{"error": "SSE error"}';
const CALL_FUNCTION_USER_INPUT = 'call a function';
const FUNC1_NAME = 'func1';
const STATE_KEY = 'key';
const STATE_VALUE = 'value';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;
  let mockSessionService: jasmine.SpyObj<SessionService>;
  let mockArtifactService: jasmine.SpyObj<ArtifactService>;
  let mockAudioService: jasmine.SpyObj<AudioService>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;
  let mockVideoService: jasmine.SpyObj<VideoService>;
  let mockEventService: jasmine.SpyObj<EventService>;
  let mockDownloadService: jasmine.SpyObj<DownloadService>;
  let mockEvalService: jasmine.SpyObj<EvalService>;
  let mockTraceService: jasmine.SpyObj<TraceService>;
  let mockAgentService: jasmine.SpyObj<AgentService>;
  let mockFeatureFlagService: jasmine.SpyObj<FeatureFlagService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let mockLocation: jasmine.SpyObj<Location>;

  beforeEach(async () => {
    mockSessionService = jasmine.createSpyObj('SessionService', {
      createSession: of({id: SESSION_1_ID, state: {}}),
      getSession: of({}),
      deleteSession: of({}),
      listSessions: of([]),
      importSession: of({}),
    });
    mockArtifactService = jasmine.createSpyObj('ArtifactService', [
      'getArtifactVersion',
    ]);
    mockAudioService = jasmine.createSpyObj('AudioService', [
      'startRecording',
      'stopRecording',
    ]);
    mockWebSocketService = jasmine.createSpyObj('WebSocketService', {
      onCloseReason: NEVER,
      connect: undefined,
      closeConnection: undefined,
    });
    mockVideoService = jasmine.createSpyObj('VideoService', [
      'startRecording',
      'stopRecording',
    ]);
    mockEventService = jasmine.createSpyObj('EventService', {
      getTrace: of([]),
      getEventTrace: of({
        'gcp.vertex.agent.llm_request': '{}',
        'gcp.vertex.agent.llm_response': '{}',
      }),
      getEvent: of({}),
    });
    mockDownloadService = jasmine.createSpyObj('DownloadService', [
      'downloadObjectAsJson',
    ]);
    mockEvalService = jasmine.createSpyObj('EvalService', {
      updateEvalCase: undefined,
      getEvalSets: of([]),
      listEvalCases: undefined,
      runEval: undefined,
      getEvalCase: undefined,
      deleteEvalCase: undefined,
      listEvalResults: of([]),
      getEvalResult: undefined,
    });
    mockTraceService = jasmine.createSpyObj(
        'TraceService',
        [
          'setEventData',
          'setMessages',
          'resetTraceService',
          'selectedRow',
          'setHoveredMessages',
        ],
        {
          selectedTraceRow$: of(null),
          hoveredMessageIndicies$: of([]),
        },
    );
    mockAgentService = jasmine.createSpyObj('AgentService', [
      'listApps',
      'getApp',
      'getLoadingState',
      'setApp',
      'runSse',
    ]);
    mockFeatureFlagService = jasmine.createSpyObj('FeatureFlagService', {
      isImportSessionEnabled: of(true),
      isEditFunctionArgsEnabled: of(true),
      isSessionUrlEnabled: of(true),
    });
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree'], {
      events: of(new NavigationEnd(1, '', '')),
    });
    mockLocation = jasmine.createSpyObj('Location', ['replaceState']);

    mockActivatedRoute = {
      snapshot: {
        queryParams: {},
      } as any,
      queryParams: of({}),
    };

    mockAgentService.listApps.and.returnValue(
        of([TEST_APP_1_NAME, TEST_APP_2_NAME]));
    const appName = new BehaviorSubject<string>(TEST_APP_1_NAME);
    mockAgentService.setApp.and.callFake((p) => {
      appName.next(p);
    });
    mockAgentService.getApp.and.callFake(() => {
      return appName;
    });
    mockAgentService.getLoadingState.and.returnValue(
        new BehaviorSubject<boolean>(false),
    );
    mockRouter.createUrlTree.and.returnValue({
      toString: () => '/?session=session-id',
    } as any);

    await TestBed
        .configureTestingModule({
          imports: [ChatComponent, MatDialogModule, NoopAnimationsModule],
          providers: [
            {provide: SESSION_SERVICE, useValue: mockSessionService},
            {provide: ARTIFACT_SERVICE, useValue: mockArtifactService},
            {provide: AUDIO_SERVICE, useValue: mockAudioService},
            {provide: WEBSOCKET_SERVICE, useValue: mockWebSocketService},
            {provide: VIDEO_SERVICE, useValue: mockVideoService},
            {provide: EVENT_SERVICE, useValue: mockEventService},
            {provide: DOWNLOAD_SERVICE, useValue: mockDownloadService},
            {provide: EVAL_SERVICE, useValue: mockEvalService},
            {provide: TRACE_SERVICE, useValue: mockTraceService},
            {provide: AGENT_SERVICE, useValue: mockAgentService},
            {provide: FEATURE_FLAG_SERVICE, useValue: mockFeatureFlagService},
            {provide: MatDialog, useValue: mockDialog},
            {provide: MatSnackBar, useValue: mockSnackBar},
            {provide: Router, useValue: mockRouter},
            {provide: ActivatedRoute, useValue: mockActivatedRoute},
            {provide: Location, useValue: mockLocation},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('when listApps fails', () => {
      let error: HttpErrorResponse;
      beforeEach(() => {
        error = new HttpErrorResponse({error: 'Failed to load apps'});
        mockAgentService.listApps.and.returnValue(throwError(() => error));
        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
      it('should set loadingError', () => {
        expect(component.loadingError()).toBe(error.message);
      });
    });

    describe('when app in URL is invalid', () => {
      beforeEach(async () => {
        mockActivatedRoute.snapshot!.queryParams = {
          [APP_QUERY_PARAM]: INVALID_APP_NAME,
        };
        mockAgentService.listApps.and.returnValue(of([TEST_APP_1_NAME]));
        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
      });
      it('should show snackbar', () => {
        expect(mockSnackBar.open)
            .toHaveBeenCalledWith(
                `Agent '${INVALID_APP_NAME}' not found`,
                OK_BUTTON_TEXT,
            );
      });
    });
  });

  describe('Session Management', () => {
    describe('when session not in url', () => {
      beforeEach(() => {
        mockActivatedRoute.snapshot!.queryParams = {
          [APP_QUERY_PARAM]: TEST_APP_2_NAME,
        };
        component.ngOnInit();
      });
      it('should create new session on init', () => {
        expect(mockSessionService.createSession)
            .toHaveBeenCalledWith(
                USER_ID,
                TEST_APP_2_NAME,
            );
        expect(component.sessionId).toBe(SESSION_1_ID);
      });
    });

    describe('when session ID is provided in URL', () => {
      beforeEach(async () => {
        mockFeatureFlagService.isSessionUrlEnabled.and.returnValue(of(true));
        mockActivatedRoute.snapshot!.queryParams = {
          [APP_QUERY_PARAM]: TEST_APP_1_NAME,
          [SESSION_QUERY_PARAM]: SESSION_2_ID,
        };
        mockSessionService.getSession.and.returnValue(
            of({id: SESSION_2_ID, state: {}, events: []}),
        );
        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        component.ngOnInit();
        fixture.detectChanges();
        component.selectApp(TEST_APP_2_NAME);
        await fixture.whenStable();
      });
      it('should load session from URL', () => {
        expect(mockSessionService.getSession)
            .toHaveBeenCalledWith(
                USER_ID,
                TEST_APP_2_NAME,
                SESSION_2_ID,
            );
        expect(component.sessionId).toBe(SESSION_2_ID);
      });
    });

    describe('when session in URL is not found', () => {
      beforeEach(async () => {
        mockActivatedRoute.snapshot!.queryParams = {
          [APP_QUERY_PARAM]: TEST_APP_1_NAME,
          [SESSION_QUERY_PARAM]: SESSION_2_ID,
        };
        mockSessionService.getSession.and.returnValue(
            throwError(() => new HttpErrorResponse({status: 404})),
        );
        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.selectApp(TEST_APP_2_NAME);
        await fixture.whenStable();
      });
      it('should create new session', () => {
        expect(mockSnackBar.open)
            .toHaveBeenCalledWith(
                'Cannot find specified session. Creating a new one.',
                OK_BUTTON_TEXT,
            );
        expect(mockSessionService.createSession)
            .toHaveBeenCalledWith(
                USER_ID,
                TEST_APP_2_NAME,
            );
      });
    });

    describe('when app selection changes and session URL is disabled', () => {
      beforeEach(async () => {
        mockFeatureFlagService.isSessionUrlEnabled.and.returnValue(of(false));
        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.selectApp(ANOTHER_APP_NAME);
        await fixture.whenStable();
      });
      it('should create new session', () => {
        expect(mockAgentService.setApp).toHaveBeenCalledWith(ANOTHER_APP_NAME);
        expect(mockSessionService.createSession).toHaveBeenCalled();
      });
    });

    describe('when onNewSessionClick() is called', () => {
      beforeEach(() => {
        component.messages.set([{role: USER_ID, text: 'hello'}]);
        component.artifacts = [{}];
        component.eventData = new Map([['1', {}]]);
        component.traceData = [{}];
        component.onNewSessionClick();
      });
      it('should clear data and create new session', () => {
        expect(component.messages().length).toBe(0);
        expect(component.artifacts.length).toBe(0);
        expect(component.eventData.size).toBe(0);
        expect(component.traceData.length).toBe(0);
        expect(mockSessionService.createSession).toHaveBeenCalled();
      });
    });

    describe('when deleting a session', () => {
      describe('and dialog is confirmed', () => {
        beforeEach(() => {
          mockDialog.open.and.returnValue({
            afterClosed: () => of(true),
          } as any);
          spyOn(component.sessionTab, 'refreshSession').and.returnValue({
            id: SESSION_2_ID,
          } as any);
          spyOn(component.sessionTab, 'getSession');
          component.deleteSession(SESSION_1_ID);
        });
        it('should delete session', () => {
          expect(mockDialog.open).toHaveBeenCalled();
          expect(mockSessionService.deleteSession)
              .toHaveBeenCalledWith(
                  USER_ID,
                  TEST_APP_1_NAME,
                  SESSION_1_ID,
              );
        });
      });

      describe('and dialog is cancelled', () => {
        beforeEach(() => {
          mockDialog.open.and.returnValue({
            afterClosed: () => of(false),
          } as any);
          component.deleteSession(SESSION_1_ID);
        });
        it('should not delete session', () => {
          expect(mockDialog.open).toHaveBeenCalled();
          expect(mockSessionService.deleteSession).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('UI and State', () => {
    describe('toggleSidePanel', () => {
      beforeEach(() => {
        spyOn(component.sideDrawer, 'open');
        spyOn(component.sideDrawer, 'close');
      });

      describe('when panel is open', () => {
        beforeEach(() => {
          component.showSidePanel = true;
          component.toggleSidePanel();
        });
        it('closes panel', () => {
          expect(component.sideDrawer.close).toHaveBeenCalled();
          expect(component.showSidePanel).toBe(false);
        });
      });
      describe('when panel is closed', () => {
        beforeEach(() => {
          component.showSidePanel = false;
          component.toggleSidePanel();
        });
        it('opens panel', () => {
          expect(component.sideDrawer.open).toHaveBeenCalled();
          expect(component.showSidePanel).toBe(true);
        });
      });
    });

    describe('when clickEvent() is called', () => {
      beforeEach(() => {
        component.sessionId = SESSION_1_ID;
        component.messages.set(
            [{role: 'bot', text: 'response', eventId: EVENT_1_ID}]);
        component.eventData = new Map([[EVENT_1_ID, {id: EVENT_1_ID}]]);
        spyOn(component.sideDrawer, 'open');
        component.clickEvent(0);
      });
      it('should open side panel with event details', () => {
        expect(component.sideDrawer.open).toHaveBeenCalled();
        expect(component.selectedEvent.id).toBe(EVENT_1_ID);
        expect(mockEventService.getEventTrace).toHaveBeenCalledWith(EVENT_1_ID);
        expect(mockEventService.getEvent)
            .toHaveBeenCalledWith(
                USER_ID,
                TEST_APP_1_NAME,
                SESSION_1_ID,
                EVENT_1_ID,
            );
      });
    });

    describe('when updateState() is called', () => {
      const newState = {[STATE_KEY]: STATE_VALUE};
      beforeEach(() => {
        mockDialog.open.and.returnValue({
          afterClosed: () => of(newState),
        } as any);
        component.updateState();
      });
      it('should open dialog and update session state', () => {
        expect(mockDialog.open).toHaveBeenCalled();
        expect(component.updatedSessionState()).toEqual(newState);
      });
    });

    describe('when removeStateUpdate() is called', () => {
      beforeEach(() => {
        component.updatedSessionState.set({[STATE_KEY]: STATE_VALUE});
        component.removeStateUpdate();
      });
      it('should remove state update', () => {
        expect(component.updatedSessionState()).toBeNull();
      });
    });
  });

  describe('Bi-directional Streaming', () => {
    describe('when bidi streaming is restarted', () => {
      beforeEach(() => {
        component.sessionHasUsedBidi.add(component.sessionId);
        component.startAudioRecording();
      });
      it('should show snackbar', () => {
        expect(mockSnackBar.open)
            .toHaveBeenCalledWith(
                'Restarting bidirectional streaming is not currently supported. Please refresh the page or start a new session.',
                OK_BUTTON_TEXT,
            );
      });
    });
  });

  describe('ChatPanel integration', () => {
    it('should display chat-panel when appName is set', () => {
      const chatPanel =
          fixture.debugElement.query(By.directive(ChatPanelComponent));
      expect(chatPanel).toBeTruthy();
    });

    it('should pass messages to chat-panel', async () => {
      component.messages.set([{role: 'user', text: 'test message'}]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const chatPanelComponent =
          fixture.debugElement.query(By.directive(ChatPanelComponent))
              .componentInstance;
      expect(chatPanelComponent.messages).toEqual(component.messages());
      const messageCards =
          fixture.debugElement.queryAll(By.css('app-chat-panel .message-card'));
      expect(messageCards.length).toBe(1);
      expect(messageCards[0].nativeElement.textContent)
          .toContain('test message');
    });

    it('should call sendMessage when chat-panel emits sendMessage', () => {
      spyOn(component, 'sendMessage').and.callThrough();
      mockAgentService.runSse.and.returnValue(of());
      const chatPanelDebugEl =
          fixture.debugElement.query(By.directive(ChatPanelComponent));
      const mockEvent = new KeyboardEvent('keydown', {key: 'Enter'});
      chatPanelDebugEl.triggerEventHandler('sendMessage', mockEvent);
      expect(component.sendMessage).toHaveBeenCalledWith(mockEvent);
    });

    it('should call clickEvent when chat-panel emits clickEvent', () => {
      spyOn(component, 'clickEvent');
      const chatPanelDebugEl =
          fixture.debugElement.query(By.directive(ChatPanelComponent));
      chatPanelDebugEl.triggerEventHandler('clickEvent', 0);
      expect(component.clickEvent).toHaveBeenCalledWith(0);
    });

    it('should call updateState when chat-panel emits updateState', () => {
      spyOn(component, 'updateState');
      const chatPanelDebugEl =
          fixture.debugElement.query(By.directive(ChatPanelComponent));
      chatPanelDebugEl.triggerEventHandler('updateState', undefined);
      expect(component.updateState).toHaveBeenCalled();
    });

    it('should call toggleAudioRecording when chat-panel emits toggleAudioRecording',
       () => {
         spyOn(component, 'toggleAudioRecording');
         const chatPanelDebugEl =
             fixture.debugElement.query(By.directive(ChatPanelComponent));
         chatPanelDebugEl.triggerEventHandler(
             'toggleAudioRecording', undefined);
         expect(component.toggleAudioRecording).toHaveBeenCalled();
       });
  });

  describe('Eval Case Editing', () => {
    describe('when editEvalCaseMessage() is called', () => {
      const message = {role: 'user', text: 'hello', isEditing: false};
      let mockTextarea: any;

      beforeEach(() => {
        mockTextarea = {
          value: message.text,
          focus: jasmine.createSpy('focus'),
          setSelectionRange: jasmine.createSpy('setSelectionRange'),
        };
        component.chatPanel.textarea = {
          nativeElement: mockTextarea,
        };
      });

      it('should set editing state', () => {
        component['editEvalCaseMessage'](message);

        expect(component.isEvalCaseEditing()).toBe(true);
        expect(component.userEditEvalCaseMessage).toBe(message.text);
        expect(message.isEditing).toBe(true);
      });

      it('should set cursor position', fakeAsync(() => {
           component['editEvalCaseMessage'](message);

           tick();
           expect(mockTextarea.setSelectionRange)
               .toHaveBeenCalledWith(message.text.length, message.text.length);
         }));

      it('should focus textarea ', fakeAsync(() => {
           component['editEvalCaseMessage'](message);

           tick();
           expect(mockTextarea.focus).toHaveBeenCalled();
         }));
    });

    describe('when editEvalCaseMessage() is called with newline at end', () => {
      const message = {role: 'user', text: 'hello\n', isEditing: false};
      let mockTextarea: any;

      beforeEach(() => {
        mockTextarea = {
          value: message.text,
          focus: jasmine.createSpy('focus'),
          setSelectionRange: jasmine.createSpy('setSelectionRange'),
        };
        component.chatPanel.textarea = {
          nativeElement: mockTextarea,
        };
      });

      it('should set cursor position before newline', fakeAsync(() => {
           component['editEvalCaseMessage'](message);

           tick();
           expect(mockTextarea.setSelectionRange)
               .toHaveBeenCalledWith(
                   message.text.length - 1, message.text.length - 1);
         }));

      it('should focus textarea', fakeAsync(() => {
           component['editEvalCaseMessage'](message);

           tick();
           expect(mockTextarea.focus).toHaveBeenCalled();
         }));
    });
  });
});
