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

import {TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {DomSanitizer} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute} from '@angular/router';
import {of} from 'rxjs';

import {AppComponent} from './app.component';
import {AGENT_SERVICE} from './core/services/agent.service';
import {ARTIFACT_SERVICE} from './core/services/artifact.service';
import {AUDIO_PLAYING_SERVICE} from './core/services/audio-playing.service';
import {AUDIO_RECORDING_SERVICE} from './core/services/audio-recording.service';
import {DOWNLOAD_SERVICE} from './core/services/download.service';
import {EVAL_SERVICE} from './core/services/eval.service';
import {EVENT_SERVICE} from './core/services/event.service';
import {FEATURE_FLAG_SERVICE} from './core/services/feature-flag.service';
import {GRAPH_SERVICE} from './core/services/graph.service';
import {LOCAL_FILE_SERVICE} from './core/services/interfaces/localfile';
import {SAFE_VALUES_SERVICE} from './core/services/interfaces/safevalues';
import {STRING_TO_COLOR_SERVICE} from './core/services/interfaces/string-to-color';
import {SESSION_SERVICE} from './core/services/session.service';
import {STREAM_CHAT_SERVICE} from './core/services/stream-chat.service';
import {MockAgentService} from './core/services/testing/mock-agent.service';
import {MockArtifactService} from './core/services/testing/mock-artifact.service';
import {MockAudioPlayingService} from './core/services/testing/mock-audio-playing.service';
import {MockAudioRecordingService} from './core/services/testing/mock-audio-recording.service';
import {MockDownloadService} from './core/services/testing/mock-download.service';
import {MockEvalService} from './core/services/testing/mock-eval.service';
import {MockEventService} from './core/services/testing/mock-event.service';
import {MockFeatureFlagService} from './core/services/testing/mock-feature-flag.service';
import {MockGraphService} from './core/services/testing/mock-graph.service';
import {MockLocalFileService} from './core/services/testing/mock-local-file.service';
import {MockSafeValuesService} from './core/services/testing/mock-safevalues.service';
import {MockSessionService} from './core/services/testing/mock-session.service';
import {MockStreamChatService} from './core/services/testing/mock-stream-chat.service';
import {MockStringToColorService} from './core/services/testing/mock-string-to-color.service';
import {MockTraceService} from './core/services/testing/mock-trace.service';
import {MockVideoService} from './core/services/testing/mock-video.service';
import {MockWebSocketService} from './core/services/testing/mock-websocket.service';
import {TRACE_SERVICE} from './core/services/trace.service';
import {VIDEO_SERVICE} from './core/services/video.service';
import {WEBSOCKET_SERVICE} from './core/services/websocket.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    const sessionService = new MockSessionService();
    const agentService = new MockAgentService();
    const featureFlagService = new MockFeatureFlagService();
    const traceService = new MockTraceService();
    const artifactService = new MockArtifactService();
    const audioRecordingService = new MockAudioRecordingService();
    const audioPlayingService = new MockAudioPlayingService();
    const webSocketService = new MockWebSocketService();
    const videoService = new MockVideoService();
    const streamChatService = new MockStreamChatService();
    const eventService = new MockEventService();
    const downloadService = new MockDownloadService();
    const evalService = new MockEvalService();
    const stringToColorService = new MockStringToColorService();
    const safeValuesService = new MockSafeValuesService();
    const localFileService = new MockLocalFileService();

    traceService.selectedTraceRow$.next(undefined);
    traceService.hoveredMessageIndicies$.next([]);

    const graphService = new MockGraphService();
    graphService.render.and.returnValue(Promise.resolve('svg'));

    await TestBed
        .configureTestingModule({
          imports: [AppComponent, NoopAnimationsModule],
          providers: [
            {provide: MatDialog, useValue: {}},
            {
              provide: ActivatedRoute,
              useValue: {
                snapshot: {queryParams: {}},
                queryParams: of({}),
                valueChanges: of({}),
                fragment: of(''),
              },
            },
            {
              provide: DomSanitizer,
              useValue: {bypassSecurityTrustHtml: () => ''},
            },
            {
              provide: SESSION_SERVICE,
              useValue: sessionService,
            },
            {
              provide: ARTIFACT_SERVICE,
              useValue: artifactService,
            },
            {
              provide: AUDIO_RECORDING_SERVICE,
              useValue: audioRecordingService,
            },
            {
              provide: AUDIO_PLAYING_SERVICE,
              useValue: audioPlayingService,
            },
            {
              provide: WEBSOCKET_SERVICE,
              useValue: webSocketService,
            },
            {
              provide: VIDEO_SERVICE,
              useValue: videoService,
            },
            {
              provide: STREAM_CHAT_SERVICE,
              useValue: streamChatService,
            },
            {
              provide: EVENT_SERVICE,
              useValue: eventService,
            },
            {
              provide: DOWNLOAD_SERVICE,
              useValue: downloadService,
            },
            {
              provide: EVAL_SERVICE,
              useValue: evalService,
            },
            {
              provide: TRACE_SERVICE,
              useValue: traceService,
            },
            {
              provide: AGENT_SERVICE,
              useValue: agentService,
            },
            {
              provide: FEATURE_FLAG_SERVICE,
              useValue: featureFlagService,
            },
            {
              provide: GRAPH_SERVICE,
              useValue: graphService,
            },
            {
              provide: STRING_TO_COLOR_SERVICE,
              useValue: stringToColorService,
            },
            {
              provide: SAFE_VALUES_SERVICE,
              useValue: safeValuesService,
            },
            {
              provide: LOCAL_FILE_SERVICE,
              useValue: localFileService,
            },
          ],
        })
        .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
