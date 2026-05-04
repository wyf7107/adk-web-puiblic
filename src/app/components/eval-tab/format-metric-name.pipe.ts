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
