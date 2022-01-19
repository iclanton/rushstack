// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ConsoleTerminalProvider, PackageJsonLookup, Terminal } from '@rushstack/node-core-library';

import { RundownCommandLine } from './cli/RundownCommandLine';

const toolVersion: string = PackageJsonLookup.loadOwnPackageJson(__dirname).version;

const terminal: Terminal = new Terminal(new ConsoleTerminalProvider());

terminal.writeLine();
terminal.writeLine(`Rundown ${toolVersion} - https://rushstack.io`);
terminal.writeLine();

const commandLine: RundownCommandLine = new RundownCommandLine(terminal);
commandLine.execute().catch((error) => {
  terminal.writeErrorLine(error);
});
