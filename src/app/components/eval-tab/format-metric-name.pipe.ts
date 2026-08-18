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

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatMetricName',
  standalone: true
})
export class FormatMetricNamePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    
    // Remove suffixes like '_score', 'avg_score', '_avg_score'
    let result = value.replace(/(_avg_score|_score|avg_score)$/, '');
    
    // Replace _ with space
    result = result.replace(/_/g, ' ');
    
    // Title case
    return result
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
