import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-inline-edit',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
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

  startEdit() {
    this.draftValue = this.value;
    this.isEditing = true;
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
