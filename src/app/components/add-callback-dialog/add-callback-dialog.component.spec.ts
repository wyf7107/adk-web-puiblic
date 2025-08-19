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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AddCallbackDialogComponent } from './add-callback-dialog.component';

describe('AddCallbackDialogComponent', () => {
  let component: AddCallbackDialogComponent;
  let fixture: ComponentFixture<AddCallbackDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<AddCallbackDialogComponent>>;

  beforeEach(async () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [AddCallbackDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddCallbackDialogComponent);
    component = fixture.componentInstance;
    mockDialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<AddCallbackDialogComponent>>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default callback type as before_agent', () => {
    expect(component.callbackType).toBe('before_agent');
  });

  it('should have all callback types defined', () => {
    expect(component.callbackTypes).toBeDefined();
    expect(component.callbackTypes.length).toBe(6);
    expect(component.callbackTypes).toContain('before_agent');
    expect(component.callbackTypes).toContain('after_agent');
    expect(component.callbackTypes).toContain('before_model');
    expect(component.callbackTypes).toContain('after_model');
    expect(component.callbackTypes).toContain('before_tool');
    expect(component.callbackTypes).toContain('after_tool');
  });

  it('should disable create button when callback name is empty', () => {
    component.callbackName = '';
    expect(component.createDisabled()).toBe(true);
  });

  it('should enable create button when callback name is provided', () => {
    component.callbackName = 'test_callback';
    expect(component.createDisabled()).toBe(false);
  });

  it('should close dialog with callback data when addCallback is called', () => {
    component.callbackName = 'test_callback';
    component.callbackType = 'after_agent';
    
    component.addCallback();
    
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      name: 'test_callback',
      type: 'after_agent',
      code: 'def callback_function(callback_context):\n    # Add your callback logic here\n    return None',
      description: 'Auto-generated callback'
    });
  });

  it('should not close dialog when callback name is empty', () => {
    component.callbackName = '';
    
    component.addCallback();
    
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should close dialog without data when cancel is called', () => {
    component.cancel();
    
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });
});