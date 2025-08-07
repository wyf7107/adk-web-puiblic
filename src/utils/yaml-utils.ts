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

import { AgentNode, ToolNode, CallbackNode, YamlConfig  } from "../app/core/models/AgentBuilder";
import * as YAML from 'yaml';

export class YamlUtils {
  static generateYamlFile(
    agentNode: AgentNode,
    formData: FormData,
    appName: string,
    allTabAgents: Map<string, AgentNode>,
    processedAgents: Set<string> = new Set(),
  ) {
    if (processedAgents.has(agentNode.name)) {
      return;
    }
    processedAgents.add(agentNode.name);

    const fileName = agentNode.isRoot ? 'root_agent.yaml' : `${agentNode.name}.yaml`;

    const folderName = `${appName}/${fileName}`;
    const subAgents = agentNode.sub_agents?
      agentNode.sub_agents.map((subAgentNode) => {return {config_path: `./${subAgentNode.name}.yaml`};}) : []

    const yamlConfig: YamlConfig = {
      name: agentNode.name,
      model: agentNode.model,
      agent_class: agentNode.agent_class,
      description: '',
      instruction: agentNode.instruction,
      sub_agents: subAgents,
      tools: this.buildToolsConfig(agentNode.tools)
    }

    // Add callbacks directly to root level if they exist
    const callbacksConfig = this.buildCallbacksConfig(agentNode.callbacks);
    if (Object.keys(callbacksConfig).length > 0) {
      Object.assign(yamlConfig, callbacksConfig);
    }

    const yamlString = YAML.stringify(yamlConfig);
    const blob = new Blob([yamlString], { type: 'application/x-yaml' });
    const file = new File([blob], folderName, { type: 'application/x-yaml' });
    
    formData.append('files', file);

    // Generate YAML files for sub-agents
    for (const subNode of agentNode.sub_agents ?? []) {
      this.generateYamlFile(subNode, formData, appName, allTabAgents, processedAgents);
    }

    // Generate YAML files for agent tools
    if (agentNode.tools) {
      for (const tool of agentNode.tools) {
        if (tool.toolType === 'Agent Tool') {
          const actualAgentName = tool.toolAgentName || tool.name;
          
          if (!actualAgentName || actualAgentName === 'undefined' || actualAgentName.trim() === '') {
            continue;
          }
          
          const agentToolNode = allTabAgents.get(actualAgentName);
          if (agentToolNode) {
            this.generateYamlFile(agentToolNode, formData, appName, allTabAgents, processedAgents);
          }
        }
      }
    }
  }

  static buildToolsConfig(tools: ToolNode[] | undefined): any[] {
    if (!tools || tools.length === 0) {
      return [];
    }

    return tools.map(tool => {
      const config: any = {
        name: tool.name,
      };

      // Handle agent tools with special format
      if (tool.toolType === 'Agent Tool') {
        config.name = 'AgentTool'; // Always use "AgentTool" as the tool name
        // Use toolAgentName for the actual agent name, fallback to name if toolAgentName is not set
        let actualAgentName = tool.toolAgentName || tool.name;

        // Skip if the agent name is empty, undefined, or "undefined"
        if (!actualAgentName || actualAgentName === 'undefined' || actualAgentName.trim() === '') {
          return null; // Skip this tool
        }

        config.args = {
          agent: {
            config_path: `./${actualAgentName}.yaml`
          }
        };
        return config;
      }

      // Handle regular tools
      if (tool.args && Array.isArray(tool.args) && tool.args.length > 0) {
        config.args = tool.args.reduce((acc, arg) => {
          let value: any = arg.value;

          if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            if (lowerValue === 'true') {
              value = true;
            } else if (lowerValue === 'false') {
              value = false;
            } else if (value.trim() !== '' && !isNaN(Number(value))) {
              value = Number(value);
            }
          }
          acc[arg.name] = value;
          return acc;
        }, {} as { [key: string]: any });
      }

      return config;
    }).filter(config => config !== null); // Filter out null results
  }

  static buildCallbacksConfig(callbacks: CallbackNode[] | undefined): any {
    if (!callbacks || callbacks.length === 0) {
      return {};
    }

    // Group callbacks by type
    const groupedCallbacks: { [key: string]: any[] } = {};
    
    callbacks.forEach(callback => {
      const callbackTypeKey = `${callback.type}_callbacks`;
      if (!groupedCallbacks[callbackTypeKey]) {
        groupedCallbacks[callbackTypeKey] = [];
      }
      groupedCallbacks[callbackTypeKey].push({
        name: callback.name
      });
    });

    return groupedCallbacks;
  }
}
