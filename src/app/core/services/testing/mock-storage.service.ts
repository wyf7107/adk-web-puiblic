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

import {Injectable} from '@angular/core';

import {StorageServiceInterface} from '../interfaces/storage';

/**
 * In-memory implementation of StorageServiceInterface, so tests do not leak
 * preferences into each other through the real browser storage.
 */
@Injectable()
export class MockStorageService implements StorageServiceInterface {
  private readonly entries = new Map<string, string>();

  getItem(key: string): string|null {
    return this.entries.has(key) ? this.entries.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.entries.set(key, value);
  }
}
