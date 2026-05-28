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

/**
 * Validators and types for the *experimental* OpenTelemetry GenAI semantic
 * conventions — i.e. the structured span attributes emitted by the Python ADK
 * from `google.adk.telemetry._experimental_semconv` (`gen_ai.input.messages`,
 * `gen_ai.output.messages`, `gen_ai.system_instructions`,
 * `gen_ai.tool.definitions`, etc.).
 *
 * This module is private to `src/app/core/models/trace/`. Public symbols are
 * re-exported from `Trace.ts`.
 */

import { z } from 'zod';

import { jsonStringOr } from './Shared';

// ---------------------------------------------------------------------------
// Attribute name constants — mirror the OTel incubating GenAI attributes used
// by google.adk.telemetry._experimental_semconv.
// ---------------------------------------------------------------------------

export const GEN_AI_INPUT_MESSAGES = 'gen_ai.input.messages';
export const GEN_AI_OUTPUT_MESSAGES = 'gen_ai.output.messages';
export const GEN_AI_SYSTEM_INSTRUCTIONS = 'gen_ai.system_instructions';
export const GEN_AI_TOOL_DEFINITIONS = 'gen_ai.tool.definitions';
export const GEN_AI_RESPONSE_FINISH_REASONS =
    'gen_ai.response.finish_reasons';
export const GEN_AI_USAGE_INPUT_TOKENS = 'gen_ai.usage.input_tokens';
export const GEN_AI_USAGE_OUTPUT_TOKENS = 'gen_ai.usage.output_tokens';

export const FUNCTION_TOOL_DEFINITION_TYPE = 'function';

// ---------------------------------------------------------------------------
// Log event names — mirror constants in
// google.adk.telemetry._experimental_semconv.
// ---------------------------------------------------------------------------

export const GEN_AI_COMPLETION_DETAILS_EVENT =
    'gen_ai.client.inference.operation.details';

// ---------------------------------------------------------------------------
// Part validators (mirror Section A TypedDicts in
// google.adk.telemetry._experimental_semconv).
// ---------------------------------------------------------------------------

const TextPartValidator = z.object({
  type: z.literal('text'),
  content: z.string(),
});

const BlobPartValidator = z.object({
  type: z.literal('blob'),
  mime_type: z.string(),
  // Python types this as `bytes`. After JSON serialization it could be a
  // base64 string, an array of integers, or null. Stay lenient.
  data: z.any(),
});

const FileDataPartValidator = z.object({
  type: z.literal('file_data'),
  mime_type: z.string(),
  uri: z.string(),
});

const ToolCallPartValidator = z.object({
  type: z.literal('tool_call'),
  id: z.string().nullable().optional(),
  name: z.string(),
  arguments: z.record(z.string(), z.any()).nullable().optional(),
});

const ToolCallResponsePartValidator = z.object({
  type: z.literal('tool_call_response'),
  id: z.string().nullable().optional(),
  response: z.record(z.string(), z.any()).nullable().optional(),
});

/**
 * Discriminated union of the experimental Part shapes. Validation routes on
 * the `type` literal.
 */
export const PartValidator = z.discriminatedUnion('type', [
  TextPartValidator,
  BlobPartValidator,
  FileDataPartValidator,
  ToolCallPartValidator,
  ToolCallResponsePartValidator,
]);

// ---------------------------------------------------------------------------
// Message validators
// ---------------------------------------------------------------------------

export const InputMessageValidator = z.object({
  role: z.string(),
  parts: z.array(PartValidator),
});

export const OutputMessageValidator = z.object({
  role: z.string(),
  parts: z.array(PartValidator),
  finish_reason: z.string(),
});

// ---------------------------------------------------------------------------
// Tool definition validators
// ---------------------------------------------------------------------------

const FunctionToolDefinitionValidator = z.object({
  type: z.literal(FUNCTION_TOOL_DEFINITION_TYPE),
  name: z.string(),
  description: z.string().nullable().optional(),
  parameters: z.record(z.string(), z.any()).nullable().optional(),
});

const GenericToolDefinitionValidator = z.object({
  name: z.string(),
  type: z.string(),
});

/**
 * Tool definition: either a `FunctionToolDefinition` (when `type === 'function'`)
 * or a generic shape. Zod tries variants in order, so the function shape is
 * preferred when applicable.
 */
export const ToolDefinitionValidator = z.union([
  FunctionToolDefinitionValidator,
  GenericToolDefinitionValidator,
]);

// ---------------------------------------------------------------------------
// Span-attribute validators (used by Trace.ts to validate the values found
// in `span.attributes`). Each entry accepts either the parsed array form OR a
// JSON string, because Python ADK serializes these via
// `_safe_json_serialize_no_whitespaces` (see
// `_experimental_semconv.py:_build_completion_span_attributes`).
// ---------------------------------------------------------------------------

export const InputMessagesAttrValidator =
    jsonStringOr(z.array(InputMessageValidator));

export const OutputMessagesAttrValidator =
    jsonStringOr(z.array(OutputMessageValidator));

export const SystemInstructionsAttrValidator =
    jsonStringOr(z.array(PartValidator));

export const ToolDefinitionsAttrValidator =
    jsonStringOr(z.array(ToolDefinitionValidator));

export const ResponseFinishReasonsAttrValidator = z.array(z.string());

export const UsageTokensAttrValidator = z.number();

// ---------------------------------------------------------------------------
// Completion-details log event (experimental semconv).
//
// Unlike the *stable* GenAI log events (system/user/choice), the experimental
// completion-details event carries its payload on the log record's
// `attributes` rather than its `body`. Each attribute mirrors the
// corresponding span attribute and is validated using the same per-attribute
// validators above.
//
// All payload attributes are optional — the Python ADK omits attributes
// whose source data wasn't available (e.g. `gen_ai.tool.definitions` is
// absent when the request had no tools).
// ---------------------------------------------------------------------------

export const CompletionDetailsLogAttributesValidator = z.object({
  [GEN_AI_INPUT_MESSAGES]: InputMessagesAttrValidator.optional(),
  [GEN_AI_OUTPUT_MESSAGES]: OutputMessagesAttrValidator.optional(),
  [GEN_AI_SYSTEM_INSTRUCTIONS]: SystemInstructionsAttrValidator.optional(),
  [GEN_AI_TOOL_DEFINITIONS]: ToolDefinitionsAttrValidator.optional(),
  [GEN_AI_RESPONSE_FINISH_REASONS]:
      ResponseFinishReasonsAttrValidator.optional(),
  [GEN_AI_USAGE_INPUT_TOKENS]: UsageTokensAttrValidator.optional(),
  [GEN_AI_USAGE_OUTPUT_TOKENS]: UsageTokensAttrValidator.optional(),
}).loose();  // Unknown common attributes (e.g. `gen_ai.agent.name`,
             // `gcp.vertex.agent.event_id`) are allowed through unchanged.

export const CompletionDetailsLogValidator = z.object({
  event_name: z.literal(GEN_AI_COMPLETION_DETAILS_EVENT),
  // Python emits this log with no body — only attributes.
  body: z.unknown().optional(),
  attributes: CompletionDetailsLogAttributesValidator.optional(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type Part = z.infer<typeof PartValidator>;
export type InputMessage = z.infer<typeof InputMessageValidator>;
export type OutputMessage = z.infer<typeof OutputMessageValidator>;
export type FunctionToolDefinition =
    z.infer<typeof FunctionToolDefinitionValidator>;
export type GenericToolDefinition =
    z.infer<typeof GenericToolDefinitionValidator>;
export type ToolDefinition = z.infer<typeof ToolDefinitionValidator>;
export type CompletionDetailsLog =
    z.infer<typeof CompletionDetailsLogValidator>;
