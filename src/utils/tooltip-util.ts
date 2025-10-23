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

export class TooltipUtil {
    private static readonly callbackMenuTooltips = new Map<string, string>([
        ["before_agent", "Called immediately before the agent's _run_async_impl (or _run_live_impl) method is executed."],
        ["after_agent", "Called immediately after the agent's _run_async_impl (or _run_live_impl) method successfully completes."],
        ["before_model", "Called just before the generate_content_async (or equivalent) request is sent to the LLM within an LlmAgent's flow."],
        ["after_model", "Called just after a response (LlmResponse) is received from the LLM, before it's processed further by the invoking agent."],
        ["before_tool", "Called just before a specific tool's run_async method is invoked, after the LLM has generated a function call for it."],
        ["after_tool", "Called just after the tool's run_async method completes successfully."]
    ]);

    private static readonly callbackDialogTooltips = new Map<string, string>([
        ["before_agent", "Called immediately before the agent's _run_async_impl (or _run_live_impl) method is executed."],
        ["after_agent", "Called immediately after the agent's _run_async_impl (or _run_live_impl) method successfully completes."],
        ["before_model", "Called just before the generate_content_async (or equivalent) request is sent to the LLM within an LlmAgent's flow."],
        ["after_model", "Called just after a response (LlmResponse) is received from the LLM, before it's processed further by the invoking agent."],
        ["before_tool", "Called just before a specific tool's run_async method is invoked, after the LLM has generated a function call for it."],
        ["after_tool", "Called just after the tool's run_async method completes successfully."]
    ]);

    static getCallbackMenuTooltips(callbackName: string) {
        return TooltipUtil.callbackMenuTooltips.get(callbackName);
    }

    static getCallbackDialogTooltips(callbackName: string) {
        return TooltipUtil.callbackDialogTooltips.get(callbackName);
    }

}