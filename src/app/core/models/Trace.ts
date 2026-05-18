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

// Non-exhaustive union for better autocomplete.
export declare type LogName = 'gen_ai.user.message' | 'gen_ai.choice' | 'gen_ai.system.message' | (string & {});

export declare interface Log {
  body: {[key: string]: any} | string;
  event_name: LogName;
  trace_id: string;
  span_id: string;
}

export declare interface Span {
  name: string;
  start_time: number;
  end_time: number;
  span_id: string;
  parent_span_id?: string;
  trace_id: string;
  attributes?: any;
  children?: Span[];
  invoc_id?: string;
  // For backward compatibility.
  'gcp.vertex.agent.llm_request'?: string;
  'gcp.vertex.agent.llm_response'?: string;

  // Logs recorded inside this Span.
  logs?: Log[];
}

export declare interface EventTelemetry {
  'gcp.vertex.agent.llm_request'?: string;
  'gcp.vertex.agent.llm_response'?: string;

  // Logs captured in a `generate_content` or `execute_tool` span with `gcp.vertex.agent.event_id` attribute equal to this event.
  logs?: Log[];
}

export declare interface SpanNode extends Span {
  children: SpanNode[];
  depth: number;
  duration: number;
  id: string;  // Using span_id as string ID
}

export declare interface TimeTick {
  position: number;
  label: string;
}
