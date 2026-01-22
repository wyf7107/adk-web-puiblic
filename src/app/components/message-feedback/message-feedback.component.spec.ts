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
import {By} from '@angular/platform-browser';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {FEEDBACK_SERVICE} from '../../core/services/interfaces/feedback';
import {MockFeedbackService} from '../../core/services/testing/mock-feedback.service';
import {initTestBed} from '../../testing/utils';

import {MessageFeedbackComponent} from './message-feedback.component';

describe('MessageFeedbackComponent', () => {
  let mockFeedbackService: MockFeedbackService;
  let fixture: ComponentFixture<MessageFeedbackComponent>;

  beforeEach(async () => {
    mockFeedbackService = new MockFeedbackService();

    initTestBed();
    await TestBed
        .configureTestingModule({
          imports: [MessageFeedbackComponent],
          providers: [
            {provide: FEEDBACK_SERVICE, useValue: mockFeedbackService},
          ],
        })
        .compileComponents();

    fixture = TestBed.createComponent(MessageFeedbackComponent);
    fixture.componentRef.setInput('sessionName', 'test-session');
    fixture.componentRef.setInput('eventId', 'test-event');
    fixture.detectChanges();
  });

  it('should show detailed feedback panel when "up" button is clicked', () => {
    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeFalsy();

    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeTruthy();
    expect(mockFeedbackService.sendFeedback).not.toHaveBeenCalled();
  });

  it('should show detailed feedback panel when "down" button is clicked',
     () => {
       expect(fixture.debugElement.query(By.css('.feedback-details-container')))
           .toBeFalsy();

       fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
           .nativeElement.click();
       fixture.detectChanges();

       expect(fixture.debugElement.query(By.css('.feedback-details-container')))
           .toBeTruthy();
       expect(fixture.debugElement.query(By.css('.feedback-buttons')))
           .toBeTruthy();
       expect(mockFeedbackService.sendFeedback).not.toHaveBeenCalled();
     });

  it('should toggle between detailed feedback directions', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
        .nativeElement.click();  // Open down panel
    fixture.detectChanges();
    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[1]
               .nativeElement.textContent)
        .toContain('thumb_down_filled');

    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();  // Switch to up
    fixture.detectChanges();

    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[0]
               .nativeElement.textContent)
        .toContain('thumb_up_filled');
    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[1]
               .nativeElement.textContent)
        .toContain('thumb_down');
    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeTruthy();
  });

  it('should call sendFeedback when detailed feedback is submitted', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();  // Click up
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeTruthy();

    // Fill in feedback
    const textarea =
        fixture.debugElement.query(By.css('textarea')).nativeElement as
        HTMLTextAreaElement;
    textarea.value = 'test comment';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.debugElement.queryAll(By.css('.actions button'))[1]
        .nativeElement.click();  // Submit button
    fixture.detectChanges();

    expect(mockFeedbackService.sendFeedback)
        .toHaveBeenCalledWith('test-session', 'test-event', {
          direction: 'up',
          comment: 'test comment',
        });
    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeFalsy();
    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[0]
               .nativeElement.textContent)
        .toContain('thumb_up_filled');
  });

  it('should allow submitting negative feedback without details', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
        .nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeTruthy();

    fixture.debugElement.queryAll(By.css('.actions button'))[1]
        .nativeElement.click();  // Submit button
    fixture.detectChanges();

    expect(mockFeedbackService.sendFeedback).toHaveBeenCalledWith(
      'test-session',
      'test-event',
      {
        direction: 'down',
        comment: '',
      }
    );
    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeFalsy();
  });

  it('should hide panel when detailed feedback is cancelled', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
        .nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeTruthy();

    fixture.debugElement.queryAll(By.css('.actions button'))[0]
        .nativeElement.click();  // Cancel button
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.feedback-details-container')))
        .toBeFalsy();
    expect(mockFeedbackService.sendFeedback).not.toHaveBeenCalled();
  });

  it('should highlight "up" button when clicked', () => {
    const upButton =
        fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
            .nativeElement;
    const upIcon = upButton.querySelector('mat-icon')!;
    expect(upIcon.textContent).toContain('thumb_up');
    expect(upIcon.textContent).not.toContain('thumb_up_filled');

    upButton.click();
    fixture.detectChanges();

    expect(upButton.querySelector('mat-icon')!.textContent)
        .toContain('thumb_up_filled');
  });

  it('should highlight "down" button when clicked', () => {
    const downButton =
        fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
            .nativeElement;
    const downIcon = downButton.querySelector('mat-icon')!;
    expect(downIcon.textContent).toContain('thumb_down');
    expect(downIcon.textContent).not.toContain('thumb_down_filled');

    downButton.click();
    fixture.detectChanges();

    expect(downButton.querySelector('mat-icon')!.textContent)
        .toContain('thumb_down_filled');
  });

  it('should remove "down" highlight when cancelled', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
        .nativeElement.click();
    fixture.detectChanges();
    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[1]
               .nativeElement.textContent)
        .toContain('thumb_down_filled');

    fixture.debugElement.queryAll(By.css('.actions button'))[0]
        .nativeElement.click();  // Cancel button
    fixture.detectChanges();

    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[1]
               .nativeElement.textContent)
        .toContain('thumb_down');
    expect(fixture.debugElement
               .queryAll(By.css('.feedback-buttons button mat-icon'))[1]
               .nativeElement.textContent)
        .not.toContain('thumb_down_filled');
  });
  it('should show correct placeholder text based on feedback direction', () => {
    // Click up
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();
    fixture.detectChanges();
    const textarea =
        fixture.debugElement.query(By.css('textarea')).nativeElement as
        HTMLTextAreaElement;
    expect(textarea.placeholder)
        .toBe('Share what you liked about the response');

    // Click down
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[1]
        .nativeElement.click();
    fixture.detectChanges();
    const textareaDown =
        fixture.debugElement.query(By.css('textarea')).nativeElement as
        HTMLTextAreaElement;
    expect(textareaDown.placeholder)
        .toBe('Share what could be improved in the response');
  });

  it('should show optional label in header', () => {
    fixture.debugElement.queryAll(By.css('.feedback-buttons button'))[0]
        .nativeElement.click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.additional-feedback h3'))
               .nativeElement.textContent)
        .toContain('(Optional)');
  });
});
