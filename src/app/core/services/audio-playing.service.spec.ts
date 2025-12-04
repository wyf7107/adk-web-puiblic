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

import {TestBed} from '@angular/core/testing';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it,}

import {initTestBed} from '../../testing/utils';

import {AudioPlayingService} from './audio-playing.service';

describe('AudioPlayingService', () => {
  let service: AudioPlayingService;
  let mockAudioContext: any;

  beforeEach(() => {
    initTestBed();  // required for 1p compat
    mockAudioContext = {
      destination: {},
      createBuffer: jasmine.createSpy('createBuffer').and.returnValue({
        copyToChannel: jasmine.createSpy('copyToChannel'),
        duration: 1,
      }),
      createBufferSource:
          jasmine.createSpy('createBufferSource').and.returnValue({
            connect: jasmine.createSpy('connect'),
            start: jasmine.createSpy('start'),
            buffer: null,
          }),
      currentTime: 0,
    };
    spyOn(window, 'AudioContext').and.returnValue(mockAudioContext);

    TestBed.configureTestingModule({
      providers: [AudioPlayingService],
    });
    service = TestBed.inject(AudioPlayingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  function createMockSource() {
    return jasmine.createSpyObj(
        'AudioBufferSourceNode', ['stop', 'start', 'connect']);
  }

  describe('playAudio', () => {
    it('should not play audio if the buffer is empty', () => {
      spyOn<any>(service, 'playPCM').and.callThrough();
      service.playAudio([]);
      expect((service as any).playPCM).not.toHaveBeenCalled();
    });

    it('should play audio if the buffer is not empty', () => {
      spyOn<any>(service, 'playPCM').and.callThrough();
      const buffer = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
      service.playAudio(buffer);
      expect((service as any).playPCM).toHaveBeenCalled();
    });

    it('should combine the buffers and play the combined audio', () => {
      spyOn<any>(service, 'playPCM').and.callThrough();
      const buffer = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
      const combinedBuffer = new Uint8Array([1, 2, 3, 4]);
      service.playAudio(buffer);
      expect((service as any).playPCM).toHaveBeenCalledWith(combinedBuffer);
    });

    it('should schedule audio sources correctly', () => {
      const buffer = [new Uint8Array([1, 2])];
      const mockSource = createMockSource();
      mockAudioContext.createBufferSource.and.returnValue(mockSource);

      service.playAudio(buffer);

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockSource.start).toHaveBeenCalled();
    });

    it('removes source from schedule after playback finishes', () => {
      const mockSource = createMockSource();
      mockAudioContext.createBufferSource.and.returnValue(mockSource);
      const scheduledAudioSources =
          (service as any).scheduledAudioSources as Set<any>;

      service.playAudio([new Uint8Array([1])]);

      // Assert that the source was added and the onended handler was attached.
      expect(scheduledAudioSources.has(mockSource)).toBeTrue();
      expect((mockSource as any).onended).toEqual(jasmine.any(Function));

      // Simulate the audio finishing by calling the onended handler.
      if ((mockSource as any).onended) {
        (mockSource as any).onended();
      }

      // Assert that the source was removed from the set.
      expect(scheduledAudioSources.has(mockSource)).toBeFalse();
    });
  });

  describe('stopAudio', () => {
    it('should stop all scheduled sources', () => {
      const mockSource1 = createMockSource();
      const mockSource2 = createMockSource();

      mockAudioContext.createBufferSource.and.returnValues(
          mockSource1, mockSource2);

      // Play two audio clips
      service.playAudio([new Uint8Array([1])]);
      service.playAudio([new Uint8Array([2])]);

      service.stopAudio();

      expect(mockSource1.stop).toHaveBeenCalled();
      expect(mockSource2.stop).toHaveBeenCalled();
    });

    it('should reset scheduling time so next audio plays immediately', () => {
      const mockSource1 = createMockSource();
      const mockSource2 = createMockSource();
      mockAudioContext.createBufferSource.and.returnValues(
          mockSource1, mockSource2);

      // Play a long audio clip (duration 1s from mock)
      service.playAudio([new Uint8Array([1])]);

      // Advance time slightly
      mockAudioContext.currentTime = 0.5;

      // Stop audio
      service.stopAudio();

      // Play another clip
      service.playAudio([new Uint8Array([2])]);

      // The second clip should start at current time (0.5), not after the first
      // clip (1.0)
      expect(mockSource2.start).toHaveBeenCalledWith(0.5);
    });
  });
});
