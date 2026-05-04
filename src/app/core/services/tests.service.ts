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

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { URLUtil } from '../../../utils/url-util';

@Injectable({
  providedIn: 'root',
})
export class TestsService {
  protected http = inject(HttpClient);
  protected zone = inject(NgZone);

  apiServerDomain = URLUtil.getApiServerBaseUrl();

  listTests(appName: string): Observable<string[]> {
    const url = `${this.apiServerDomain}/dev/${appName}/tests`;
    return this.http.get<string[]>(url);
  }

  getTest(appName: string, testName: string): Observable<any[]> {
    const url = `${this.apiServerDomain}/dev/${appName}/tests/${testName}`;
    return this.http.get<any[]>(url);
  }

  createTest(appName: string, testName: string, sessionData: any): Observable<any> {
    const url = `${this.apiServerDomain}/dev/${appName}/tests/${testName}`;
    return this.http.put<any>(url, { session_data: sessionData });
  }

  deleteTest(appName: string, testName: string): Observable<any> {
    const url = `${this.apiServerDomain}/dev/${appName}/tests/${testName}`;
    return this.http.delete<any>(url);
  }

  rebuildTests(appName: string, testName?: string): Observable<any> {
    let url = `${this.apiServerDomain}/dev/${appName}/tests/rebuild`;
    if (testName) {
      url += `?test_name=${testName}`;
    }
    return this.http.post<any>(url, {});
  }

  runTests(appName: string, testName?: string): Observable<string> {
    let url = `${this.apiServerDomain}/dev/${appName}/tests/run`;
    if (testName) {
      url += `?test_name=${testName}`;
    }

    return new Observable<string>((observer) => {
      fetch(url, {
        method: 'POST',
      })
        .then((response) => {
          if (!response.body) {
            observer.error('No response body');
            return;
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');

          const read = () => {
            reader.read()
              .then(({ done, value }) => {
                if (done) {
                  this.zone.run(() => observer.complete());
                  return;
                }
                const chunk = decoder.decode(value, { stream: true });
                this.zone.run(() => observer.next(chunk));
                read(); // Read the next chunk
              })
              .catch((err) => {
                this.zone.run(() => observer.error(err));
              });
          };

          read();
        })
        .catch((err) => {
          this.zone.run(() => observer.error(err));
        });
    });
  }
}
