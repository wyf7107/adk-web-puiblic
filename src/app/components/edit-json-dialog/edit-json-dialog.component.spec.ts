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

import {ComponentFixture, TestBed} from '@angular/core/testing';

import {EditJsonDialogComponent} from './edit-function-args-dialog.component';

describe('EditFunctionArgsDialogComponent', () => {
  let component: EditJsonDialogComponent;
  let fixture: ComponentFixture<EditJsonDialogComponent>;

  beforeEach(async () => {
    await TestBed
        .configureTestingModule({
          imports: [EditJsonDialogComponent],
        })
        .compileComponents();

    fixture = TestBed.createComponent(EditJsonDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
