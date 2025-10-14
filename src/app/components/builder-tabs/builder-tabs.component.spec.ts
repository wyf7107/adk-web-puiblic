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
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { BuilderTabsComponent } from './builder-tabs.component';
import { AGENT_BUILDER_SERVICE, AgentBuilderService } from '../../core/services/agent-builder.service';
import { AGENT_SERVICE } from '../../core/services/agent.service';
import { CallbackNode } from '../../core/models/AgentBuilder';

describe('BuilderTabsComponent - Callback Support', () => {
  let component: BuilderTabsComponent;
  let fixture: ComponentFixture<BuilderTabsComponent>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const agentServiceSpy = jasmine.createSpyObj('AgentService', [
      'getApp',
      'agentBuild',
    ]);
    agentServiceSpy.getApp.and.returnValue(of('TestApp'));

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [BuilderTabsComponent],
      providers: [
        {provide: AGENT_BUILDER_SERVICE, useExisting: AgentBuilderService},
        {provide: AGENT_SERVICE, useValue: agentServiceSpy},
        {provide: MatDialog, useValue: dialogSpy},
        {provide: MatSnackBar, useValue: snackBarSpy},
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BuilderTabsComponent);
    component = fixture.componentInstance;
  });

  describe('Callback Properties', () => {
    it('should have callback-related properties', () => {
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
        description: 'Test callback',
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
      const callback = {...mockCallback};

      component.onCallbackTypeChange(callback);

      expect(callback.type).toBe('before_agent');
    });
  });

  describe('Service Integration', () => {
    it('should subscribe to selected callback changes', () => {
      const mockCallback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(ctx): pass',
      };

      fixture.detectChanges(); // Trigger component initialization
      TestBed.inject(AgentBuilderService).setSelectedCallback(mockCallback);

      expect(component.selectedCallback).toBe(mockCallback);
      expect(component.selectedTabIndex).toBe(3); // Callback tab index
    });

    it('should subscribe to agent callback updates', () => {
      component.agentConfig = {
        name: 'test-agent',
        isRoot: true,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'test',
        sub_agents: [],
        tools: [],
        callbacks: [],
      };
      const mockCallbacks: CallbackNode[] = [
        {
          name: 'callback1',
          type: 'before_agent',
          code: 'def callback1(ctx): pass',
        },
      ];
      fixture.detectChanges(); // Trigger component initialization

      TestBed.inject(AgentBuilderService).setAgentCallbacks(
        'test-agent',
        mockCallbacks,
      );

      expect(component.agentConfig?.callbacks).toEqual(mockCallbacks);
    });
  });

  describe('Callback UI Behavior', () => {
    it('should set selectedTabIndex to 3 when selecting a callback', () => {
      const mockCallback: CallbackNode = {
        name: 'test_callback',
        type: 'before_agent',
        code: 'def test_callback(ctx): pass',
      };

      fixture.detectChanges();
      TestBed.inject(AgentBuilderService).setSelectedCallback(mockCallback);

      expect(component.selectedTabIndex).toBe(3);
      expect(component.editingCallback).toBe(mockCallback);
    });

    it('should handle null callback selection', () => {
      fixture.detectChanges();
      component.editingCallback = {
        name: 'test',
        type: 'before_agent',
        code: '',
      };

      TestBed.inject(AgentBuilderService).setSelectedCallback(undefined);

      expect(component.editingCallback).toBeNull();
    });
  });

  describe('Callback Code Field', () => {
    it('should initialize callback with empty code', () => {
      const mockCallback: CallbackNode = {
        name: 'new_callback',
        type: 'before_agent',
        code: '',
      };

      component.selectCallback(mockCallback);

      expect(component.editingCallback?.code).toBe('');
    });

    it('should preserve callback code when editing', () => {
      const customCode =
        'def my_callback(ctx):\n    print("Custom callback")\n    return None';
      const mockCallback: CallbackNode = {
        name: 'custom_callback',
        type: 'after_agent',
        code: customCode,
      };

      component.selectCallback(mockCallback);

      expect(component.editingCallback?.code).toBe(customCode);
    });

    it('should handle callback with description', () => {
      const mockCallback: CallbackNode = {
        name: 'descriptive_callback',
        type: 'before_tool',
        code: 'def callback(ctx): pass',
        description: 'This callback logs tool execution',
      };

      component.selectCallback(mockCallback);

      expect(component.editingCallback?.description).toBe(
        'This callback logs tool execution'
      );
    });
  });

  describe('Callback Type Validation', () => {
    it('should have all ADK callback types available', () => {
      const expectedTypes = [
        'before_agent',
        'before_model',
        'before_tool',
        'after_tool',
        'after_model',
        'after_agent',
      ];

      expect(component.callbackTypes).toEqual(expectedTypes);
    });
  });

  describe('Callback Error Handling', () => {
    it('should surface add callback errors to the user', () => {
      fixture.detectChanges();
      component.agentConfig = {
        name: 'test-agent',
        isRoot: true,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'test',
        sub_agents: [],
        tools: [],
        callbacks: [],
      };

      dialogSpy.open.and.returnValue({
        afterClosed: () => of({
          name: 'TestApp.invalid_callback',
          type: 'before_agent',
        }),
      } as any);

      const agentBuilderService = TestBed.inject(AgentBuilderService);
      spyOn(agentBuilderService, 'addCallback').and.returnValue({
        success: false,
        error: 'Callback name must follow format',
      });

      component.addCallback('before_agent');

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Callback name must follow format',
        'Close',
        jasmine.objectContaining({
          duration: 3000,
          panelClass: ['error-snackbar'],
        }),
      );
    });

    it('should surface update callback errors to the user', () => {
      fixture.detectChanges();
      const existingCallback: CallbackNode = {
        name: 'TestApp.callback',
        type: 'before_agent',
        code: '',
      };

      component.agentConfig = {
        name: 'test-agent',
        isRoot: true,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'test',
        sub_agents: [],
        tools: [],
        callbacks: [existingCallback],
      };

      dialogSpy.open.and.returnValue({
        afterClosed: () => of({
          isEditMode: true,
          name: 'TestApp.callback',
          type: 'before_agent',
        }),
      } as any);

      const agentBuilderService = TestBed.inject(AgentBuilderService);
      spyOn(agentBuilderService, 'updateCallback').and.returnValue({
        success: false,
        error: 'Duplicate callback',
      });

      component.editCallback(existingCallback);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Duplicate callback',
        'Close',
        jasmine.objectContaining({
          duration: 3000,
          panelClass: ['error-snackbar'],
        }),
      );
    });
  });

  describe('Panel Action State', () => {
    it('should disable tool, sub-agent, and callback actions when no agent is selected', () => {
      component.agentConfig = undefined;
      fixture.detectChanges();

      const actionButtons = fixture.nativeElement.querySelectorAll('button.panel-action-button');
      expect(actionButtons.length).toBeGreaterThan(0);
      actionButtons.forEach((button: HTMLButtonElement) => {
        expect(button.disabled).toBeTrue();
      });

      const disabledPanels = Array.from(
        fixture.nativeElement.querySelectorAll('.builder-panel-wrapper'),
      ) as HTMLElement[];
      disabledPanels.forEach(panel => {
        expect(panel.classList.contains('panel-disabled')).toBeTrue();
      });
    });

    it('should clear builder state when the selection is removed', () => {
      const agentBuilderService = TestBed.inject(AgentBuilderService);
      const callbacksSpy = spyOn(agentBuilderService, 'setAgentCallbacks').and.callThrough();
      const toolsSpy = spyOn(agentBuilderService, 'setAgentTools').and.callThrough();

      const agent: AgentNode = {
        name: 'TestAgent',
        isRoot: false,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'Test',
        sub_agents: [],
        tools: [],
        callbacks: [],
      };

      agentBuilderService.addNode(agent);
      agentBuilderService.setSelectedNode(agent);
      fixture.detectChanges();

      expect(component.agentConfig).toEqual(agent);
      expect(callbacksSpy).toHaveBeenCalledWith('TestAgent', []);
      expect(toolsSpy).toHaveBeenCalledWith('TestAgent', []);

      agentBuilderService.setSelectedNode(undefined);
      fixture.detectChanges();

      expect(component.agentConfig).toBeUndefined();
      expect(component.editingTool).toBeNull();
      expect(component.selectedTool).toBeUndefined();
      expect(component.editingCallback).toBeNull();
      expect(component.selectedCallback).toBeUndefined();
      expect(component.hierarchyPath.length).toBe(0);
      expect(component.displayBreadcrumbs.length).toBe(0);
      expect(component.header).toBe('Select an agent to edit');
      expect(callbacksSpy).toHaveBeenCalledWith();
      expect(toolsSpy).toHaveBeenCalledWith();
    });
  });

  describe('Breadcrumb Display', () => {
    function createAgent(name: string, isRoot = false): AgentNode {
      return {
        name,
        isRoot,
        agent_class: 'LlmAgent',
        model: '',
        instruction: '',
        sub_agents: [],
        tools: [],
        callbacks: [],
      };
    }

    it('should condense breadcrumbs with ellipsis when path is long', () => {
      component.hierarchyPath = [
        createAgent('root', true),
        createAgent('child1'),
        createAgent('child2'),
        createAgent('child3'),
      ];

      component['updateDisplayBreadcrumbs']();

      expect(component.displayBreadcrumbs.length).toBe(4);
      expect(component.displayBreadcrumbs[0].label).toBe('root');
      expect(component.displayBreadcrumbs[1].isEllipsis).toBeTrue();
      expect(component.displayBreadcrumbs[1].node).toBeUndefined();
      expect(component.displayBreadcrumbs[2].label).toBe('child2');
      expect(component.displayBreadcrumbs[3].label).toBe('child3');
    });

    it('should show full breadcrumbs when path is short', () => {
      component.hierarchyPath = [
        createAgent('root', true),
        createAgent('child1'),
      ];

      component['updateDisplayBreadcrumbs']();

      expect(component.displayBreadcrumbs.length).toBe(2);
      expect(component.displayBreadcrumbs[1].label).toBe('child1');
      expect(component.displayBreadcrumbs.some(crumb => crumb.isEllipsis)).toBeFalse();
    });
  });

  describe('Panel Resize', () => {
    const mouseEvent = (x: number): any => ({
      clientX: x,
      preventDefault: () => {},
      stopPropagation: () => {},
    });

    it('should increase width when dragging handle to the right', () => {
      const initialWidth = component.panelWidth;
      component.startResize(mouseEvent(400));
      component.onResizeMouseMove(mouseEvent(460));
      component.stopResize();

      expect(component.panelWidth).toBeGreaterThan(initialWidth);
    });

    it('should clamp width within allowed bounds and reset on double-click', () => {
      component.startResize(mouseEvent(400));
      component.onResizeMouseMove(mouseEvent(0));
      component.stopResize();

      expect(component.panelWidth).toBeGreaterThanOrEqual(320);

      component.panelWidth = 520;
      component.resetPanelWidth();
      expect(component.panelWidth).toBe(component.defaultPanelWidth);
    });
  });

  describe('Instructions Overlay', () => {
    it('should open overlay and populate draft from agent config', () => {
      const agentBuilderService = TestBed.inject(AgentBuilderService);
      const agent: AgentNode = {
        name: 'InstructionAgent',
        isRoot: false,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'Original instructions',
        sub_agents: [],
        tools: [],
        callbacks: [],
      };

      agentBuilderService.addNode(agent);
      agentBuilderService.setSelectedNode(agent);
      fixture.detectChanges();

      component.openInstructionsOverlay();

      expect(component.instructionsOverlayOpen).toBeTrue();
      expect(component.instructionsDraft).toBe('Original instructions');

      component.instructionsDraft = 'Updated instructions';
      component.closeInstructionsOverlay(true);

      expect(component.instructionsOverlayOpen).toBeFalse();
      expect(component.agentConfig?.instruction).toBe('Updated instructions');
    });

    it('should close overlay without saving when cancelled', () => {
      component.agentConfig = {
        name: 'TestAgent',
        isRoot: false,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'Keep me',
        sub_agents: [],
        tools: [],
        callbacks: [],
      };

      component.openInstructionsOverlay();
      component.instructionsDraft = 'Discarded';
      component.closeInstructionsOverlay(false);

      expect(component.instructionsOverlayOpen).toBeFalse();
      expect(component.agentConfig?.instruction).toBe('Keep me');
    });
  });

  describe('Agent Config with Callbacks', () => {
    it('should update agent callbacks when service emits update', () => {
      const cdr = (component as any).cdr;
      const markForCheckSpy = spyOn(cdr, 'markForCheck');
      fixture.detectChanges();
      component.agentConfig = {
        name: 'test-agent',
        isRoot: false,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'test instruction',
        sub_agents: [],
        tools: [],
        callbacks: [],
      };

      const newCallbacks: CallbackNode[] = [
        {name: 'callback1', type: 'before_agent', code: 'def cb1(ctx): pass'},
        {name: 'callback2', type: 'after_model', code: 'def cb2(ctx): pass'},
      ];

      TestBed.inject(AgentBuilderService).setAgentCallbacks('test-agent', newCallbacks);

      expect(component.agentConfig.callbacks?.length).toBe(2);
      expect(component.agentConfig.callbacks).toEqual(newCallbacks);
      expect(markForCheckSpy).toHaveBeenCalled();
    });

    it('should not update callbacks for different agent', () => {
      fixture.detectChanges();
      component.agentConfig = {
        name: 'current-agent',
        isRoot: false,
        agent_class: 'LlmAgent',
        model: 'gemini-2.5-flash',
        instruction: 'test',
        sub_agents: [],
        tools: [],
        callbacks: [],
      };

      const newCallbacks: CallbackNode[] = [
        {name: 'callback1', type: 'before_agent', code: 'def cb1(ctx): pass'},
      ];

      TestBed.inject(AgentBuilderService).setAgentCallbacks('different-agent', newCallbacks);

      expect(component.agentConfig.callbacks?.length).toBe(0);
    });
  });
});
