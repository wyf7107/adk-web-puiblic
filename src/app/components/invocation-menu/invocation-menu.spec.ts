import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvocationMenu } from './invocation-menu';

describe('InvocationMenu', () => {
  let component: InvocationMenu;
  let fixture: ComponentFixture<InvocationMenu>;

  beforeEach(async () => {
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
