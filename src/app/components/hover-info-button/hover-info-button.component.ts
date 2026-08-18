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

import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {JsonTooltipDirective} from '../../directives/html-tooltip.directive';

@Component({
  selector: 'app-hover-info-button',
  templateUrl: './hover-info-button.component.html',
  styleUrl: './hover-info-button.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    JsonTooltipDirective,
  ],
})
export class HoverInfoButtonComponent {
  @Input() icon: string = '';
  @Input() text: string = '';
  @Input() tooltipContent: any = null;
  @Input() tooltipTitle: string = '';
  @Input() disabled: boolean = false;

  @Output() readonly buttonClick = new EventEmitter<MouseEvent>();

  handleClick(event: MouseEvent) {
    this.buttonClick.emit(event);
  }
}
