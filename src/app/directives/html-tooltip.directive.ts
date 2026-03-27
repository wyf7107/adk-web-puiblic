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

import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {Directive, ElementRef, HostListener, inject, Input, OnDestroy} from '@angular/core';
import {JsonTooltipComponent} from '../components/json-tooltip/json-tooltip.component';

@Directive({
  selector: '[appJsonTooltip]',
  standalone: true,
})
export class JsonTooltipDirective implements OnDestroy {
  @Input('appJsonTooltip') json: any = '';
  @Input('appJsonTooltipTitle') title: string = '';

  private overlayRef: OverlayRef | null = null;
  private readonly overlay = inject(Overlay);
  private readonly elementRef = inject(ElementRef);

  @HostListener('mouseenter')
  show() {
    if (!this.json) return;

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(this.elementRef)
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
        {
          originX: 'start',
          originY: 'top',
          overlayX: 'start',
          overlayY: 'bottom',
          offsetY: -8,
        },
        {
          originX: 'end',
          originY: 'top',
          overlayX: 'end',
          overlayY: 'bottom',
          offsetY: -8,
        }
      ])
      .withViewportMargin(16)
      .withPush(false);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close(),
      panelClass: 'json-tooltip-panel',
      maxWidth: '90vw',
    });

    const tooltipPortal = new ComponentPortal(JsonTooltipComponent);
    const tooltipRef = this.overlayRef.attach(tooltipPortal);
    tooltipRef.instance.json = this.json;
    tooltipRef.instance.title = this.title;
    tooltipRef.changeDetectorRef.detectChanges();
    this.overlayRef.updatePosition();
  }

  @HostListener('mouseleave')
  hide() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  ngOnDestroy() {
    this.hide();
  }
}
