// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {initTestBed} from '../../testing/utils';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvocationMenu } from './invocation-menu';

describe('InvocationMenu', () => {
  let component: InvocationMenu;
  let fixture: ComponentFixture<InvocationMenu>;

  beforeEach(async () => {
    initTestBed();  // required for 1p compat
    await TestBed.configureTestingModule({
      imports: [InvocationMenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvocationMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
