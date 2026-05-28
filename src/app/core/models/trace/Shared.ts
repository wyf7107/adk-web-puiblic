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
 * Shared low-level Zod primitives used by the trace validators.
 *
 * This module is private to `src/app/core/models/trace/`. Public symbols are
 * re-exported from `Trace.ts`.
 */

import { z } from 'zod';

// Define the recursive type for OTelAnyValue
const literalSchema = z.union([z.string(), z.number(), z.boolean()]);

/**
 * Recursive schema matching OpenTelemetry `AnyValue` — strings, numbers,
 * booleans, arrays of those, and string-keyed maps of those.
 */
export const oTelAnyValueSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    literalSchema,
    z.array(oTelAnyValueSchema),
    z.record(z.string(), oTelAnyValueSchema),
  ]),
);

/**
 * Strips entries whose value is `null` from a parsed object.
 *
 * Used because Python ADK serializes optional fields as `null`, but ADK Web
 * prefers the JS-idiomatic "field absent" representation.
 */
export function withStrippedNulls<T extends z.ZodTypeAny>(schema: T) {
  return schema.transform((data) => {
    if (!data || typeof data !== 'object') {
      return data;
    }
    const cleanData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== null) {
        cleanData[key] = value;
      }
    }
    return cleanData;
  });
}

/**
 * Parses a JSON string and surfaces parse errors as Zod issues.
 */
export const jsonStringSchema = z.string().transform((str, ctx) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON string' });
    return z.NEVER;
  }
});

/**
 * Helper that accepts either an already-parsed value or a JSON string that
 * parses to a value matching the given schema.
 *
 * Python ADK serializes some span attributes via
 * `_safe_json_serialize_no_whitespaces(...)` (see
 * `_experimental_semconv.py:_build_completion_span_attributes`), so on the
 * wire we may see either form.
 */
export const jsonStringOr = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, jsonStringSchema.pipe(schema)]);
