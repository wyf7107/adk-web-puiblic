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

import { EventTelemetry, Log, Span } from "../app/core/models/Trace";

const GCP_VERTEX_AGENT_TOOL_CALL_ARGS = 'gcp.vertex.agent.tool_call_args';
const GCP_VERTEX_AGENT_TOOL_RESPONSE = 'gcp.vertex.agent.tool_response';

const EXECUTE_TOOL = 'execute_tool';
const GENERATE_CONTENT = 'generate_content';

const CONTENT = 'content';
const PARTS = 'parts';
const FUNCTION_RESPONSE = 'functionResponse';

// Normalizes span such that input/output ends up in the same place for:
// - semconv `generate_content` spans
// - semconv `execute_tool` spans
// - legacy `call_llm` spans
export const normalizeSpan = (span: Span): Span => {
  return {
    ...span,
    attributes: {
      ...span.attributes,
      'gcp.vertex.agent.llm_request': span.attributes['gcp.vertex.agent.llm_request'] ?? extractInputFromSpan(span),
      'gcp.vertex.agent.llm_response': span.attributes['gcp.vertex.agent.llm_response'] ?? extractOutputFromSpan(span),
    }
  };
};

const extractInputFromSpan = (span: Span): {[key: string]: any} | string | undefined => {
  if (span.name.startsWith(EXECUTE_TOOL)) {
    return span.attributes?.[GCP_VERTEX_AGENT_TOOL_CALL_ARGS];
  } else if (span.name.startsWith(GENERATE_CONTENT)) {
    // Note, here we only extract the user message part of the input.
    // This is because later on, UI expects this to be in the google-genai content format.
    // Ideally it would be unified between here and extractInputFromLogs.
    return extractUserMessageFromSpan(span.logs);
  } else {
    return undefined;
  }
};

const extractInputFromLogs = (logs?: Log[]): string => {
  const systemMessage = extractSystemMessageFromLogs(logs);
  const userMessage = extractUserMessageFromSpan(logs);
  return JSON.stringify({
    system_message: systemMessage,
    user_message: tryJSONParse(userMessage),
  });
};

const extractUserMessageFromSpan = (logs?: Log[]): string | undefined => {
  if (!logs) {
    return undefined;
  }
  const userMessageLog = logs.reverse().find(isUserMessageLog);
  if (!userMessageLog) {
    return undefined;
  }
  const userMessage = typeof userMessageLog.body === 'string' ? tryJSONParse(userMessageLog.body) : userMessageLog.body
  if (typeof userMessage === 'string') {
    return userMessage
  }
  // Modifying the object, to fix processing further down.
  // Modifying login in src/app/components/trace-tab/trace-tab.component.ts would be more ideal.
  userMessage['content']['role'] = 'user';
  userMessage['contents'] = [userMessage['content']]
  delete userMessage['content'];
  return JSON.stringify(userMessage);
};

const extractSystemMessageFromLogs = (logs?: Log[]): {[key: string]: any} | string | undefined => {
  if (!logs) {
    return undefined;
  }
  const systemMessageLog = logs.reverse().find(log => log.event_name === 'gen_ai.system.message')
  if (!systemMessageLog) {
    return undefined;
  }
  if (typeof systemMessageLog.body === 'string') {
    return tryJSONParse(systemMessageLog.body);
  } else {
    return systemMessageLog.body;
  }
};

const isUserMessageLog = (log: Log): boolean => {
  if (log.event_name !== 'gen_ai.user.message') {
    return false;
  }

  try {
    const body = typeof log.body === 'string' ? JSON.parse(log.body) : log.body;
    const parts = (body as any)[CONTENT]?.[PARTS];
    if (!Array.isArray(parts)) {
      return false;
    }
    return parts.every(part => !part[FUNCTION_RESPONSE]);
  }
  catch (e) {
    return false;
  }
};

const extractOutputFromSpan = (span: Span): string | undefined => {
  if (span.name.startsWith(EXECUTE_TOOL)) {
    return span.attributes?.[GCP_VERTEX_AGENT_TOOL_RESPONSE];
  } else if (span.name.startsWith(GENERATE_CONTENT)) {
    return extractOutputFromLogs(span.logs);
  } else {
    return undefined;
  }
};

const extractOutputFromLogs = (logs?: Log[]): string | undefined => {
  if (!logs) {
    return undefined;
  }
  const genaiChoiceLog = logs.reverse().find(log => log.event_name === 'gen_ai.choice');
  if (!genaiChoiceLog) {
    return undefined;
  }
  return stringFromLogBody(genaiChoiceLog);
};

const tryJSONParse = (maybeJSON: any): any | string => {
  try {
    return JSON.parse(maybeJSON);
  } catch (e) {
    return maybeJSON;
  }
};

const stringFromLogBody = (log: Log): string => {
  return typeof log.body === 'string' ? log.body : JSON.stringify(log.body);
};

// Normalizes event telemetry such that event input/output ends up in the same place for:
// - semconv `generate_content` spans
// - semconv `execute_tool` spans
// - legacy `call_llm` spans
export const normalizeEventTelemetry = (telemetry: EventTelemetry) => {
  return {
    ...telemetry,
    'gcp.vertex.agent.llm_request': telemetry['gcp.vertex.agent.llm_request'] ?? extractEventInput(telemetry),
    'gcp.vertex.agent.llm_response': telemetry['gcp.vertex.agent.llm_response'] ?? extractEventOutput(telemetry),
  };
};

const extractEventInput = (telemetry: EventTelemetry): string | undefined => {
  if (GCP_VERTEX_AGENT_TOOL_CALL_ARGS in telemetry) {
    return `${telemetry[GCP_VERTEX_AGENT_TOOL_CALL_ARGS]}`;
  }
  if (!telemetry.logs) {
    return undefined;
  }
  return extractInputFromLogs(telemetry.logs);
};

const extractEventOutput = (telemetry: EventTelemetry): string | undefined => {
  if (GCP_VERTEX_AGENT_TOOL_RESPONSE in telemetry) {
    return `${telemetry[GCP_VERTEX_AGENT_TOOL_RESPONSE]}`;
  }
  if (!telemetry.logs) {
    return undefined;
  }
  return extractOutputFromLogs(telemetry.logs);
}
