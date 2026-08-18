/**
 * @license
 * Copyright 2026 Google LLC
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

import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-inline-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './inline-edit.component.html',
  styleUrl: './inline-edit.component.scss'
})
export class InlineEditComponent {
  @Input({ required: true }) value = '';
  @Input() displayValue = '';
  @Input() tooltip = '';
  @Input() placeholder = '';
  @Input() textClass = ''; 

  @Output() save = new EventEmitter<string>();

  isEditing = false;
  draftValue = '';

  @ViewChild('editInput') editInput!: ElementRef<HTMLInputElement>;

  startEdit() {
    this.draftValue = this.value;
    this.isEditing = true;
    setTimeout(() => {
      this.editInput.nativeElement.focus();
    });
  }

  cancelEdit() {
    this.isEditing = false;
    this.draftValue = '';
  }

  saveEdit() {
    this.save.emit(this.draftValue);
    this.isEditing = false;
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.saveEdit();
    } else if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }

  get effectiveDisplayValue() {
    return this.displayValue || this.value;
  }
}
