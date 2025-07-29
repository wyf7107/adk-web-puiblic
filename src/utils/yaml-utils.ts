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

import { AgentNode, ToolNode, YamlConfig  } from "../app/core/models/AgentBuilder";
import * as YAML from 'yaml';

export class YamlUtils {
  static generateYamlFile(agentNode: AgentNode, formData: FormData, appName: string) {
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

    const yamlString = YAML.stringify(yamlConfig);
    const blob = new Blob([yamlString], { type: 'application/x-yaml' });
    const file = new File([blob], folderName, { type: 'application/x-yaml' });
    
    formData.append('files', file);

    for (const subNode of agentNode.sub_agents ?? []) {
      this.generateYamlFile(subNode, formData, appName);
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

      if (tool.args && tool.args.length > 0) {
        config.args = tool.args.map(arg => {
          const value = arg.value;

          if (typeof value !== 'string') {
            return arg;
          }

          if (value.toLowerCase() === 'true') {
            return { ...arg, value: true };
          }

          if (value.toLowerCase() === 'false') {
            return { ...arg, value: false };
          }

          if (value.trim() !== '' && Number(value)) {
            return { ...arg, value: Number(value) };
          }

          return arg;
        });
      }

      return config;
    });
  }
}
