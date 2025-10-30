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

import {inject, Injectable, signal} from '@angular/core';

import {FEATURE_FLAG_SERVICE} from './interfaces/feature-flag';
import {UiStateService as UiStateServiceInterface} from './interfaces/ui-state';

/**
 * Service to manage the UI state.
 */
@Injectable({
  providedIn: 'root',
})
export class UiStateService implements UiStateServiceInterface {
  private readonly _isSessionLoading = signal(false);
  private readonly _isSessionListLoading = signal(false);
  private readonly _isEventRequestResponseLoading = signal(false);
  private readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);

  isSessionLoading(): boolean {
    if (!this.featureFlagService.isLoadingAnimationsEnabled()) {
      return false;
    }
    return this._isSessionLoading();
  }

  setIsSessionLoading(isLoading: boolean) {
    this._isSessionLoading.set(isLoading);
  }

  isSessionListLoading(): boolean {
    if (!this.featureFlagService.isLoadingAnimationsEnabled()) {
      return false;
    }
    return this._isSessionListLoading();
  }

  setIsSessionListLoading(isLoading: boolean) {
    this._isSessionListLoading.set(isLoading);
  }

  isEventRequestResponseLoading(): boolean {
    if (!this.featureFlagService.isLoadingAnimationsEnabled()) {
      return false;
    }
    return this._isEventRequestResponseLoading();
  }

  setIsEventRequestResponseLoading(isLoading: boolean) {
    this._isEventRequestResponseLoading.set(isLoading);
  }
}
