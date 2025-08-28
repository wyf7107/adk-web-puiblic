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

import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {AppRoutingModule} from './app-routing.module';

import {HttpClientModule} from '@angular/common/http';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AppComponent} from './app.component';
import {ComponentModule} from './components/component.module';
import {AgentService, AGENT_SERVICE} from './core/services/agent.service';
import {ArtifactService, ARTIFACT_SERVICE} from './core/services/artifact.service';
import {AudioService, AUDIO_SERVICE} from './core/services/audio.service';
import {DownloadService, DOWNLOAD_SERVICE} from './core/services/download.service';
import {EvalService, EVAL_SERVICE} from './core/services/eval.service';
import {EventService, EVENT_SERVICE} from './core/services/event.service';
import {FeatureFlagService, FEATURE_FLAG_SERVICE} from './core/services/feature-flag.service';
import {SessionService, SESSION_SERVICE} from './core/services/session.service';
import {VideoService, VIDEO_SERVICE} from './core/services/video.service';
import {WebSocketService, WEBSOCKET_SERVICE} from './core/services/websocket.service';
import { TraceService, TRACE_SERVICE } from './core/services/trace.service';

@NgModule({
  declarations: [AppComponent],
  imports: [
    ComponentModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    BrowserAnimationsModule,
  ],
  providers: [
    {provide: SESSION_SERVICE, useClass: SessionService},
    {provide: AGENT_SERVICE, useClass: AgentService},
    {provide: WEBSOCKET_SERVICE, useClass: WebSocketService},
    {provide: AUDIO_SERVICE, useClass: AudioService},
    {provide: VIDEO_SERVICE, useClass: VideoService},
    {provide: EVENT_SERVICE, useClass: EventService},
    {provide: EVAL_SERVICE, useClass: EvalService},
    {provide: ARTIFACT_SERVICE, useClass: ArtifactService},
    {provide: DOWNLOAD_SERVICE, useClass: DownloadService},
    {provide: TRACE_SERVICE, useClass: TraceService},
    {provide: FEATURE_FLAG_SERVICE, useClass: FeatureFlagService},
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
}
