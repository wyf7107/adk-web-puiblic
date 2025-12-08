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

// 1p-ONLY-IMPORTS: import {beforeEach, describe, expect, it}
import {initTestBed} from '../../testing/utils';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeToggle } from './theme-toggle';
import {THEME_SERVICE} from '../../core/services/interfaces/theme';
import {MockThemeService} from '../../core/services/testing/mock-theme.service';
import { ThemeService } from '../../core/services/theme.service';

describe('ThemeToggle', () => {
  let component: ThemeToggle;
  let fixture: ComponentFixture<ThemeToggle>;
  let themeService: MockThemeService;

  beforeEach(async () => {
    themeService = new MockThemeService();

    initTestBed();  // required for 1p compat
    await TestBed.configureTestingModule({
      imports: [ThemeToggle],
      providers: [
        {provide: THEME_SERVICE, useValue: themeService},
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThemeToggle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle theme when clicked', () => {
    component.toggleTheme();
    expect(themeService.toggleTheme).toHaveBeenCalled();
  });

  it('should show correct icon for dark theme', () => {
    themeService.currentTheme.set('dark');
    expect(component.themeIcon).toBe('light_mode');
  });

  it('should show correct icon for light theme', () => {
    themeService.currentTheme.set('light');
    expect(component.themeIcon).toBe('dark_mode');
  });
});
