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

import {inject, Injectable} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

import {SafeValuesService} from './interfaces/safevalues';

/**
 * Service to provide safe values for DOM manipulation. *Warning*: methods are
 * not currently safe in the 3p implementation.
 */
@Injectable({
  providedIn: 'root',
})
export class SafeValuesServiceImpl extends SafeValuesService {
  private sanitizer = inject(DomSanitizer);

  windowOpen(window: Window,
    url: string,
    target?: string,
    features?: string
  ): Window | null {
    return window.open(url, target, features);
  }

  createObjectUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  openBlobUrl(blob: Blob): Window | null {
    const blobUrl = this.createObjectUrl(blob);
    return this.windowOpen(window, blobUrl, '_blank');
  }

  setAnchorHref(a: HTMLAnchorElement, url: string) {
    a.href = url;
  }

  bypassSecurityTrustHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }
}
