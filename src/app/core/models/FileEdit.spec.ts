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

// 1p-ONLY-IMPORTS: import {describe, expect, it}
import {collapseUnchangedLines, DiffLine, diffLines, getFileEdit, getFileEditError, isFileEditCall} from './FileEdit';

function context(text: string): DiffLine {
  return {type: 'context', text};
}

function added(text: string): DiffLine {
  return {type: 'added', text};
}

function removed(text: string): DiffLine {
  return {type: 'removed', text};
}

describe('FileEdit', () => {
  describe('getFileEdit', () => {
    it('reads the path and the replaced text from an EditFile call', () => {
      expect(getFileEdit({
        name: 'EditFile',
        args: {path: 'app.py', old_string: 'a', new_string: 'b'},
      })).toEqual({path: 'app.py', oldText: 'a', newText: 'b'});
    });

    it('returns null for other tools and incomplete arguments', () => {
      expect(getFileEdit({name: 'WriteFile', args: {path: 'a', content: ''}}))
          .toBeNull();
      expect(getFileEdit({name: 'EditFile', args: {path: 'app.py'}})).toBeNull();
      expect(getFileEdit(undefined)).toBeNull();
      expect(isFileEditCall({name: 'Execute', args: {command: 'ls'}}))
          .toBeFalse();
    });
  });

  describe('getFileEditError', () => {
    it('returns the error of a failed edit', () => {
      expect(getFileEditError({
        name: 'EditFile',
        response: {status: 'error', error: 'File not found: a.py'},
      })).toBe('File not found: a.py');
      expect(getFileEditError({name: 'EditFile', response: {status: 'error'}}))
          .toBe('The edit failed.');
    });

    it('returns null for successful edits and other tools', () => {
      expect(getFileEditError({
        name: 'EditFile',
        response: {status: 'ok', message: 'Edited a.py'},
      })).toBeNull();
      expect(getFileEditError({
        name: 'Execute',
        response: {status: 'error', error: 'boom'},
      })).toBeNull();
    });
  });

  describe('diffLines', () => {
    it('keeps shared lines as context around the changed ones', () => {
      expect(diffLines('def f():\n    return 1\n', 'def f():\n    return 2\n'))
          .toEqual([
            context('def f():'),
            removed('    return 1'),
            added('    return 2'),
          ]);
    });

    it('matches lines that moved between insertions and deletions', () => {
      expect(diffLines('a\nb\nc\nd', 'a\nx\nc\nd\ne')).toEqual([
        context('a'),
        removed('b'),
        added('x'),
        context('c'),
        context('d'),
        added('e'),
      ]);
    });

    it('handles empty text and Windows line endings', () => {
      expect(diffLines('', 'new\n')).toEqual([added('new')]);
      expect(diffLines('old\r\n', '')).toEqual([removed('old')]);
      expect(diffLines('same\r\nline', 'same\nline')).toEqual([
        context('same'),
        context('line'),
      ]);
    });
  });

  describe('collapseUnchangedLines', () => {
    const lines = [
      ...['1', '2', '3', '4', '5'].map(context),
      removed('old'),
      added('new'),
      ...['6', '7', '8', '9', '10', '11', '12', '13'].map(context),
    ];

    it('folds unchanged lines far from any change', () => {
      expect(collapseUnchangedLines(lines, 2)).toEqual([
        {type: 'collapsed', lines: ['1', '2', '3'].map(context)},
        context('4'),
        context('5'),
        removed('old'),
        added('new'),
        context('6'),
        context('7'),
        {type: 'collapsed', lines: ['8', '9', '10', '11', '12', '13'].map(context)},
      ]);
    });

    it('shows a single far line instead of folding it', () => {
      expect(collapseUnchangedLines(lines.slice(2, 8), 2)).toEqual([
        context('3'),
        context('4'),
        context('5'),
        removed('old'),
        added('new'),
        context('6'),
      ]);
    });

    it('keeps diffs without changes whole', () => {
      const unchanged = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(context);
      expect(collapseUnchangedLines(unchanged, 1)).toEqual(unchanged);
    });
  });
});
