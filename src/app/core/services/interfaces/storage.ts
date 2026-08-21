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

import {InjectionToken} from '@angular/core';

/**
 * Persists small client-side UI preferences, such as which tab is selected or
 * whether the side panel is open.
 *
 * The backing store is supplied by the embedder. The open-source app uses
 * `window.localStorage`; embedders whose storage policy forbids it can route
 * these values elsewhere.
 */
export interface StorageServiceInterface {
  getItem(key: string): string|null;
  setItem(key: string, value: string): void;
}

/**
 * Storage service injection token.
 */
export const STORAGE_SERVICE = new InjectionToken<StorageServiceInterface>(
    'StorageService',
);
