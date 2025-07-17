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

import { Component, OnInit, Input, signal, computed, Signal } from '@angular/core';
import { AgentNode, ToolNode } from '../../core/models/AgentBuilder';

@Component({
  selector: 'app-builder-tabs',
  templateUrl: './builder-tabs.component.html',
  styleUrl: './builder-tabs.component.scss',
  standalone: false
})
export class BuilderTabsComponent implements OnInit {
  @Input() nodeData: any = null;

  // Agent configuration properties
  // agentConfig: AgentNode = {
  //   isRoot: this.nodeData?.isRoot || false,
  //   agentName: this.nodeData?.agentName || '',
  //   agentType: this.nodeData?.agentType || '',
  //   model: this.nodeData?.model || '',
  //   instructions: this.nodeData?.instructions || '',
  // };
  agentConfig: Signal<AgentNode> = computed(() => {
    return {
      isRoot: this.nodeData().isRoot || false,
      agentName: this.nodeData().agentName || '',
      agentType: this.nodeData().agentType || '',
      model: this.nodeData().model || '',
      instructions: this.nodeData().instructions || '',
    }
  })

  // TODO: Tool configuration properties - Will implement later
  /*
  toolConfig: ToolNode = {
    toolName: '',
    toolType: '',
    toolCode: ''
  };
  */

  // Agent configuration options
  isRootAgentEditable: boolean = true;
  selectedAgentType: string = '';
  selectedModel: string = '';
  models = [
    "gemini-2.5-flash"
  ];
  agentTypes = [
    'LlmAgent',
    'LoopAgent',
    'ParallelAgent',
    'SequentialAgent'
  ];

  // TODO: Tool configuration options - Will implement later
  /*
  selectedToolType: string = '';
  toolCode: string = '';
  toolTypes = [
    'inlineTool'
  ];
  */


  // Method to save agent configuration
  saveAgentConfig() {
    this.agentConfig().agentType = this.selectedAgentType;
    this.agentConfig().model = this.selectedModel;
    console.log('Agent config saved:', this.agentConfig);
  }

  // TODO: Method to save tool configuration - Will implement later
  /*
  saveToolConfig() {
    this.toolConfig.toolType = this.selectedToolType;
    this.toolConfig.toolCode = this.toolCode;
    console.log('Tool config saved:', this.toolConfig);
    }
  */

  ngOnInit() {
    // Initialize component
  }
}
