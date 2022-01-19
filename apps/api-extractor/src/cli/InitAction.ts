// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'path';
import { Colors, FileSystem, ITerminal } from '@rushstack/node-core-library';
import { CommandLineAction } from '@rushstack/ts-command-line';

import { ApiExtractorCommandLine } from './ApiExtractorCommandLine';
import { ExtractorConfig } from '../api/ExtractorConfig';

export class InitAction extends CommandLineAction {
  private readonly _terminal: ITerminal;

  public constructor(parser: ApiExtractorCommandLine, terminal: ITerminal) {
    super({
      actionName: 'init',
      summary: `Create an ${ExtractorConfig.FILENAME} config file`,
      documentation:
        `Use this command when setting up API Extractor for a new project.  It writes an` +
        ` ${ExtractorConfig.FILENAME} config file template with code comments that describe all the settings.` +
        ` The file will be written in the current directory.`
    });
    this._terminal = terminal;
  }

  protected onDefineParameters(): void {
    // override
    // No parameters yet
  }

  protected async onExecute(): Promise<void> {
    // override
    const inputFilePath: string = path.resolve(__dirname, '../schemas/api-extractor-template.json');
    const outputFilePath: string = path.resolve(ExtractorConfig.FILENAME);

    if (FileSystem.exists(outputFilePath)) {
      this._terminal.writeLine(Colors.red('The output file already exists:'));
      this._terminal.writeLine();
      this._terminal.writeLine(outputFilePath);
      this._terminal.writeLine();
      throw new Error('Unable to write output file');
    }

    this._terminal.writeLine(Colors.green('Writing file: '), outputFilePath);
    FileSystem.copyFile({
      sourcePath: inputFilePath,
      destinationPath: outputFilePath
    });

    this._terminal.writeLine();
    this._terminal.writeLine(
      'The recommended location for this file is in the project\'s "config" subfolder, ' +
        'or else in the top-level folder with package.json.'
    );
  }
}
