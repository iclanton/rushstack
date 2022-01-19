// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { PackageJsonLookup, Terminal, ConsoleTerminalProvider, Colors } from '@rushstack/node-core-library';

import { ApiDocumenterCommandLine } from './cli/ApiDocumenterCommandLine';

const myPackageVersion: string = PackageJsonLookup.loadOwnPackageJson(__dirname).version;

const terminal: Terminal = new Terminal(new ConsoleTerminalProvider());
terminal.writeLine();
terminal.writeLine(
  Colors.bold(`api-documenter ${myPackageVersion} `),
  Colors.bold(Colors.cyan(' - https://api-extractor.com/'))
);
terminal.writeLine();

const parser: ApiDocumenterCommandLine = new ApiDocumenterCommandLine(terminal);

parser.execute().catch((error) => terminal.writeErrorLine(error)); // CommandLineParser.execute() should never reject the promise
