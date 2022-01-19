// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineParser, CommandLineFlagParameter } from '@rushstack/ts-command-line';
import { InternalError, Terminal } from '@rushstack/node-core-library';

import { RunAction } from './RunAction';
import { InitAction } from './InitAction';

export class ApiExtractorCommandLine extends CommandLineParser {
  private _debugParameter!: CommandLineFlagParameter;

  public constructor(terminal: Terminal) {
    super({
      toolFilename: 'api-extractor',
      toolDescription:
        'API Extractor helps you build better TypeScript libraries.  It analyzes the main entry' +
        ' point for your package, collects the inventory of exported declarations, and then generates three kinds' +
        ' of output:  an API report file (.api.md) to facilitate reviews, a declaration rollup (.d.ts) to be' +
        ' published with your NPM package, and a doc model file (.api.json) to be used with a documentation' +
        ' tool such as api-documenter.  For details, please visit the web site.',
      terminal
    });
    this._populateActions();
  }

  protected onDefineParameters(): void {
    // override
    this._debugParameter = this.defineFlagParameter({
      parameterLongName: '--debug',
      parameterShortName: '-d',
      description: 'Show the full call stack if an error occurs while executing the tool'
    });
  }

  protected onExecute(): Promise<void> {
    // override
    if (this._debugParameter.value) {
      InternalError.breakInDebugger = true;
    }

    return super.onExecute().catch((error) => {
      if (this._debugParameter.value) {
        this.terminal.writeErrorLine();
        this.terminal.writeErrorLine(error.stack);
      } else {
        this.terminal.writeErrorLine();
        this.terminal.writeErrorLine('ERROR: ' + error.message.trim());
      }

      process.exitCode = 1;
    });
  }

  private _populateActions(): void {
    this.addAction(new InitAction(this, this.terminal));
    this.addAction(new RunAction(this, this.terminal));
  }
}
