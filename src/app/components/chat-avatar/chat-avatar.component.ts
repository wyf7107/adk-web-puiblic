import {CommonModule} from '@angular/common';
import {Component, Input, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {JsonTooltipDirective} from '../../directives/html-tooltip.directive';
import {THEME_SERVICE} from '../../core/services/interfaces/theme';
import {STRING_TO_COLOR_SERVICE} from '../../core/services/interfaces/string-to-color';

@Component({
  selector: 'app-chat-avatar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, JsonTooltipDirective],
  templateUrl: './chat-avatar.component.html',
  styleUrl: './chat-avatar.component.scss'
})
export class ChatAvatarComponent {
  @Input() role: 'user' | 'bot' | 'node' = 'user';
  @Input() author: string = '';
  @Input() nodePath: string | null = '';

  private readonly themeService = inject(THEME_SERVICE);
  private readonly stringToColorService = inject(STRING_TO_COLOR_SERVICE);

  get tooltip(): string {
    if (this.role === 'user') return '';
    
    const tooltipObj: any = { 
      author: this.author, 
      nodePath: this.nodePath || '' 
    };

    return JSON.stringify(tooltipObj, null, 2);
  }

  get color(): string {
    const nodeName = this.getNodeName(this.nodePath || '');
    const theme = this.themeService.currentTheme();
    return this.stringToColorService.stc(nodeName, theme);
  }

  get initial(): string {
    const nodeName = this.getNodeName(this.nodePath || '');
    const initialMatch = nodeName.match(/[A-Za-z0-9]/);
    return initialMatch ? initialMatch[0].toUpperCase() : 'N';
  }

  private getNodeName(nodePath: string): string {
    return nodePath.split(/[/.>]/).filter(Boolean).pop() || nodePath;
  }
}
