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

import {
  Directive,
  Input,
  HostListener,
  ComponentRef,
  ViewContainerRef,
  inject,
  OnDestroy,
} from '@angular/core';
import {Overlay, OverlayRef, OverlayPositionBuilder} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {WorkflowGraphTooltipComponent} from '../components/workflow-graph-tooltip/workflow-graph-tooltip.component';
import {NodeState} from '../core/models/types';

@Directive({
  selector: '[appWorkflowGraphTooltip]',
  standalone: true,
})
export class WorkflowGraphTooltipDirective implements OnDestroy {
  @Input() appWorkflowGraphTooltip: {[key: string]: NodeState} | null = null;
  @Input() agentGraphData: any = null;
  @Input() nodePath: string | null = null;
  @Input() allNodes: {[path: string]: {[nodeName: string]: NodeState}} | null = null;

  private overlay = inject(Overlay);
  private overlayPositionBuilder = inject(OverlayPositionBuilder);
  private viewContainerRef = inject(ViewContainerRef);
  private overlayRef: OverlayRef | null = null;
  private isPinned = false;

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    event.stopPropagation();

    if (!this.appWorkflowGraphTooltip || Object.keys(this.appWorkflowGraphTooltip).length === 0) {
      return;
    }

    // Toggle pinned state
    if (this.isPinned) {
      this.hide();
    } else {
      this.showPinned();
    }
  }

  @HostListener('mouseenter')
  show() {
    // Don't show hover tooltip if already pinned
    if (this.isPinned) {
      return;
    }

    if (!this.appWorkflowGraphTooltip || Object.keys(this.appWorkflowGraphTooltip).length === 0) {
      return;
    }

    if (this.overlayRef) {
      return;
    }

    this.showTooltip(false);
  }

  @HostListener('mouseleave')
  hide() {
    // Don't hide if pinned
    if (this.isPinned) {
      return;
    }

    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  private showPinned() {
    // If tooltip is already showing from hover, dispose it first
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }

    this.isPinned = true;
    this.showTooltip(true);
  }

  private showTooltip(pinned: boolean) {
    if (this.overlayRef) {
      return;
    }

    const positionStrategy = this.overlayPositionBuilder
      .flexibleConnectedTo(this.viewContainerRef.element)
      .withPositions([
        {
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom',
          offsetY: -8,
        },
        {
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top',
          offsetY: 8,
        },
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close(),
      hasBackdrop: pinned,
      backdropClass: pinned ? 'cdk-overlay-transparent-backdrop' : undefined,
    });

    if (pinned && this.overlayRef) {
      this.overlayRef.backdropClick().subscribe(() => {
        this.isPinned = false;
        this.hide();
      });
    }

    const tooltipPortal = new ComponentPortal(WorkflowGraphTooltipComponent);
    const componentRef: ComponentRef<WorkflowGraphTooltipComponent> =
      this.overlayRef.attach(tooltipPortal);

    componentRef.instance.nodes = this.appWorkflowGraphTooltip;
    componentRef.instance.agentGraphData = this.agentGraphData;
    componentRef.instance.nodePath = this.nodePath;
    componentRef.instance.allNodes = this.allNodes;
    componentRef.instance.isPinned = pinned;
    componentRef.instance.onClose = () => {
      this.isPinned = false;
      this.hide();
    };
  }

  ngOnDestroy() {
    this.isPinned = false;
    this.hide();
  }
}
