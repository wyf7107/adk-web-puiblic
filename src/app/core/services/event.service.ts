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

import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {URLUtil} from '../../../utils/url-util';
import {EventIdentifier, EventService as EventServiceInterface} from './interfaces/event';
import type { Observable } from 'rxjs';
import { SpanValidator, Span } from '../models/Trace';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class EventService implements EventServiceInterface {
  apiServerDomain = URLUtil.getApiServerBaseUrl();
  constructor(private http: HttpClient) {}

  /**
   * Returns the trace data for a given event id.
   */
  getEventTrace(appName: string, event: EventIdentifier): Observable<any> {
    const url = this.apiServerDomain + `/dev/apps/${appName}/debug/trace/${event.id!}`;
    return this.http.get<any>(url);
  }

  getTrace(appName: string, sessionId: string): Observable<Span[]> {
    const url = this.apiServerDomain + `/dev/apps/${appName}/debug/trace/session/${sessionId}`;
    const spans = this.http.get(url);
    return spans.pipe(
      map(spans => {
        const result = SpanValidator.array().safeParse(spans);
        if (!result.success) {
          throw new Error(result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
        } else {
          return result.data;
        }
      }));
  }

  getEvent(
      userId: string,
      appName: string,
      sessionId: string,
      eventId: string,
  ) {
    const url = this.apiServerDomain +
      `/dev/apps/${appName}/users/${userId}/sessions/${sessionId}/events/${
                    eventId}/graph`;
    return this.http.get<{dotSrc?: string}>(url);
  }
}
