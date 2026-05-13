// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {initTestBed} from '../../testing/utils';
import { TestBed } from '@angular/core/testing';
import { SnackbarService } from './snackbar.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('SnackbarService', () => {
  let service: SnackbarService;
  let mockMatSnackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    mockMatSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    initTestBed();  // required for 1p compat
    TestBed.configureTestingModule({
      providers: [
        SnackbarService,
        { provide: MatSnackBar, useValue: mockMatSnackBar }
      ]
    });
    service = TestBed.inject(SnackbarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should truncate long messages', () => {
    const longMessage = 'a'.repeat(300);
    service.open(longMessage);
    expect(mockMatSnackBar.open).toHaveBeenCalledWith('a'.repeat(250) + '...', undefined, undefined);
  });

  it('should not truncate short messages', () => {
    const shortMessage = 'short message';
    service.open(shortMessage);
    expect(mockMatSnackBar.open).toHaveBeenCalledWith(shortMessage, undefined, undefined);
  });
});
