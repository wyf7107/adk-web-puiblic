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
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgxJsonViewerModule } from 'ngx-json-viewer';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-json-tooltip',
  template: `
    <div class="tooltip-shell">
      @if (title) {
        <div class="tooltip-title">{{ title }}</div>
      }
      <div class="tooltip-content">
        <ngx-json-viewer [json]="parsedJson" [expanded]="true"></ngx-json-viewer>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-size: 12px;
      line-height: 1.4;
      word-break: break-word;
      overflow: hidden;
    }
    .tooltip-shell {
      display: flex;
      flex-direction: column;
      max-width: 800px;
      max-height: 80vh;
      overflow: hidden;
    }
    .tooltip-content {
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
    }
    .tooltip-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-weight: 500;
      font-size: 10px;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(138, 180, 248, 0.3);
      color: rgba(138, 180, 248, 0.9);
      text-transform: uppercase;
      position: sticky;
      top: 0;
      background: inherit;
      z-index: 1;
    }
    ngx-json-viewer {
      display: block;
      height: auto !important;
      min-width: 0;
    }
  `],
  standalone: true,
  imports: [NgxJsonViewerModule],
})
export class JsonTooltipComponent {
  @Input() title: string = '';
  @Input() set json(value: any) {
    if (typeof value === 'string') {
      try {
        this.parsedJson = JSON.parse(value);
      } catch (e) {
        // If not valid JSON, display as string
        this.parsedJson = value;
      }
    } else {
      this.parsedJson = value;
    }
  }

  parsedJson: any = {};
}
