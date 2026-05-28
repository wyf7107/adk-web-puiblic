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
 * Validators and types for the *stable* OpenTelemetry GenAI semantic
 * conventions — i.e. the `gen_ai.system.message`, `gen_ai.user.message`, and
 * `gen_ai.choice` log events emitted by the Python ADK from
 * `google.adk.telemetry._stable_semconv`.
 *
 * This module is private to `src/app/core/models/trace/`. Public symbols are
 * re-exported from `Trace.ts`.
 */

import { z } from 'zod';

import { jsonStringSchema, withStrippedNulls } from './Shared';

// ---------------------------------------------------------------------------
// Event names — mirror constants in
// google.adk.telemetry._stable_semconv.
// ---------------------------------------------------------------------------

export const GEN_AI_SYSTEM_MESSAGE_EVENT = 'gen_ai.system.message';
export const GEN_AI_USER_MESSAGE_EVENT = 'gen_ai.user.message';
export const GEN_AI_CHOICE_EVENT = 'gen_ai.choice';

// ---------------------------------------------------------------------------
// Body validators
// ---------------------------------------------------------------------------

const FunctionCallValidator = withStrippedNulls(z.object({
  id: z.string().nullable().optional(),
  name: z.string(),
  args: z.record(z.string(), z.any()),
  needsResponse: z.boolean().nullable().optional(),
}));

const FunctionResponseValidator = withStrippedNulls(z.object({
  id: z.string().nullable().optional(),
  name: z.string(),
  response: z.record(z.string(), z.any()),
}));

// This includes only the most common GenAI parts.
// Extra GenAI parts emitted, will not issue an error.
// If ADK Web needs to have type-safe access any of these, extend it.
const GenAIPartValidator = withStrippedNulls(z.object({
  text: z.string().nullable().optional(),
  function_call: FunctionCallValidator.nullable().optional(),
  function_response: FunctionResponseValidator.nullable().optional(),
}));

const GenAIContentValidator = z.object({
  parts: z.array(GenAIPartValidator),
  role: z.string(),
});

const GenAILogBodyValidator = z.object({
  content: z.object({
    parts: z.array(GenAIPartValidator),
    role: z.string().optional(),
  }),
  role: z.string().optional(),
}).transform((logBody) => {
  // Coherce role to be present on the content
  const content = { ...logBody.content };
  if (logBody.role !== undefined) {
    content.role = logBody.role;
  }
  return {
    content: content,
  };
}).pipe(z.object({
  content: GenAIContentValidator,
}));

const GenAISystemMessageBodyValidator = z.object({
  content: z.string(),
});

export const PromptResponseLogValidator = z.object({
  event_name: z.enum([GEN_AI_USER_MESSAGE_EVENT, GEN_AI_CHOICE_EVENT]),
  body: z.union([
    GenAILogBodyValidator,
    jsonStringSchema.pipe(GenAILogBodyValidator),
  ]),
});

export const SystemMessageLogValidator = z.object({
  event_name: z.literal(GEN_AI_SYSTEM_MESSAGE_EVENT),
  body: GenAISystemMessageBodyValidator,
});

export const LogValidator = z.union([
  SystemMessageLogValidator,
  PromptResponseLogValidator,
]);

// ---------------------------------------------------------------------------
// Inferred types & type guards
// ---------------------------------------------------------------------------

export type ValidatedLog = z.infer<typeof LogValidator>;
export type PromptResponseLog = z.infer<typeof PromptResponseLogValidator>;
export type SystemMessageLog = z.infer<typeof SystemMessageLogValidator>;
export type GenAIContent = z.infer<typeof GenAIContentValidator>;

export const isUserMessageLog = (
  log: ValidatedLog,
): log is PromptResponseLog => {
  return log.event_name === GEN_AI_USER_MESSAGE_EVENT;
};

export const isSystemMessageLog = (
  log: ValidatedLog,
): log is SystemMessageLog => {
  return log.event_name === GEN_AI_SYSTEM_MESSAGE_EVENT;
};

export const isChoiceLog = (
  log: ValidatedLog,
): log is PromptResponseLog => {
  return log.event_name === GEN_AI_CHOICE_EVENT;
};
