import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private snackBar = inject(MatSnackBar);
  private readonly MAX_LENGTH = 200;

  open(message: string, action?: string, config?: MatSnackBarConfig) {
    const truncatedMessage = this.truncate(message, this.MAX_LENGTH);
    return this.snackBar.open(truncatedMessage, action, config);
  }

  private truncate(text: string, limit: number): string {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  }
}
