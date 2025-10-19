import {TestBed} from '@angular/core/testing';

import {PendingEventServiceImpl} from './pending-event.service';

describe('PendingEventService', () => {
  let service: PendingEventServiceImpl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PendingEventServiceImpl],
    });
    service = TestBed.inject(PendingEventServiceImpl);
  });

  describe('createFunctionResponse', () => {
    it('should return a correctly formatted function response object', () => {
      const id = 'test-id-123';
      const name = 'testFunction';
      const response = {'result': 'success', 'data': 42};

      const expected = {
        'function_response': {
          id,
          name,
          'response': {'response': response},
        },
      };

      const result = service.createFunctionResponse(id, name, response);
      expect(result).toEqual(expected);
    });

    it('should handle empty response objects', () => {
      const id = 'empty-id';
      const name = 'emptyFunction';
      const response = {};

      const expected = {
        'function_response': {
          id,
          name,
          'response': {'response': {}},
        },
      };

      const result = service.createFunctionResponse(id, name, response);
      expect(result).toEqual(expected);
    });
  });
});
