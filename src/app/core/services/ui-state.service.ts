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
import {BehaviorSubject, Observable, of as observableOf, Subject} from 'rxjs';
import {map, shareReplay, withLatestFrom} from 'rxjs/operators';

import {Event} from '../models/types';

import {FEATURE_FLAG_SERVICE} from './interfaces/feature-flag';
import {SESSION_SERVICE} from './interfaces/session';
import {ListParams, ListResponse} from './interfaces/types';
import {UiStateService as UiStateServiceInterface} from './interfaces/ui-state';

/**
 * Service to manage the UI state.
 */
@Injectable({
  providedIn: 'root',
})
export class UiStateService implements UiStateServiceInterface {
  private readonly _isSessionLoading = new BehaviorSubject<boolean>(false);
  private readonly _isSessionListLoading = new BehaviorSubject<boolean>(false);
  private readonly _isEventRequestResponseLoading =
      new BehaviorSubject<boolean>(false);
  private readonly _isMessagesLoading = new BehaviorSubject<boolean>(false);
  protected readonly _newMessagesLoadedResponse =
      new Subject<ListResponse<any>&{isBackground?: boolean}>();
  protected readonly _newMessagesLoadingFailedResponse =
      new Subject<{message: string}>();
  private readonly featureFlagService = inject(FEATURE_FLAG_SERVICE);

  isSessionLoading(): Observable<boolean> {
    return this._isSessionLoading.pipe(
        withLatestFrom(this.featureFlagService.isLoadingAnimationsEnabled()),
        map(([isLoading, areAnimationsEnabled]) =>
                isLoading && areAnimationsEnabled),
        shareReplay({bufferSize: 1, refCount: true}),
    );
  }

  setIsSessionLoading(isLoading: boolean) {
    this._isSessionLoading.next(isLoading);
  }

  isSessionListLoading(): Observable<boolean> {
    return this._isSessionListLoading.pipe(
        withLatestFrom(this.featureFlagService.isLoadingAnimationsEnabled()),
        map(([isLoading, areAnimationsEnabled]) =>
                isLoading && areAnimationsEnabled),
        shareReplay({bufferSize: 1, refCount: true}),
    );
  }

  setIsSessionListLoading(isLoading: boolean) {
    this._isSessionListLoading.next(isLoading);
  }

  isEventRequestResponseLoading(): Observable<boolean> {
    return this._isEventRequestResponseLoading.pipe(
        withLatestFrom(this.featureFlagService.isLoadingAnimationsEnabled()),
        map(([isLoading, areAnimationsEnabled]) =>
                isLoading && areAnimationsEnabled),
        shareReplay({bufferSize: 1, refCount: true}),
    );
  }

  setIsEventRequestResponseLoading(isLoading: boolean) {
    this._isEventRequestResponseLoading.next(isLoading);
  }

  setIsMessagesLoading(isLoading: boolean) {
    this._isMessagesLoading.next(isLoading);
  }

  isMessagesLoading(): Observable<boolean> {
    return this._isMessagesLoading.pipe(
        withLatestFrom(this.featureFlagService.isLoadingAnimationsEnabled()),
        map(([isLoading, areAnimationsEnabled]) =>
                isLoading && areAnimationsEnabled),
        shareReplay({bufferSize: 1, refCount: true}),
    );
  }

  lazyLoadMessages(
      sessionName: string, listParams?: ListParams,
      isBackground?: boolean): Observable<void> {
    throw new Error('Not implemented');
  }

  onNewMessagesLoaded(): Observable<ListResponse<any>> {
    return this._newMessagesLoadedResponse;
  }

  onNewMessagesLoadingFailed(): Observable<{message: string}> {
    return this._newMessagesLoadingFailedResponse;
  }
}
