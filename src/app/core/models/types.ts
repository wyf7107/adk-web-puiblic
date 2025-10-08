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

// ADK Event types, see: https://github.com/google/adk-python/blob/632bf8b0bcf18ff4e4505e4e5f4c626510f366a2/src/google/adk/events/event.py#L30
// TODO: Replace with genai TS types when they're available.
export interface Blob {
  mimeType?: string;
  data: string;
}

export interface FunctionCall {
  name: string;
  args: {[key: string]: any};
}

export interface FunctionResponse {
  name: string;
  response: {[key: string]: any};
}

export interface FileData {
  mimeType: string;
  fileUri: string;
}

export interface Part {
  text?: string;
  inlineData?: Blob;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
  fileData?: FileData;
}

export interface GenAiContent {
  role: string;
  parts: Part[];
}

export interface LlmRequest {
  contents: GenAiContent[];
}

export interface LlmResponse {
  content: GenAiContent;
  error?: string;
  errorMessage?: string;
  longRunningToolIds?: string[];
}

export interface EventActions {
  message?: string;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
  finishReason?: string;
}

export interface Event extends LlmResponse {
  id?: string;
  author?: string
  invocationId?: string;
  actions?: EventActions;
  longRunningToolIds?: string[];
  branch?: string;
  timestamp?: number;
}
