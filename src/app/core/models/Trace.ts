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
 * Public facade for trace / span validation.
 *
 * Validation is performed in three stages:
 *
 *   Stage 1 (`RawSpanValidator`) — validates the OpenTelemetry envelope
 *     (`name`, `start_time`, …, plus a lenient internal `attributes` bag
 *     used only as the source for promotion).
 *
 *   Stage 2 (`SpanValidator`) — promotes well-known attributes from the
 *     bag into typed top-level fields prefixed with `attr`. All
 *     non-display logic should read attribute values through the typed
 *     `attr*` promoted fields.
 *
 *     All known attributes are surfaced as **optional** on every span. On
 *     top of that, two operation-specific branches tighten certain
 *     attributes to **required**:
 *
 *       - `gen_ai.operation.name == "invoke_agent"`     →
 *           `attrConversationId` becomes required.
 *       - `gen_ai.operation.name == "generate_content"` →
 *           `attrEventId` and `attrInvocationId` become required.
 *
 *     `attrOperationName` is the discriminator. On the *fallback* branch
 *     (operation name missing or unrecognized) `attrOperationName` is the
 *     literal `undefined`, so a check like
 *
 *         if (span.attrOperationName === 'generate_content') { … }
 *
 *     narrows the union to `GenerateContentSpan` purely via TypeScript's
 *     discriminated-union machinery — no extra runtime helper needed.
 *
 *   Stage 3 (input/output coercion) — see {@link coerceSpanIo}. Projects
 *     the span's inputs/outputs into a unified discriminated `SpanIo`
 *     shape so that consumers can render LLM IO uniformly regardless of
 *     which semantic convention produced the underlying data:
 *
 *       - experimental: payload from the
 *         `gen_ai.client.inference.operation.details` log's attributes;
 *       - stable: payload from `gen_ai.system.message`,
 *         `gen_ai.user.message`, and `gen_ai.choice` child logs;
 *       - legacy: payload from the `gcp.vertex.agent.llm_{request,response}`
 *         JSON-string attributes.
 *
 *     The result is exposed as the optional `io` field on
 *     `GenerateContentSpan` and `FallbackSpan` (the only branches that
 *     can carry LLM IO). Note: child log records are validated at Stage 1
 *     (so malformed shapes are still rejected) but are dropped from the
 *     validated output — the only meaningful reason to read them was to
 *     derive the LLM IO, which is now centralized in Stage 3.
 */

import { z } from 'zod';

import {
  CompletionDetailsLog,
  CompletionDetailsLogValidator,
  GEN_AI_COMPLETION_DETAILS_EVENT,
  GEN_AI_RESPONSE_FINISH_REASONS,
  GEN_AI_USAGE_INPUT_TOKENS,
  GEN_AI_USAGE_OUTPUT_TOKENS,
  ResponseFinishReasonsAttrValidator,
  UsageTokensAttrValidator,
} from './trace/ExperimentalSemconv';
import { oTelAnyValueSchema } from './trace/Shared';
import { coerceSpanIo, SpanIo } from './trace/SpanIo';
import {
  LogValidator as StableLogValidator,
  ValidatedLog as StableValidatedLog,
} from './trace/StableSemconv';

// ---------------------------------------------------------------------------
// Unified log validator — accepts both stable-semconv log events
// (`gen_ai.system.message`, `gen_ai.user.message`, `gen_ai.choice`) and the
// experimental-semconv completion-details event
// (`gen_ai.client.inference.operation.details`).
//
// Spans validated under either semantic convention may carry a mix of these
// log records (e.g. a `generate_content` span emits stable system/user/choice
// logs when stable semconv is in effect, OR a single completion-details log
// when the experimental opt-in is enabled). Validating both shapes here lets
// `RawSpanValidator.logs` accept either flavor without per-branch logic.
// ---------------------------------------------------------------------------

const LogValidator = z.union([
  StableLogValidator,
  CompletionDetailsLogValidator,
]);

export {
  GEN_AI_CHOICE_EVENT,
  GEN_AI_SYSTEM_MESSAGE_EVENT,
  GEN_AI_USER_MESSAGE_EVENT,
  isChoiceLog,
  isSystemMessageLog,
  isUserMessageLog,
} from './trace/StableSemconv';
export type {
  GenAIContent,
  PromptResponseLog,
  SystemMessageLog,
} from './trace/StableSemconv';

export type ValidatedLog = StableValidatedLog | CompletionDetailsLog;

export {
  FUNCTION_TOOL_DEFINITION_TYPE,
  GEN_AI_COMPLETION_DETAILS_EVENT,
  GEN_AI_INPUT_MESSAGES,
  GEN_AI_OUTPUT_MESSAGES,
  GEN_AI_RESPONSE_FINISH_REASONS,
  GEN_AI_SYSTEM_INSTRUCTIONS,
  GEN_AI_TOOL_DEFINITIONS,
  GEN_AI_USAGE_INPUT_TOKENS,
  GEN_AI_USAGE_OUTPUT_TOKENS,
} from './trace/ExperimentalSemconv';
export type {
  CompletionDetailsLog,
  FunctionToolDefinition,
  GenericToolDefinition,
  InputMessage,
  OutputMessage,
  Part,
  ToolDefinition,
} from './trace/ExperimentalSemconv';

export { coerceSpanIo } from './trace/SpanIo';
export type {
  ExperimentalSpanIo,
  LegacySpanIo,
  SpanIo,
  StableSpanIo,
} from './trace/SpanIo';

/** Type guard for the experimental completion-details log event. */
export function isCompletionDetailsLog(
    log: ValidatedLog,
): log is CompletionDetailsLog {
  return log.event_name === GEN_AI_COMPLETION_DETAILS_EVENT;
}

// ---------------------------------------------------------------------------
// Operation-name and ADK-specific attribute key constants.
// ---------------------------------------------------------------------------

export const GEN_AI_OPERATION_NAME = 'gen_ai.operation.name';
export const GEN_AI_CONVERSATION_ID = 'gen_ai.conversation.id';
export const GEN_AI_AGENT_NAME = 'gen_ai.agent.name';
export const GEN_AI_AGENT_DESCRIPTION = 'gen_ai.agent.description';

export const GCP_VERTEX_AGENT_INVOCATION_ID =
    'gcp.vertex.agent.invocation_id';
export const GCP_VERTEX_AGENT_ASSOCIATED_EVENT_IDS =
    'gcp.vertex.agent.associated_event_ids';
export const GCP_VERTEX_AGENT_EVENT_ID = 'gcp.vertex.agent.event_id';
export const GCP_VERTEX_AGENT_LLM_REQUEST = 'gcp.vertex.agent.llm_request';
export const GCP_VERTEX_AGENT_LLM_RESPONSE = 'gcp.vertex.agent.llm_response';

export const OPERATION_INVOKE_AGENT = 'invoke_agent';
export const OPERATION_GENERATE_CONTENT = 'generate_content';

// ---------------------------------------------------------------------------
// Stage 1: Raw span envelope.
// ---------------------------------------------------------------------------

const RawSpanValidator = z.object({
  name: z.string(),
  start_time: z.number(),
  end_time: z.number(),
  trace_id: z.union([z.string(), z.number()]),
  span_id: z.union([z.string(), z.number()]),
  parent_span_id: z.union([z.string(), z.number()]).nullable().optional(),
  attributes: z.record(z.string(), oTelAnyValueSchema).optional(),
  logs: z.array(LogValidator).optional(),
});

type RawSpan = z.infer<typeof RawSpanValidator>;

// ---------------------------------------------------------------------------
// Promoted-attribute mixin.
//
// Every known attribute is validated as *optional* here. Per-operation
// schemas below tighten the relevant ones to required.
//
// Each entry validates the wire form of the attribute (e.g. arrays of
// experimental Part shapes, or JSON-string-encoded equivalents). Validation
// errors propagate as Zod issues regardless of which operation_name branch
// the span landed in.
// ---------------------------------------------------------------------------

const PromotedAttrsMixin = z.object({
  attrConversationId: z.string().optional(),
  attrInvocationId: z.string().optional(),
  attrAssociatedEventIds: z.array(z.string()).optional(),
  attrAgentName: z.string().optional(),
  attrAgentDescription: z.string().optional(),
  attrEventId: z.string().optional(),
  attrResponseFinishReasons: ResponseFinishReasonsAttrValidator.optional(),
  attrUsageInputTokens: UsageTokensAttrValidator.optional(),
  attrUsageOutputTokens: UsageTokensAttrValidator.optional(),
});

/**
 * The list of (wire-key, promoted-field) pairs we promote out of a raw
 * span's `attributes` bag. Used by {@link buildPromotedAttrsCandidate}
 */
const PROMOTED_ATTRIBUTE_KEYS = [
  [GEN_AI_CONVERSATION_ID, 'attrConversationId'],
  [GCP_VERTEX_AGENT_INVOCATION_ID, 'attrInvocationId'],
  [GCP_VERTEX_AGENT_ASSOCIATED_EVENT_IDS, 'attrAssociatedEventIds'],
  [GEN_AI_AGENT_NAME, 'attrAgentName'],
  [GEN_AI_AGENT_DESCRIPTION, 'attrAgentDescription'],
  [GCP_VERTEX_AGENT_EVENT_ID, 'attrEventId'],
  [GEN_AI_RESPONSE_FINISH_REASONS, 'attrResponseFinishReasons'],
  [GEN_AI_USAGE_INPUT_TOKENS, 'attrUsageInputTokens'],
  [GEN_AI_USAGE_OUTPUT_TOKENS, 'attrUsageOutputTokens'],
] as const;

/**
 * Builds the promoted-attribute candidate object from a raw span's
 * attributes bag. Keys not listed in {@link PROMOTED_ATTRIBUTE_KEYS} are
 * dropped from the *promoted* fields.
 */
function buildPromotedAttrsCandidate(raw: RawSpan): Record<string, unknown> {
  const a = raw.attributes ?? {};
  const candidate: Record<string, unknown> = {
    attrConversationId: a[GEN_AI_CONVERSATION_ID],
    attrInvocationId: a[GCP_VERTEX_AGENT_INVOCATION_ID],
    attrAssociatedEventIds: a[GCP_VERTEX_AGENT_ASSOCIATED_EVENT_IDS],
    attrAgentName: a[GEN_AI_AGENT_NAME],
    attrAgentDescription: a[GEN_AI_AGENT_DESCRIPTION],
    attrEventId: a[GCP_VERTEX_AGENT_EVENT_ID],
    attrResponseFinishReasons: a[GEN_AI_RESPONSE_FINISH_REASONS],
    attrUsageInputTokens: a[GEN_AI_USAGE_INPUT_TOKENS],
    attrUsageOutputTokens: a[GEN_AI_USAGE_OUTPUT_TOKENS],
  };
  // Drop undefined entries so that `.optional()` cleanly absent fields
  // don't show up as `attr*: undefined` literal keys on the parsed object.
  for (const k of Object.keys(candidate)) {
    if (candidate[k] === undefined) delete candidate[k];
  }
  return candidate;
}

// ---------------------------------------------------------------------------
// Per-operation tightenings (override specific PromotedAttrsMixin fields).
// ---------------------------------------------------------------------------

const InvokeAgentTightening = z.object({
  attrConversationId: z.string({
    required_error: `'${GEN_AI_CONVERSATION_ID}' is required on '${
        OPERATION_INVOKE_AGENT}' spans`,
  }),
});

const GenerateContentTightening = z.object({
  attrEventId: z.string({
    required_error: `'${GCP_VERTEX_AGENT_EVENT_ID}' is required on '${
        OPERATION_GENERATE_CONTENT}' spans`,
  }),
  attrInvocationId: z.string({
    required_error: `'${GCP_VERTEX_AGENT_INVOCATION_ID}' is required on '${
        OPERATION_GENERATE_CONTENT}' spans`,
  }),
});

// ---------------------------------------------------------------------------
// Inferred types — promoted attributes union and per-branch span types.
// ---------------------------------------------------------------------------

type PromotedAttrs = z.infer<typeof PromotedAttrsMixin>;

/**
 * Fields originating from the OpenTelemetry span envelope itself.
 *
 * Note on attribute access:
 *   - For all non-display logic (filtering, branching, computing derived
 *     state, etc.), every attribute should be read through a typed `attr*`
 *     promoted field. This guarantees a single, well-typed access path.
 *   - The unmodified raw attributes are preserved on
 *     `rawAttributesUseThisFieldOnlyForDisplay` for display only.
 *   - The unmodified raw span (exactly as it came over the wire) is
 *     preserved on `rawSpanUseThisFieldOnlyForDisplay` for display only.
 */
interface SpanEnvelope {
  name: string;
  start_time: number;
  end_time: number;
  trace_id: string | number;
  span_id: string | number;
  parent_span_id?: string | number | null;
  /**
   * Unmodified copy of the raw OpenTelemetry attributes.
   *
   * **DISPLAY ONLY.** Do not branch or compute on this field — use the
   * typed `attr*` promoted fields instead.
   */
  rawAttributesUseThisFieldOnlyForDisplay:
      Record<string, unknown>;
  /**
   * Unmodified copy of the entire raw OpenTelemetry span as it came over
   * the wire (including `attributes`, `logs`, and any other fields).
   *
   * **DISPLAY ONLY.** Do not branch or compute on this field — use the
   * typed envelope fields, `attr*` promoted fields, or `io` instead.
   * Surfaced so the "Raw JSON" view can show the unmodified payload
   * familiar to anyone reading the upstream OTel export, without leaking
   * the post-validation duplicated/typed projection back into the UI.
   */
  rawSpanUseThisFieldOnlyForDisplay: unknown;
}

/**
 * Span emitted with `gen_ai.operation.name == "invoke_agent"`.
 *
 * `attrConversationId` is guaranteed to be present (string, not optional).
 *
 * `io` is declared as the literal `undefined` here — `invoke_agent` spans
 * never carry LLM IO directly. Declaring it (as undefined) on this branch
 * keeps `span.io` accessible across the union without per-branch
 * narrowing.
 */
export type InvokeAgentSpan =
    SpanEnvelope & PromotedAttrs & {
      attrOperationName: typeof OPERATION_INVOKE_AGENT;
      attrConversationId: string;
      io?: undefined;
    };

/**
 * Span emitted with `gen_ai.operation.name == "generate_content"`.
 *
 * `attrEventId` and `attrInvocationId` are guaranteed to be present.
 *
 * `io` is the Stage-3 coerced input/output projection — populated when
 * any of the three IO sources (experimental log attrs, stable child
 * logs, or legacy llm_request/llm_response strings) carry data. Child
 * log records are NOT exposed on the validated span; their only
 * meaningful payload (the LLM IO) is surfaced through `io`.
 */
export type GenerateContentSpan =
    SpanEnvelope & PromotedAttrs & {
      attrOperationName: typeof OPERATION_GENERATE_CONTENT;
      attrEventId: string;
      attrInvocationId: string;
      io?: SpanIo;
    };

/**
 * Fallback span shape used when `gen_ai.operation.name` is missing or holds
 * an unrecognized value (e.g. legacy `call_llm`, `execute_tool`,
 * `compact_events`, `invoke_workflow`, `invoke_node`).
 *
 * `attrOperationName` is the literal `undefined` so that `if
 * (span.attrOperationName === 'generate_content')` reliably narrows the
 * union to {@link GenerateContentSpan}. Promoted attributes are still
 * surfaced (all optional).
 *
 * `io` is the Stage-3 coerced input/output projection — populated for
 * legacy `call_llm` spans that carry `gcp.vertex.agent.llm_*` strings,
 * and for any other fallback span that nonetheless emitted GenAI logs.
 * Child log records are NOT exposed on the validated span.
 */
export type FallbackSpan =
    SpanEnvelope & PromotedAttrs & {
      attrOperationName?: undefined;
      io?: SpanIo;
    };

export type ValidatedSpan =
    | InvokeAgentSpan
    | GenerateContentSpan
    | FallbackSpan;

// ---------------------------------------------------------------------------
// Stage 2: composed SpanValidator.
// ---------------------------------------------------------------------------

/**
 * Forwards Zod issues from a Stage-2 sub-parse onto the parent context.
 * The Zod v4 `addIssue` API is typed against the raw (input) issue shape
 * rather than the parsed one, so we cast through `any`.
 */
function forwardIssues(
  ctx: { addIssue(arg: any): void },
  issues: readonly z.ZodIssue[],
): void {
  for (const issue of issues) {
    ctx.addIssue(issue as any);
  }
}

/**
 * Applies `PromotedAttrsMixin` (mandatory) plus an optional per-operation
 * tightening schema to a raw span's attributes bag, returning the parsed
 * promoted fields or `null` if validation failed (issues are forwarded onto
 * `ctx`).
 */
function parsePromotedAttrs<T extends z.ZodObject<any>>(
  raw: RawSpan,
  tightening: T | null,
  ctx: { addIssue(arg: any): void },
): (PromotedAttrs & z.infer<T>) | null {
  const candidate = buildPromotedAttrsCandidate(raw);

  // Run the mixin first to validate the shape of any present attribute.
  const mixinResult = PromotedAttrsMixin.safeParse(candidate);
  if (!mixinResult.success) {
    forwardIssues(ctx, mixinResult.error.issues);
    return null;
  }

  if (tightening === null) {
    return mixinResult.data as PromotedAttrs & z.infer<T>;
  }

  // Tightening uses the *original* candidate so that "missing required"
  // errors still surface (the mixin made everything optional).
  const tighteningResult = tightening.safeParse(candidate);
  if (!tighteningResult.success) {
    forwardIssues(ctx, tighteningResult.error.issues);
    return null;
  }

  return {
    ...mixinResult.data,
    ...tighteningResult.data,
  } as PromotedAttrs & z.infer<T>;
}

/**
 * Public span validator. Returns a discriminated union narrowable on the
 * literal value of `attrOperationName`.
 *
 * The unmodified input is captured up-front and re-attached on the
 * validated result as `rawSpanUseThisFieldOnlyForDisplay` so that
 * "Raw JSON" UI views can render the unmodified over-the-wire OTel
 * payload (rather than the post-validation typed projection, which
 * duplicates information and is unfamiliar to anyone outside ADK Web).
 */
export const SpanValidator: z.ZodType<ValidatedSpan, z.ZodTypeDef, unknown> =
    z.unknown().transform((rawInput, ctx): ValidatedSpan => {
      const parseResult = RawSpanValidator.safeParse(rawInput);
      if (!parseResult.success) {
        forwardIssues(ctx, parseResult.error.issues);
        return z.NEVER as never;
      }
      const raw = parseResult.data;
      const opName = raw.attributes?.[GEN_AI_OPERATION_NAME];

      // Strip Stage-1's `logs` and `attributes` from the envelope so we
      // control which branches surface them. The raw `attributes` bag is
      // re-attached under `rawAttributesUseThisFieldOnlyForDisplay`
      // below.
      const { logs, attributes: rawAttrs, ...envelope } = raw;

      const displayOnlyRawAttrs:
          Pick<SpanEnvelope, 'rawAttributesUseThisFieldOnlyForDisplay'> =
              rawAttrs !== undefined
                  ? { rawAttributesUseThisFieldOnlyForDisplay: rawAttrs }
                  : { rawAttributesUseThisFieldOnlyForDisplay: {} };

      // Snapshot the unmodified input so the "Raw JSON" view can display
      // the over-the-wire payload exactly as it arrived.
      const displayOnlyRawSpan:
          Pick<SpanEnvelope, 'rawSpanUseThisFieldOnlyForDisplay'> = {
            rawSpanUseThisFieldOnlyForDisplay: rawInput,
          };

      if (opName === OPERATION_INVOKE_AGENT) {
        const promoted = parsePromotedAttrs(raw, InvokeAgentTightening, ctx);
        if (promoted === null) return z.NEVER as never;
        // Logs intentionally dropped — invoke_agent spans don't carry them.
        const result: InvokeAgentSpan = {
          ...envelope,
          ...displayOnlyRawAttrs,
          ...displayOnlyRawSpan,
          ...promoted,
          attrOperationName: OPERATION_INVOKE_AGENT,
        };
        return result;
      }

      if (opName === OPERATION_GENERATE_CONTENT) {
        const promoted =
            parsePromotedAttrs(raw, GenerateContentTightening, ctx);
        if (promoted === null) return z.NEVER as never;
        const io = coerceSpanIo({ attributes: raw.attributes, logs });
        const result: GenerateContentSpan = {
          ...envelope,
          ...displayOnlyRawAttrs,
          ...displayOnlyRawSpan,
          ...promoted,
          attrOperationName: OPERATION_GENERATE_CONTENT,
          ...(io !== undefined ? { io } : {}),
        };
        return result;
      }

      // Fallback branch — operation name missing or unrecognized. We do
      // *not* promote `attrOperationName` here so that the discriminator
      // value remains exactly `undefined`, enabling literal narrowing on
      // the other branches.
      const promoted = parsePromotedAttrs(raw, null, ctx);
      if (promoted === null) return z.NEVER as never;
      const io = coerceSpanIo({ attributes: raw.attributes, logs });
      const result: FallbackSpan = {
        ...envelope,
        ...displayOnlyRawAttrs,
        ...displayOnlyRawSpan,
        ...promoted,
        ...(io !== undefined ? { io } : {}),
      };
      return result;
    }) as z.ZodType<ValidatedSpan, z.ZodTypeDef, unknown>;

// ---------------------------------------------------------------------------
// UI-facing Span type — adds a `children` tree-structure helper on top of
// the validated discriminated union.
// ---------------------------------------------------------------------------

export type Span = ValidatedSpan & {
  children?: Span[];
};
