import { Component, input } from '@angular/core';

@Component({
  selector: 'table[app-info-table]',
  imports: [],
  templateUrl: './info-table.html',
  styleUrl: './info-table.scss',
  host: { 'class': 'info-table' }
})
export class InfoTable {
  title = input<string>();
}
