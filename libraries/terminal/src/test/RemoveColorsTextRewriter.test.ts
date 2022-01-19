// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { AnsiEscape, Colors } from '@rushstack/node-core-library';

import { RemoveColorsTextRewriter } from '../RemoveColorsTextRewriter';
import { TextRewriterState } from '../TextRewriter';

function testCase(inputs: string[]): void {
  const matcher: RemoveColorsTextRewriter = new RemoveColorsTextRewriter();
  const state: TextRewriterState = matcher.initialize();
  const outputs: string[] = inputs.map((x) => matcher.process(state, x));
  const closeOutput: string = matcher.close(state);
  if (closeOutput !== '') {
    outputs.push('--close--');
    outputs.push(closeOutput);
  }

  expect({
    inputs: inputs.map((x) => AnsiEscape.formatForTests(x)),
    outputs
  }).toMatchSnapshot();
}

describe('RemoveColorsTextRewriter', () => {
  it('01 should process empty inputs', () => {
    testCase([]);
    testCase(['']);
    testCase(['', 'a', '']);
  });

  it('02 should remove colors from complete chunks', () => {
    testCase(Colors.serializeTextSegmentsToLines([Colors.red('1')], true));
    testCase(Colors.serializeTextSegmentsToLines([Colors.red('1'), Colors.green('2')], true));
    testCase(Colors.serializeTextSegmentsToLines([Colors.red('1'), '2', Colors.green('3')], true));
  });

  it('03 should remove colors from 1-character chunks', () => {
    const source: string = Colors.serializeTextSegmentsToLines(['1', Colors.red('2')], true)[0];
    const inputs: string[] = [];
    for (let i: number = 0; i < source.length; ++i) {
      inputs.push(source.substr(i, 1));
    }
    testCase(inputs);
  });

  it('04 should pass through incomplete partial matches', () => {
    testCase(['\x1b']);
    testCase(['\x1b[\n']);
    testCase(['\x1b[1']);
  });
});
