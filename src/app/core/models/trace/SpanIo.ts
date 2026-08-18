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
 * Stage-3 input/output coercion.
 *
 * Stage 1 validates the OTel envelope; Stage 2 promotes well-known
 * attributes into typed `attr*` fields. Stage 3 reads those promoted
 * fields (and, for experimental semconv, the completion-details log
 * attributes) and projects them into a single discriminated `SpanIo`
 * shape that consumers can render uniformly regardless of which semantic
 * convention produced the underlying span.
 *
 * Three sources are recognised, attempted in this order on each span:
 *
 *   1. **Experimental** (`kind: 'experimental'`) — payload lives on the
 *      `gen_ai.client.inference.operation.details` log's `attributes`
 *      (`gen_ai.input.messages`, `gen_ai.system_instructions`,
 *      `gen_ai.tool.definitions`, `gen_ai.output.messages`).
 *
 *   2. **Stable** (`kind: 'stable'`) — payload lives on the span's child
 *      log records: `gen_ai.system.message` (single body), one or more
 *      `gen_ai.user.message` (bodies), and `gen_ai.choice` (body) for the
 *      output.
 *
 *   3. **Legacy** (`kind: 'legacy'`) — payload lives in the
 *      `gcp.vertex.agent.llm_{request,response}` JSON-string attributes.
 *      The strings are parsed; if either fails to parse it is left as a
 *      raw string so the caller can still surface something useful.
 *
 * If none of the three sources have any data, the result is `undefined`.
 *
 * The shapes here are intentionally **opaque** (mostly `unknown`) — these
 * are passed through to the UI for structural display, so we do not need
 * to re-validate the inner content beyond what Stage 2 has already done.
 *
 * This module is private to `src/app/core/models/trace/`. Public symbols
 * are re-exported from `Trace.ts`.
 */

import {
  GEN_AI_COMPLETION_DETAILS_EVENT,
  GEN_AI_INPUT_MESSAGES,
  GEN_AI_OUTPUT_MESSAGES,
  GEN_AI_SYSTEM_INSTRUCTIONS,
  GEN_AI_TOOL_DEFINITIONS,
} from './ExperimentalSemconv';
import {
  GEN_AI_CHOICE_EVENT,
  GEN_AI_SYSTEM_MESSAGE_EVENT,
  GEN_AI_USER_MESSAGE_EVENT,
} from './StableSemconv';

// Wire keys for the legacy `call_llm` attributes. Defined locally here
// (rather than imported from `Trace.ts`) to avoid a circular import.
const GCP_VERTEX_AGENT_LLM_REQUEST = 'gcp.vertex.agent.llm_request';
const GCP_VERTEX_AGENT_LLM_RESPONSE = 'gcp.vertex.agent.llm_response';

// ---------------------------------------------------------------------------
// IO variant types.
//
// Each variant carries a `kind` discriminator. Field shapes are deliberately
// opaque (`unknown`) because consumers only render them as structured trees;
// validation already happened in Stage 2.
// ---------------------------------------------------------------------------

/**
 * Inputs/outputs derived from the legacy `gcp.vertex.agent.llm_*` string
 * attributes. The strings are JSON-parsed when possible; on parse failure
 * the raw string is preserved verbatim so the UI can still display
 * *something*.
 */
export interface LegacySpanIo {
  kind: 'legacy';
  inputs: unknown;
  outputs: unknown;
}

/**
 * Inputs/outputs derived from stable-semconv child logs.
 *
 *   - `system_instruction`: the body of the (single) `gen_ai.system.message`
 *     log, or `undefined` if no system message was emitted.
 *   - `user_messages`: bodies of all `gen_ai.user.message` logs, in
 *     emission order. Empty array if none were emitted.
 *   - `output`: the body of the (single) `gen_ai.choice` log, or
 *     `undefined` if no choice was emitted yet.
 */
export interface StableSpanIo {
  kind: 'stable';
  inputs: {
    system_instruction: unknown;
    user_messages: unknown[];
  };
  outputs: unknown;
}

/**
 * Inputs/outputs derived from an experimental-semconv
 * `gen_ai.client.inference.operation.details` log's attributes.
 *
 *   - `system_instruction`: value of `gen_ai.system_instructions`.
 *   - `user_messages`: value of `gen_ai.input.messages`.
 *   - `tool_definitions`: value of `gen_ai.tool.definitions`.
 *   - `output`: value of `gen_ai.output.messages`.
 *
 * Any attribute not present on the log is `undefined`.
 */
export interface ExperimentalSpanIo {
  kind: 'experimental';
  inputs: {
    system_instruction: unknown;
    user_messages: unknown;
    tool_definitions: unknown;
  };
  outputs: unknown;
}

/**
 * Discriminated union of the IO shapes a span may project into. Use the
 * `kind` field to discriminate.
 */
export type SpanIo = LegacySpanIo | StableSpanIo | ExperimentalSpanIo;

// ---------------------------------------------------------------------------
// Coercion entry point.
// ---------------------------------------------------------------------------

/**
 * Inputs to {@link coerceSpanIo}. This is intentionally a structural type
 * rather than a reference to `ValidatedSpan` so that this module can stay
 * independent of `Trace.ts`'s broader span union (and so it can be unit-
 * tested with minimal fixtures).
 *
 *   - `attributes`: the raw OTel attribute bag, wire-keyed. Read for the
 *     legacy `gcp.vertex.agent.llm_{request,response}` JSON-string
 *     attributes.
 *   - `logs`: the span's child log records. Read for stable-semconv
 *     system/user/choice bodies and for the experimental
 *     `gen_ai.client.inference.operation.details` log attributes.
 */
export interface CoerceSpanIoInput {
  attributes?: Record<string, unknown>;
  logs?: ReadonlyArray<{
    event_name: string;
    body?: unknown;
    attributes?: Record<string, unknown>;
  }>;
}

/**
 * Projects a span's inputs/outputs into the unified {@link SpanIo} shape.
 *
 * Sources are tried in this order, first match wins:
 *   1. Experimental (`gen_ai.client.inference.operation.details` log
 *      attributes).
 *   2. Stable (`gen_ai.system.message` / `gen_ai.user.message` /
 *      `gen_ai.choice` child logs).
 *   3. Legacy (`gcp.vertex.agent.llm_{request,response}` string attrs).
 *
 * Returns `undefined` if no source produced any data.
 */
export function coerceSpanIo(span: CoerceSpanIoInput): SpanIo | undefined {
  const experimental = tryExperimental(span);
  if (experimental !== undefined) return experimental;

  const stable = tryStable(span);
  if (stable !== undefined) return stable;

  const legacy = tryLegacy(span);
  if (legacy !== undefined) return legacy;

  return undefined;
}

// ---------------------------------------------------------------------------
// Per-source extractors.
// ---------------------------------------------------------------------------

function tryExperimental(
    span: CoerceSpanIoInput,
    ): ExperimentalSpanIo | undefined {
  const log = (span.logs ?? []).find(
      (l) => l.event_name === GEN_AI_COMPLETION_DETAILS_EVENT,
  );
  if (log === undefined) return undefined;

  const attrs = log.attributes ?? {};
  const systemInstruction = attrs[GEN_AI_SYSTEM_INSTRUCTIONS];
  const userMessages = attrs[GEN_AI_INPUT_MESSAGES];
  const toolDefinitions = attrs[GEN_AI_TOOL_DEFINITIONS];
  const output = attrs[GEN_AI_OUTPUT_MESSAGES];

  // If the completion-details log is present but carries none of the
  // payload attributes, fall through to other sources rather than emit
  // an empty experimental IO.
  if (systemInstruction === undefined && userMessages === undefined &&
      toolDefinitions === undefined && output === undefined) {
    return undefined;
  }

  return {
    kind: 'experimental',
    inputs: {
      system_instruction: systemInstruction,
      user_messages: userMessages,
      tool_definitions: toolDefinitions,
    },
    outputs: output,
  };
}

function tryStable(span: CoerceSpanIoInput): StableSpanIo | undefined {
  const logs = span.logs ?? [];

  let systemInstruction: unknown = undefined;
  const userMessages: unknown[] = [];
  let output: unknown = undefined;

  for (const log of logs) {
    switch (log.event_name) {
      case GEN_AI_SYSTEM_MESSAGE_EVENT:
        // If multiple system messages were emitted (not expected, but
        // possible), the last one wins — matches "single system
        // instruction" semantics.
        systemInstruction = log.body;
        break;
      case GEN_AI_USER_MESSAGE_EVENT:
        userMessages.push(log.body);
        break;
      case GEN_AI_CHOICE_EVENT:
        output = log.body;
        break;
      default:
        break;
    }
  }

  if (systemInstruction === undefined && userMessages.length === 0 &&
      output === undefined) {
    return undefined;
  }

  return {
    kind: 'stable',
    inputs: {
      system_instruction: systemInstruction,
      user_messages: userMessages,
    },
    outputs: output,
  };
}

function tryLegacy(span: CoerceSpanIoInput): LegacySpanIo | undefined {
  const attrs = span.attributes ?? {};
  const req = attrs[GCP_VERTEX_AGENT_LLM_REQUEST];
  const res = attrs[GCP_VERTEX_AGENT_LLM_RESPONSE];
  if (req === undefined && res === undefined) return undefined;

  return {
    kind: 'legacy',
    inputs: parseJsonOrPassThrough(req),
    outputs: parseJsonOrPassThrough(res),
  };
}

/**
 * If the input is a string, attempts to JSON-parse it (returning the raw
 * string on parse failure so the UI can still surface its contents). For
 * any non-string input, returns the value unchanged.
 */
function parseJsonOrPassThrough(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
