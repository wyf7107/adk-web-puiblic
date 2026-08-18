// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {initTestBed} from '../../testing/utils';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoTable } from './info-table';

describe('InfoTable', () => {
  let component: InfoTable;
  let fixture: ComponentFixture<InfoTable>;

  beforeEach(async () => {
    initTestBed();  // required for 1p compat
    await TestBed.configureTestingModule({
      imports: [InfoTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
