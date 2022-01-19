// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineParser } from '@rushstack/ts-command-line';
import { MarkdownAction } from './MarkdownAction';
import { YamlAction } from './YamlAction';
import { GenerateAction } from './GenerateAction';
import { Terminal } from '@rushstack/node-core-library';

export class ApiDocumenterCommandLine extends CommandLineParser {
  public constructor(terminal: Terminal) {
    super({
      toolFilename: 'api-documenter',
      toolDescription:
        'Reads *.api.json files produced by api-extractor, ' +
        ' and generates API documentation in various output formats.',
      terminal
    });
    this._populateActions(terminal);
  }

  protected onDefineParameters(): void {
    // override
    // No parameters
  }

  private _populateActions(terminal: Terminal): void {
    this.addAction(new MarkdownAction(this, terminal));
    this.addAction(new YamlAction(this, terminal));
    this.addAction(new GenerateAction(this, terminal));
  }
}
