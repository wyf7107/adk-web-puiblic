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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EvalTabComponent } from './eval-tab.component';
import { EvalService } from '../../core/services/eval.service';
import { SessionService } from '../../core/services/session.service';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import {
  FeatureFlagService,
} from '../../core/services/feature-flag.service';
import {EVAL_SERVICE} from '../../core/services/interfaces/eval';
import {SESSION_SERVICE} from '../../core/services/interfaces/session';
import {FEATURE_FLAG_SERVICE} from '../../core/services/interfaces/feature-flag';

describe('EvalTabComponent', () => {
  let component: EvalTabComponent;
  let fixture: ComponentFixture<EvalTabComponent>;

  beforeEach(async () => {
    const evalService = jasmine.createSpyObj<EvalService>([
      'getEvalSets',
      'getEvalSet',
      'listEvalCases',
      'runEval',
      'getEvalCase',
      'deleteEvalCase',
      'listEvalResults',
      'getEvalResult',
      'getMetricsInfo',
    ]);
    evalService.getEvalSets.and.returnValue(of([]));
    evalService.getEvalSet.and.returnValue(of({} as any));
    evalService.listEvalCases.and.returnValue(of([]));
    evalService.runEval.and.returnValue(of([]));
    evalService.getEvalCase.and.returnValue(of({} as any));
    evalService.deleteEvalCase.and.returnValue(of({} as any));
    evalService.listEvalResults.and.returnValue(of([]));
    evalService.getEvalResult.and.returnValue(of({} as any));
    evalService.getMetricsInfo.and.returnValue(of({metricsInfo: []} as any));

    const sessionService = jasmine.createSpyObj<SessionService>([
      'getSession',
    ]);
    sessionService.getSession.and.returnValue(of({} as any));

    const featureFlagService = jasmine.createSpyObj<FeatureFlagService>([
      'isImportSessionEnabled',
      'isEditFunctionArgsEnabled',
      'isSessionUrlEnabled',
      'isA2ACardEnabled',
    ]);
    featureFlagService.isImportSessionEnabled.and.returnValue(of(false));
    featureFlagService.isEditFunctionArgsEnabled.and.returnValue(of(false));
    featureFlagService.isSessionUrlEnabled.and.returnValue(of(false));
    featureFlagService.isA2ACardEnabled.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [MatDialogModule, EvalTabComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: EVAL_SERVICE, useValue: evalService },
        { provide: SESSION_SERVICE, useValue: sessionService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: {} },
            queryParams: of({}),
          },
        },
        { provide: FEATURE_FLAG_SERVICE, useValue: featureFlagService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EvalTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('runs against the selected set id when one is selected', () => {
    const evalService =
        TestBed.inject(EVAL_SERVICE) as jasmine.SpyObj<EvalService>;
    component.selectedEvalSet.set('my-set');

    (component as any).runEval();

    const args = evalService.runEval.calls.mostRecent().args;
    expect(args[1]).toEqual('my-set');
  });

  it('forwards useLive and the user simulator config from the run dialog',
     () => {
       const evalService =
           TestBed.inject(EVAL_SERVICE) as jasmine.SpyObj<EvalService>;
       const dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
       const userSimulatorConfig = {
         type: 'llm_audio' as const,
         audio_model: 'cloud_tts',
         audio_model_configuration: {
           speech_config: {
             voice_config: {prebuilt_voice_config: {voice_name: 'en-US-Studio-O'}},
             language_code: 'en-US',
           },
         },
       };
       dialog.open.and.returnValue({
         afterClosed: () => of({
           metrics: [{metricName: 'response_match_score', threshold: 0.7}],
           useLive: true,
           userSimulatorConfig,
         }),
       } as any);
       component.selectedEvalSet.set('my-set');
       evalService.runEval.calls.reset();

       (component as any).openEvalConfigDialog();

       expect((component as any).useLive).toBe(true);
       const args = evalService.runEval.calls.mostRecent().args;
       // runEval(appName, evalSetId, cases, metrics, useLive, simulatorConfig).
       expect(args[4]).toBe(true);
       expect(args[5]).toEqual(userSimulatorConfig);
     });

  it('runs a standard (non-live) run with no simulator config', () => {
    const evalService =
        TestBed.inject(EVAL_SERVICE) as jasmine.SpyObj<EvalService>;
    const dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    dialog.open.and.returnValue({
      afterClosed: () => of({
        metrics: [{metricName: 'response_match_score', threshold: 0.7}],
        useLive: false,
        userSimulatorConfig: undefined,
      }),
    } as any);
    component.selectedEvalSet.set('my-set');
    evalService.runEval.calls.reset();

    (component as any).openEvalConfigDialog();

    const args = evalService.runEval.calls.mostRecent().args;
    expect(args[4]).toBe(false);
    expect(args[5]).toBeUndefined();
  });

  it('does not run when the run dialog is cancelled', () => {
    const evalService =
        TestBed.inject(EVAL_SERVICE) as jasmine.SpyObj<EvalService>;
    const dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    dialog.open.and.returnValue({afterClosed: () => of(null)} as any);
    component.selectedEvalSet.set('my-persona-set');
    evalService.runEval.calls.reset();

    (component as any).runCasesFromToolbar();

    expect(dialog.open).toHaveBeenCalled();
    expect(evalService.runEval).not.toHaveBeenCalled();
  });
  it('fetches the eval session under the result user id, not the chat default',
     () => {
       const evalService =
           TestBed.inject(EVAL_SERVICE) as jasmine.SpyObj<EvalService>;
       const sessionService =
           TestBed.inject(SESSION_SERVICE) as jasmine.SpyObj<SessionService>;
       fixture.componentRef.setInput('appName', 'my-app');
       fixture.componentRef.setInput('userId', 'chat-default-user');

       // A fixed-script case (no conversation scenario) takes the session-fetch
       // path rather than the live-result builder.
       evalService.getEvalCase.and.returnValue(of({evalId: 'eval-1'} as any));
       sessionService.getSession.calls.reset();
       sessionService.getSession.and.returnValue(
           of({id: 'sess-1', events: []} as any));

       const evalCaseResult: any = {
         sessionId: 'sess-1',
         evalId: 'eval-1',
         // The eval ran under a different user than the chat default.
         userId: 'test_user_id',
         evalMetricResultPerInvocation: [],
       };

       (component as any).getHistorySession(evalCaseResult, 'ts-1', 'set-1');

       expect(sessionService.getSession)
           .toHaveBeenCalledWith('test_user_id', 'my-app', 'sess-1');
     });

  it('still emits a session when the eval session fetch fails', () => {
    const evalService =
        TestBed.inject(EVAL_SERVICE) as jasmine.SpyObj<EvalService>;
    const sessionService =
        TestBed.inject(SESSION_SERVICE) as jasmine.SpyObj<SessionService>;
    fixture.componentRef.setInput('appName', 'my-app');
    fixture.componentRef.setInput('userId', 'chat-default-user');

    evalService.getEvalCase.and.returnValue(of({evalId: 'eval-1'} as any));
    sessionService.getSession.and.returnValue(
        throwError(() => new Error('404')));

    let emitted: any = null;
    component.sessionSelected.subscribe((s: any) => {
      emitted = s;
    });

    const evalCaseResult: any = {
      sessionId: 'sess-1',
      evalId: 'eval-1',
      userId: 'test_user_id',
      evalMetricResultPerInvocation: [],
    };

    (component as any).getHistorySession(evalCaseResult, 'ts-1', 'set-1');

    // The result is still surfaced (with its metrics/status) instead of being
    // silently dropped, so the chat shows the eval result rather than the
    // agent README.
    expect(emitted).toBeTruthy();
    expect(emitted.id).toBe('sess-1');
    expect(emitted.evalCaseResult).toBe(evalCaseResult);
    expect(emitted.isEvalResult).toBe(true);
  });

  it('fetches metrics info when opening a historical eval result', () => {
    const evalService =
        TestBed.inject(EVAL_SERVICE) as jasmine.SpyObj<EvalService>;
    const sessionService =
        TestBed.inject(SESSION_SERVICE) as jasmine.SpyObj<SessionService>;
    fixture.componentRef.setInput('appName', 'my-app');
    fixture.componentRef.setInput('userId', 'chat-default-user');

    evalService.getEvalCase.and.returnValue(of({evalId: 'eval-1'} as any));
    evalService.getMetricsInfo.calls.reset();
    sessionService.getSession.and.returnValue(
        of({id: 'sess-1', events: []} as any));

    const evalCaseResult: any = {
      sessionId: 'sess-1',
      evalId: 'eval-1',
      userId: 'test_user_id',
      evalMetricResultPerInvocation: [],
    };

    (component as any).getHistorySession(evalCaseResult, 'ts-1', 'set-1');

    // Metric metadata (min/max/description) must be loaded so the metric block
    // above the chat window can render full tooltips instead of missing values.
    expect(evalService.getMetricsInfo).toHaveBeenCalledWith('my-app');
  });

  describe('selectEvalSet', () => {
    it('does not fetch eval-set details when eval V2 is disabled', () => {
      const evalService =
          TestBed.inject(EVAL_SERVICE) as jasmine.SpyObj<EvalService>;
      fixture.componentRef.setInput('appName', 'my-app');
      component.isEvalV2Enabled.set(false);
      evalService.getEvalSet.calls.reset();

      component.selectEvalSet('my-set');

      // The single eval-set detail endpoint only exists on the V2 dev server,
      // so V1 must not call it (it would always 404).
      expect(evalService.getEvalSet).not.toHaveBeenCalled();
    });

    it('fetches eval-set details when eval V2 is enabled', () => {
      const evalService =
          TestBed.inject(EVAL_SERVICE) as jasmine.SpyObj<EvalService>;
      fixture.componentRef.setInput('appName', 'my-app');
      component.isEvalV2Enabled.set(true);
      evalService.getEvalSet.calls.reset();

      component.selectEvalSet('my-set');

      expect(evalService.getEvalSet).toHaveBeenCalledWith('my-app', 'my-set');
    });
  });
});
