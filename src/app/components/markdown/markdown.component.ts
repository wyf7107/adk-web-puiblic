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

import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, input, ElementRef, effect, OnInit} from '@angular/core';
import {MarkdownModule, provideMarkdown} from 'ngx-markdown';
import mermaid from 'mermaid';

import 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-yaml';


/**
 * Renders markdown text.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-markdown',
  templateUrl: './markdown.component.html',
  standalone: true,
  imports: [
    CommonModule,
    MarkdownModule,
  ],
  providers: [
    provideMarkdown(),
  ],
  styles: [`
    .mermaid-container {
      display: flex;
      justify-content: center;
      margin: 16px 0;
    }
    .mermaid {
      font-size: 12px !important;
    }
    .mermaid svg {
      max-width: 100%;
      height: auto;
    }
    .mermaid .node rect,
    .mermaid .node circle,
    .mermaid .node ellipse,
    .mermaid .node polygon,
    .mermaid .node path {
      stroke-width: 1px;
    }
  `]
})
export class MarkdownComponent implements OnInit {
  text = input('');
  thought = input(false);

  constructor(private elementRef: ElementRef) {
    effect(() => {
      const _ = this.text();
      setTimeout(() => {
        this.renderMermaid();
      }, 100);
    });
  }

  ngOnInit() {
    mermaid.initialize({
      startOnLoad: false,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      theme: 'neutral',
      themeVariables: {
        fontSize: '12px',
        primaryColor: '#e8f0fe',
        primaryTextColor: '#1a73e8',
        primaryBorderColor: '#1a73e8',
        lineColor: '#5f6368',
        secondaryColor: '#f1f3f4',
        tertiaryColor: '#ffffff',
      }
    });
  }

  private renderMermaid() {
    const container = this.elementRef.nativeElement;
    const codeElements = container.querySelectorAll('pre code.language-mermaid');
    
    let needsRun = false;
    codeElements.forEach((codeEl: HTMLElement) => {
      const preEl = codeEl.parentElement;
      if (preEl) {
        const graphDefinition = codeEl.textContent || '';
        const div = document.createElement('div');
        div.classList.add('mermaid');
        div.textContent = graphDefinition.trim();
        
        const wrapper = document.createElement('div');
        wrapper.classList.add('mermaid-container');
        wrapper.appendChild(div);
        
        preEl.parentNode?.replaceChild(wrapper, preEl);
        needsRun = true;
      }
    });
    
    if (needsRun) {
      mermaid.run();
    }
  }
}
