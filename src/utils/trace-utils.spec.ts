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

// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import { normalizeSpan, normalizeEventTelemetry } from './trace-utils';
import { Span, EventTelemetry, Log } from '../app/core/models/Trace';

describe('trace-utils', () => {
  describe('normalizeSpan', () => {
    it('should keep existing llm_request and llm_response', () => {
      const span: Span = {
        name: 'test',
        start_time: 0,
        end_time: 100,
        span_id: 's1',
        trace_id: 't1',
        attributes: {
          'gcp.vertex.agent.llm_request': 'existing request',
          'gcp.vertex.agent.llm_response': 'existing response',
        }
      };
      const normalized = normalizeSpan(span);
      expect(normalized.attributes['gcp.vertex.agent.llm_request']).toBe('existing request');
      expect(normalized.attributes['gcp.vertex.agent.llm_response']).toBe('existing response');
    });

    it('should extract input and output for execute_tool spans from attributes', () => {
      const span: Span = {
        name: 'execute_tool_something',
        start_time: 0,
        end_time: 100,
        span_id: 's1',
        trace_id: 't1',
        attributes: {
          'gcp.vertex.agent.tool_call_args': '{"arg": "val"}',
          'gcp.vertex.agent.tool_response': '{"result": "ok"}'
        }
      };
      const normalized = normalizeSpan(span);
      expect(normalized.attributes['gcp.vertex.agent.llm_request']).toBe('{"arg": "val"}');
      expect(normalized.attributes['gcp.vertex.agent.llm_response']).toBe('{"result": "ok"}');
    });

    it('should extract input from logs for non-execute_tool spans', () => {
      const logs: Log[] = [
        {
          event_name: 'gen_ai.system.message',
          body: JSON.stringify({ role: 'system', content: 'system instructions' }),
          trace_id: 't1',
          span_id: 's1'
        },
        {
          event_name: 'gen_ai.user.message',
          body: JSON.stringify({ content: { parts: [{ text: 'hello' }] } }),
          trace_id: 't1',
          span_id: 's1'
        }
      ];
      const span: Span = {
        name: 'generate_content',
        start_time: 0,
        end_time: 100,
        span_id: 's1',
        trace_id: 't1',
        logs: logs,
        attributes: {}
      };
      const normalized = normalizeSpan(span);
      const userMessage = JSON.parse(normalized.attributes['gcp.vertex.agent.llm_request']!);
      expect(userMessage).toEqual({ contents: [{ role: 'user', parts: [{ text: 'hello' }] }] });
    });

    it('should ignore user messages with function responses', () => {
      const logs: Log[] = [{
        event_name: 'gen_ai.user.message',
        body: JSON.stringify({
          content: {parts: [{functionResponse: {name: 'foo', response: {}}}]}
        }),
        trace_id: 't1',
        span_id: 's1'
      }];
      const span: Span = {
        name: 'generate_content',
        start_time: 0,
        end_time: 100,
        span_id: 's1',
        trace_id: 't1',
        logs: logs,
        attributes: {}
      };
      const normalized = normalizeSpan(span);
      expect('gcp.vertex.agent.llm_request' in normalized.attributes)
          .toBeFalse();
    });

    it('should extract output from logs for non-execute_tool spans', () => {
      const logs: Log[] = [
        {
          event_name: 'gen_ai.choice',
          body: 'model response',
          trace_id: 't1',
          span_id: 's1'
        }
      ];
      const span: Span = {
        name: 'generate_content',
        start_time: 0,
        end_time: 100,
        span_id: 's1',
        trace_id: 't1',
        logs: logs,
        attributes: {}
      };
      const normalized = normalizeSpan(span);
      expect(normalized.attributes['gcp.vertex.agent.llm_response']).toBe('model response');
    });

    it('should handle missing logs gracefully', () => {
      const span: Span = {
        name: 'generate_content',
        start_time: 0,
        end_time: 100,
        span_id: 's1',
        trace_id: 't1',
        attributes: {}
      };
      const normalized = normalizeSpan(span);
      expect('gcp.vertex.agent.llm_request' in normalized.attributes)
          .toBeFalse();
      expect('gcp.vertex.agent.llm_response' in normalized.attributes)
          .toBeFalse();
    });

    it('should handle missing attributes gracefully', () => {
      const span: Span = {
        name: 'generate_content',
        start_time: 0,
        end_time: 100,
        span_id: 's1',
        trace_id: 't1',
        logs: []
      };
      const normalized = normalizeSpan(span);
      expect('gcp.vertex.agent.llm_request' in normalized.attributes)
          .toBeFalse();
      expect('gcp.vertex.agent.llm_response' in normalized.attributes)
          .toBeFalse();
    });
  });

  describe('normalizeEventTelemetry', () => {
    it('should keep existing llm_request and llm_response', () => {
      const telemetry: EventTelemetry = {
        'gcp.vertex.agent.llm_request': 'existing request',
        'gcp.vertex.agent.llm_response': 'existing response',
      };
      const normalized = normalizeEventTelemetry(telemetry);
      expect(normalized['gcp.vertex.agent.llm_request']).toBe('existing request');
      expect(normalized['gcp.vertex.agent.llm_response']).toBe('existing response');
    });

    it('should extract input and output from telemetry properties if present', () => {
      const telemetry: any = {
        'gcp.vertex.agent.tool_call_args': '{"arg": "val"}',
        'gcp.vertex.agent.tool_response': '{"result": "ok"}'
      };
      const normalized = normalizeEventTelemetry(telemetry);
      expect(normalized['gcp.vertex.agent.llm_request']).toBe('{"arg": "val"}');
      expect(normalized['gcp.vertex.agent.llm_response']).toBe('{"result": "ok"}');
    });

    it('should extract from logs if attributes are missing', () => {
      const logs: Log[] = [
        {
          event_name: 'gen_ai.choice',
          body: 'log response',
          trace_id: 't1',
          span_id: 's1'
        }
      ];
      const telemetry: EventTelemetry = {
        logs: logs
      };
      const normalized = normalizeEventTelemetry(telemetry);
      expect(normalized['gcp.vertex.agent.llm_response']).toBe('log response');
    });
  });
});
