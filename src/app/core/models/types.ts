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

// TODO: Replace with genai TS types when they're available.
export interface Blob {
  data: string;
}
export interface Part {
  text?: string;
  inlineData?: Blob;
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
}
export interface Event extends LlmResponse {}
