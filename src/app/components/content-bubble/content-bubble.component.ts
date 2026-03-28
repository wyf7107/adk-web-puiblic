import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {JsonTooltipDirective} from '../../directives/html-tooltip.directive';

@Component({
  selector: 'app-content-bubble',
  standalone: true,
  imports: [CommonModule, JsonTooltipDirective],
  templateUrl: './content-bubble.component.html',
  styleUrl: './content-bubble.component.scss',
  host: {
    'class': 'content-bubble-host'
  }
})
export class ContentBubbleComponent {
  @Input() type: 'message' | 'output' | 'transcription' | 'thought' | 'error' = 'message';
  @Input() role: string = 'bot';
  @Input() isHighlighted: boolean = false;
  @Input() evalStatus?: number;
  @Input() outputFor?: any;

}
