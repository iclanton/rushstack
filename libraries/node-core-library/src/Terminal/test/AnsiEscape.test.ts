// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { AnsiEscape } from '../AnsiEscape';
import { Colors } from '../Colors';
import { StringBufferTerminalProvider } from '../StringBufferTerminalProvider';
import { Terminal } from '../Terminal';

describe('AnsiEscape', () => {
  test('calls removeCodes() successfully', () => {
    const terminalProvider: StringBufferTerminalProvider = new StringBufferTerminalProvider(
      true /* supportsColor */
    );
    const terminal: Terminal = new Terminal(terminalProvider);

    terminal.write(
      Colors.red('H'),
      Colors.yellow('e'),
      Colors.green('l'),
      Colors.blue('l'),
      Colors.magenta('o'),
      Colors.cyan(','),
      ' ',
      Colors.bold('w'),
      Colors.dim('o'),
      Colors.invertColor('r'),
      Colors.white('l'),
      Colors.gray('d'),
      Colors.underline('!')
    );

    const coloredInput: string = terminalProvider.getOutput({ normalizeSpecialCharacters: false });
    expect(coloredInput).toMatchSnapshot();
    const decoloredInput: string = AnsiEscape.removeCodes(coloredInput);
    expect(decoloredInput).toMatchInlineSnapshot(`"Hello, world!"`);
  });
});
