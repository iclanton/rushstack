// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { Colors, ConsoleTerminalProvider, Terminal } from '@rushstack/node-core-library';

import { ApiExtractorCommandLine } from './cli/ApiExtractorCommandLine';
import { Extractor } from './api/Extractor';

const terminal: Terminal = new Terminal(new ConsoleTerminalProvider());
terminal.writeLine();
terminal.writeLine(
  Colors.bold(`api-extractor ${Extractor.version} `),
  Colors.bold(Colors.cyan(' - https://api-extractor.com/'))
);
terminal.writeLine();

const parser: ApiExtractorCommandLine = new ApiExtractorCommandLine(terminal);

parser.execute().catch((error) => {
  terminal.writeErrorLine(`An unexpected error occurred: ${error}`);
  process.exit(1);
});
