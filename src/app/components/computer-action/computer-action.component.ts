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
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';

import {ComputerUseClickCall, ComputerUsePayload, isComputerUseResponse, isVisibleComputerUseClick} from '../../core/models/ComputerUse';
import type {FunctionCall, FunctionResponse} from '../../core/models/types';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-computer-action',
  templateUrl: './computer-action.component.html',
  styleUrl: './computer-action.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
  ],
})
export class ComputerActionComponent {
  @Input() functionCall?: FunctionCall;
  @Input() functionResponse?: FunctionResponse;
  @Input() allMessages: Array<{functionResponses?: FunctionResponse[], functionCalls?: FunctionCall[]}> = [];
  @Input() index: number = 0;
  @Output() readonly clickEvent = new EventEmitter<number>();
  @Output() readonly openImage = new EventEmitter<{images: string[], currentIndex: number, urls?: string[], coordinates?: ({x: number, y: number} | null)[]}>();
  imageDimensions = new Map < number, {
    width: number;
    height: number
  }
  >();
  // ADK Computer uses a 1000x1000 virtual coordinate space.
  private readonly VIRTUAL_WIDTH = 1000;
  private readonly VIRTUAL_HEIGHT = 1000;

  isComputerUseResponse(): this is {
    functionResponse: FunctionResponse & {response: ComputerUsePayload}
  } {
    return !!this.functionResponse && isComputerUseResponse(this.functionResponse);
  }

  isComputerUseClick(): this is {functionCall: ComputerUseClickCall} {
    return !!this.functionCall && isVisibleComputerUseClick(this.functionCall);
  }

  getComputerUseScreenshot(): string {
    return this.getScreenshotFromPayload(
        this.functionResponse?.response as ComputerUsePayload);
  }

  getComputerUseUrl(): string {
    if (!this.isComputerUseResponse()) return '';
    const response = this.functionResponse?.response as ComputerUsePayload;
    return response.url || '';
  }

  getPreviousComputerUseScreenshot(): string {
    for (let i = this.index - 1; i >= 0; i--) {
      const msg = this.allMessages[i];
      if (this.isMsgComputerUseResponse(msg)) {
        if (msg.functionResponses && msg.functionResponses.length > 0) {
          // Iterate backwards through responses in this message to find the latest screenshot
          for (let j = msg.functionResponses.length - 1; j >= 0; j--) {
            const resp = msg.functionResponses[j];
            if (isComputerUseResponse(resp)) {
               const payload = resp.response as ComputerUsePayload;
               return this.getScreenshotFromPayload(payload);
            }
            
            // Fallback: check if the response has parts with inlineData
            const parts = (resp as any)['parts'];
            if (Array.isArray(parts)) {
              for (let k = parts.length - 1; k >= 0; k--) {
                const p = parts[k];
                if (p.inlineData?.mimeType?.startsWith('image/') && p.inlineData.data) {
                  const mimeType = p.inlineData.mimeType;
                  const data = p.inlineData.data.replace(/-/g, '+').replace(/_/g, '/');
                  return `data:${mimeType};base64,${data}`;
                }
              }
            }
          }
        }
      }
    }
    return '';
  }

  getNextComputerUseScreenshot(): string {
    for (let i = this.index + 1; i < this.allMessages.length; i++) {
      const msg = this.allMessages[i];
      if (this.isMsgComputerUseResponse(msg)) {
        if (msg.functionResponses && msg.functionResponses.length > 0) {
          for (let j = 0; j < msg.functionResponses.length; j++) {
            const resp = msg.functionResponses[j];
            if (isComputerUseResponse(resp)) {
               const payload = resp.response as ComputerUsePayload;
               return this.getScreenshotFromPayload(payload);
            }
            
            const parts = (resp as any)['parts'];
            if (Array.isArray(parts)) {
              for (let k = 0; k < parts.length; k++) {
                const p = parts[k];
                if (p.inlineData?.mimeType?.startsWith('image/') && p.inlineData.data) {
                  const mimeType = p.inlineData.mimeType;
                  const data = p.inlineData.data.replace(/-/g, '+').replace(/_/g, '/');
                  return `data:${mimeType};base64,${data}`;
                }
              }
            }
          }
        }
      }
    }
    return '';
  }

  getActionName(): string {
    if (!this.functionCall) return '';
    const name = this.functionCall.name;
    if (name === 'computer') {
      return this.functionCall.args?.['action'] || name;
    }
    return name;
  }

  getClickCoordinates(call: FunctionCall | undefined = this.functionCall): {x: number; y: number}|null {
    if (!call || !isVisibleComputerUseClick(call)) return null;
    const args = call.args;
    if (!args) return null;
    if (args['coordinate']) {
      return {
        x: Number(args['coordinate'][0]),
        y: Number(args['coordinate'][1]),
      };
    }
    if (args['x'] != null && args['y'] != null) {
      return {x: Number(args['x']), y: Number(args['y'])};
    }
    return null;
  }

  getActualPixelCoordinates(): {x: number; y: number; isVirtual: boolean}|null {
    const coords = this.getClickCoordinates();
    if (!coords) return null;
    const dims = this.imageDimensions.get(this.index);
    if (!dims) {
      return {...coords, isVirtual: true};
    }
    return {
      x: Math.round((coords.x / this.VIRTUAL_WIDTH) * dims.width),
      y: Math.round((coords.y / this.VIRTUAL_HEIGHT) * dims.height),
      isVirtual: false,
    };
  }

  getClickBoxStyle(): {[key: string]: string} {
    const coords = this.getClickCoordinates();
    if (!coords) {
      return {display: 'none'};
    }
    const leftPercent = (coords.x / this.VIRTUAL_WIDTH) * 100;
    const topPercent = (coords.y / this.VIRTUAL_HEIGHT) * 100;
    return {
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
    };
  }

  onImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
      this.imageDimensions.set(this.index, {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    }
  }

  private isMsgComputerUseResponse(message: {functionResponses?: FunctionResponse[]}): boolean {
    if (message.functionResponses && message.functionResponses.length > 0) {
        return message.functionResponses.some((resp: FunctionResponse) => {
          if (isComputerUseResponse(resp)) return true;
          
          const parts = (resp as any)['parts'];
          if (Array.isArray(parts)) {
            return parts.some(p => p.inlineData?.mimeType?.startsWith('image/'));
          }
          return false;
        });
    }
    return false;
  }

  private getScreenshotFromPayload(payload: ComputerUsePayload|undefined):
      string {
    const imageInfo = payload?.image;
    if (!imageInfo?.data) return '';
    const screenshot = imageInfo.data;
    if (screenshot.startsWith('data:')) return screenshot;
    const mimeType = imageInfo.mimetype || 'image/png';
    return `data:${mimeType};base64,${screenshot}`;
  }

  getAllComputerUseScreenshots(): string[] {
    const screenshots: string[] = [];
    for (const msg of this.allMessages) {
      if (this.isMsgComputerUseResponse(msg)) {
        if (msg.functionResponses) {
          for (const resp of msg.functionResponses) {
            if (isComputerUseResponse(resp)) {
              const payload = resp.response as ComputerUsePayload;
              screenshots.push(this.getScreenshotFromPayload(payload));
            }
            
            const parts = (resp as any)['parts'];
            if (Array.isArray(parts)) {
              for (const p of parts) {
                if (p.inlineData?.mimeType?.startsWith('image/') && p.inlineData.data) {
                  const mimeType = p.inlineData.mimeType;
                  const data = p.inlineData.data.replace(/-/g, '+').replace(/_/g, '/');
                  screenshots.push(`data:${mimeType};base64,${data}`);
                }
              }
            }
          }
        }
      }
    }
    return screenshots;
  }

  getAllComputerUseUrls(): string[] {
    const urls: string[] = [];
    let lastKnownUrl = '';
    for (const msg of this.allMessages) {
      if (this.isMsgComputerUseResponse(msg)) {
        if (msg.functionResponses) {
          for (const resp of msg.functionResponses) {
            const url = (resp.response as any)?.url;
            if (url) {
              lastKnownUrl = url;
            }

            if (isComputerUseResponse(resp)) {
              urls.push(lastKnownUrl);
            }
            
            const parts = (resp as any)['parts'];
            if (Array.isArray(parts)) {
              for (const p of parts) {
                if (p.inlineData?.mimeType?.startsWith('image/') && p.inlineData.data) {
                  urls.push(lastKnownUrl);
                }
              }
            }
          }
        }
      }
    }
    return urls;
  }

  getAllComputerUseCoordinates(): ({x: number, y: number} | null)[] {
    const coords: ({x: number, y: number} | null)[] = [];
    let lastCall: any = null;
    
    for (const msg of this.allMessages) {
      const functionCalls = (msg as any)['functionCalls'];
      if (Array.isArray(functionCalls)) {
        for (const call of functionCalls) {
          if (isVisibleComputerUseClick(call)) {
            lastCall = call;
          } else if (call.name === 'computer') {
            lastCall = null;
          }
        }
      }
      
      if (this.isMsgComputerUseResponse(msg)) {
        if (msg.functionResponses) {
          for (const resp of msg.functionResponses) {
            let foundImage = false;
            
            if (isComputerUseResponse(resp)) {
              foundImage = true;
            }
            
            const parts = (resp as any)['parts'];
            if (Array.isArray(parts)) {
              for (const p of parts) {
                if (p.inlineData?.mimeType?.startsWith('image/') && p.inlineData.data) {
                  foundImage = true;
                }
              }
            }
            
            if (foundImage) {
              if (lastCall && coords.length > 0) {
                coords[coords.length - 1] = this.getClickCoordinates(lastCall);
              }
              coords.push(null);
            }
          }
        }
      }
    }
    return coords;
  }

  openImageViewer(currentScreenshot: string): void {
    const images = this.getAllComputerUseScreenshots();
    const urls = this.getAllComputerUseUrls();
    const coordinates = this.getAllComputerUseCoordinates();
    const currentIndex = images.indexOf(currentScreenshot);
    this.openImage.emit({images, currentIndex, urls, coordinates});
  }
}
