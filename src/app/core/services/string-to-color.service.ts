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

import { Injectable, InjectionToken } from '@angular/core';
import { StringToColorService as StringToColorServiceInterface } from './interfaces/string-to-color';

/**
 * Service to convert a string to a color.
 */
@Injectable({
  providedIn: 'root',
})
export class StringToColorServiceImpl implements StringToColorServiceInterface {
  /**
   * Converts a string to a color, e.g. 'my string' -> '#8c8526ff'.
   */
  stc(str: string): string {
    const hash = this.hashCode(str);
    const h = Math.abs(hash % 360);
    const s = 60 + Math.abs((hash >> 8) % 40);
    const l = 40 + Math.abs((hash >> 16) % 30);

    return this.hslToHex(h, s, l);
  }

  /**
   * Simple hash function to generate a numeric hash from a string with good distribution
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
      let chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash = hash + i * 31;
      hash |= 0;
    }
    return hash;
  }

  /**
   * Converts HSL values to a HEX color string
   */
  private hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}ff`;
  }
}
