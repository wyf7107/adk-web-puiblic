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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BuilderTabsComponent } from './builder-tabs.component';
import { AgentBuilderService } from '../../core/services/agent-builder.service';
import { AgentNode, CallbackNode, ToolNode } from '../../core/models/AgentBuilder';

describe('BuilderTabsComponent - Callback Support', () => {
  let component: BuilderTabsComponent;
  let fixture: ComponentFixture<BuilderTabsComponent>;
  let mockAgentBuilderService: jasmine.SpyObj<AgentBuilderService>;
  let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;

  beforeEach(async () => {
    const agentBuilderServiceSpy = jasmine.createSpyObj('AgentBuilderService', [
      'getSelectedNode',
      'getSelectedTool', 
      'getSelectedCallback',
      'getAgentTools',
      'getAgentCallbacks'
    ]);

    const changeDetectorRefSpy = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

    await TestBed.configureTestingModule({
      declarations: [BuilderTabsComponent],
      providers: [
        { provide: AgentBuilderService, useValue: agentBuilderServiceSpy },
        { provide: ChangeDetectorRef, useValue: changeDetectorRefSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BuilderTabsComponent);
    component = fixture.componentInstance;
    mockAgentBuilderService = TestBed.inject(AgentBuilderService) as jasmine.SpyObj<AgentBuilderService>;
    mockChangeDetectorRef = TestBed.inject(ChangeDetectorRef) as jasmine.SpyObj<ChangeDetectorRef>;

    // Setup default return values
    mockAgentBuilderService.getSelectedNode.and.returnValue(new BehaviorSubject<AgentNode | undefined>(undefined));
    mockAgentBuilderService.getSelectedTool.and.returnValue(new BehaviorSubject<ToolNode | undefined>(undefined));
    mockAgentBuilderService.getSelectedCallback.and.returnValue(new BehaviorSubject<CallbackNode | undefined>(undefined));
    mockAgentBuilderService.getAgentTools.and.returnValue(new BehaviorSubject<{ agentName: string, tools: ToolNode[] } | undefined>(undefined));
    mockAgentBuilderService.getAgentCallbacks.and.returnValue(new BehaviorSubject<{ agentName: string, callbacks: CallbackNode[] } | undefined>(undefined));
  });

  describe('Callback Properties', () => {
    it('should have callback-related properties', () => {
      expect(component.editingCallback).toBeDefined();
      expect(component.selectedCallback).toBeDefined();
      expect(component.callbackTypes).toBeDefined();
      expect(component.callbackTypes.length).toBe(6);
      expect(component.callbackTypes).toContain('before_agent');
      expect(component.callbackTypes).toContain('after_agent');
      expect(component.callbackTypes).toContain('before_model');
      expect(component.callbackTypes).toContain('after_model');
      expect(component.callbackTypes).toContain('before_tool');
      expect(component.callbackTypes).toContain('after_tool');
    });
  });

  describe('Callback Methods', () => {
    let mockCallback: CallbackNode;

    beforeEach(() => {
      mockCallback = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(ctx): pass',
        description: 'Test callback'
      };
    });

    it('should select callback correctly', () => {
      component.selectCallback(mockCallback);
      
      expect(component.editingCallback).toBe(mockCallback);
    });

    it('should navigate back to callback list', () => {
      component.editingCallback = mockCallback;
      
      component.backToCallbackList();
      
      expect(component.editingCallback).toBeNull();
    });

    it('should handle callback type change', () => {
      const callback = { ...mockCallback };
      
      component.onCallbackTypeChange(callback);
      
      expect(callback.type).toBe('before_agent');
    });
  });

  describe('Service Integration', () => {
    it('should subscribe to selected callback changes', () => {
      const callbackSubject = new BehaviorSubject<CallbackNode | undefined>(undefined);
      mockAgentBuilderService.getSelectedCallback.and.returnValue(callbackSubject);
      
      const mockCallback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(ctx): pass'
      };
      
      // Reinitialize component to trigger constructor
      component = new BuilderTabsComponent(mockChangeDetectorRef);
      
      callbackSubject.next(mockCallback);
      
      expect(component.selectedCallback).toBe(mockCallback);
      expect(component.selectedTabIndex).toBe(3); // Callback tab index
    });

    it('should subscribe to agent callback updates', () => {
      const callbacksSubject = new BehaviorSubject<{ agentName: string, callbacks: CallbackNode[] } | undefined>(undefined);
      mockAgentBuilderService.getAgentCallbacks.and.returnValue(callbacksSubject);
      
      component.agentConfig = {
        name: 'test-agent',
        isRoot: true,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'test',
        sub_agents: [],
        tools: [],
        callbacks: []
      };
      
      const mockCallbacks: CallbackNode[] = [{
        name: 'callback1',
        type: 'before_agent',
        code: 'def callback1(ctx): pass'
      }];
      
      // Reinitialize component to trigger constructor
      component = new BuilderTabsComponent(mockChangeDetectorRef);
      
      callbacksSubject.next({ agentName: 'test-agent', callbacks: mockCallbacks });
      
      expect(component.agentConfig?.callbacks).toBe(mockCallbacks);
    });
  });

  describe('Callback UI Behavior', () => {
    it('should set selectedTabIndex to 3 when selecting a callback', () => {
      const mockCallback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(ctx): pass'
      };
      
      const callbackSubject = new BehaviorSubject<CallbackNode | undefined>(undefined);
      mockAgentBuilderService.getSelectedCallback.and.returnValue(callbackSubject);
      
      component = new BuilderTabsComponent(mockChangeDetectorRef);
      callbackSubject.next(mockCallback);
      
      expect(component.selectedTabIndex).toBe(3);
      expect(component.editingCallback).toBe(mockCallback);
    });

    it('should handle null callback selection', () => {
      const callbackSubject = new BehaviorSubject<CallbackNode | undefined>(undefined);
      mockAgentBuilderService.getSelectedCallback.and.returnValue(callbackSubject);
      
      component = new BuilderTabsComponent(mockChangeDetectorRef);
      component.editingCallback = { name: 'test', type: 'before_agent', code: '' };
      
      callbackSubject.next(undefined);
      
      expect(component.editingCallback).toBeNull();
    });
  });

  describe('Callback Code Field', () => {
    it('should initialize callback with empty code', () => {
      const mockCallback: CallbackNode = {
        name: 'new_callback',
        type: 'before_agent',
        code: ''
      };
      
      component.selectCallback(mockCallback);
      
      expect(component.editingCallback?.code).toBe('');
    });

    it('should preserve callback code when editing', () => {
      const customCode = 'def my_callback(ctx):\n    print("Custom callback")\n    return None';
      const mockCallback: CallbackNode = {
        name: 'custom_callback',
        type: 'after_agent',
        code: customCode
      };
      
      component.selectCallback(mockCallback);
      
      expect(component.editingCallback?.code).toBe(customCode);
    });

    it('should handle callback with description', () => {
      const mockCallback: CallbackNode = {
        name: 'descriptive_callback',
        type: 'before_tool',
        code: 'def callback(ctx): pass',
        description: 'This callback logs tool execution'
      };
      
      component.selectCallback(mockCallback);
      
      expect(component.editingCallback?.description).toBe('This callback logs tool execution');
    });
  });

  describe('Callback Type Validation', () => {
    it('should have all ADK callback types available', () => {
      const expectedTypes = [
        'before_agent',
        'after_agent',
        'before_model',
        'after_model',
        'before_tool',
        'after_tool'
      ];
      
      expect(component.callbackTypes).toEqual(expectedTypes);
    });
  });

  describe('Agent Config with Callbacks', () => {
    it('should initialize agentConfig with empty callbacks array', () => {
      expect(component.agentConfig?.callbacks).toEqual([]);
    });

    it('should update agent callbacks when service emits update', () => {
      const callbacksSubject = new BehaviorSubject<{ agentName: string, callbacks: CallbackNode[] } | undefined>(undefined);
      mockAgentBuilderService.getAgentCallbacks.and.returnValue(callbacksSubject);
      
      component = new BuilderTabsComponent(mockChangeDetectorRef);
      component.agentConfig = {
        name: 'test-agent',
        isRoot: false,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'test instruction',
        sub_agents: [],
        tools: [],
        callbacks: []
      };
      
      const newCallbacks: CallbackNode[] = [
        { name: 'callback1', type: 'before_agent', code: 'def cb1(ctx): pass' },
        { name: 'callback2', type: 'after_model', code: 'def cb2(ctx): pass' }
      ];
      
      callbacksSubject.next({ agentName: 'test-agent', callbacks: newCallbacks });
      
      expect(component.agentConfig.callbacks?.length).toBe(2);
      expect(component.agentConfig.callbacks).toEqual(newCallbacks);
      expect(mockChangeDetectorRef.detectChanges).toHaveBeenCalled();
    });

    it('should not update callbacks for different agent', () => {
      const callbacksSubject = new BehaviorSubject<{ agentName: string, callbacks: CallbackNode[] } | undefined>(undefined);
      mockAgentBuilderService.getAgentCallbacks.and.returnValue(callbacksSubject);
      
      component = new BuilderTabsComponent(mockChangeDetectorRef);
      component.agentConfig = {
        name: 'current-agent',
        isRoot: false,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'test',
        sub_agents: [],
        tools: [],
        callbacks: []
      };
      
      const newCallbacks: CallbackNode[] = [
        { name: 'callback1', type: 'before_agent', code: 'def cb1(ctx): pass' }
      ];
      
      callbacksSubject.next({ agentName: 'different-agent', callbacks: newCallbacks });
      
      expect(component.agentConfig.callbacks?.length).toBe(0);
    });
  });
});