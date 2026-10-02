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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}

import {Deployment} from '../../core/models/Deploy';
import {initTestBed} from '../../testing/utils';

import {DeploymentPickerComponent} from './deployment-picker.component';

function deployment(fields: Partial<Deployment>): Deployment {
  return {
    id: 'a',
    target: 'agent_engine',
    region: 'us-central1',
    project: 'p',
    resourceName: 'projects/p/locations/us-central1/reasoningEngines/4679325224989097984',
    displayName: 'my_agent',
    labels: {},
    matchesApp: true,
    ...fields,
  };
}

const MINE = deployment({});
const OTHER = deployment({
  id: 'b',
  target: 'cloud_run',
  resourceName: 'other-svc',
  displayName: null,
  matchesApp: false,
});

describe('DeploymentPickerComponent', () => {
  let fixture: ComponentFixture<DeploymentPickerComponent>;

  initTestBed();  // required for 1p compat

  beforeEach(async () => {
    await TestBed
        .configureTestingModule({
          imports: [DeploymentPickerComponent],
          providers: [provideNoopAnimations()],
        })
        .compileComponents();
    fixture = TestBed.createComponent(DeploymentPickerComponent);
    fixture.componentRef.setInput('label', 'Showing logs from');
    fixture.componentRef.setInput('deployments', [MINE, OTHER]);
  });

  function text(selector: string): string {
    return (fixture.nativeElement.querySelector(selector)?.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim();
  }

  function openMenu(): HTMLElement[] {
    (fixture.nativeElement.querySelector('.source-picker') as HTMLElement)
        .click();
    fixture.detectChanges();
    return Array.from(document.querySelectorAll('.source-option'));
  }

  it('shows the selected deployment', () => {
    fixture.componentRef.setInput('selectedId', MINE.id);
    fixture.detectChanges();

    expect(text('.source-label')).toBe('Showing logs from');
    expect(text('.source-name')).toBe('my_agent');
    expect(text('.source-meta')).toContain('Agent Runtime · us-central1 · …097984');
    expect(text('.source-count')).toBe('2 deployments available');
  });

  it('asks for a choice when nothing is selected', () => {
    fixture.detectChanges();
    expect(text('.source-name')).toBe('Choose a deployment');
  });

  it('groups this agent\'s deployments first and emits a new choice', () => {
    fixture.componentRef.setInput('selectedId', MINE.id);
    fixture.componentRef.setInput(
        'optionNote', (d: Deployment) => d.target === 'cloud_run' ? 'note' : '');
    fixture.detectChanges();
    const chosen: Deployment[] = [];
    fixture.componentInstance.selectedChange.subscribe((d) => chosen.push(d));

    const options = openMenu();
    expect(Array.from(document.querySelectorAll('.menu-group'))
               .map((g) => g.textContent?.trim()))
        .toEqual(['This agent', 'Rest of project']);
    expect(options[1].textContent).toContain('other-svc');
    expect(options[1].textContent).toContain('note');

    options[0].click();
    expect(chosen).toEqual([]);
    openMenu()[1].click();
    expect(chosen).toEqual([OTHER]);
  });
});
