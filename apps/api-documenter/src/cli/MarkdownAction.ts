// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ApiDocumenterCommandLine } from './ApiDocumenterCommandLine';
import { BaseAction } from './BaseAction';
import { MarkdownDocumenter } from '../documenters/MarkdownDocumenter';
import { Terminal } from '@rushstack/node-core-library';

export class MarkdownAction extends BaseAction {
  public constructor(parser: ApiDocumenterCommandLine, terminal: Terminal) {
    super(
      {
        actionName: 'markdown',
        summary: 'Generate documentation as Markdown files (*.md)',
        documentation:
          'Generates API documentation as a collection of files in' +
          ' Markdown format, suitable for example for publishing on a GitHub site.'
      },
      terminal
    );
  }

  protected async onExecute(): Promise<void> {
    // override
    const { apiModel, outputFolder } = this.buildApiModel();

    const markdownDocumenter: MarkdownDocumenter = new MarkdownDocumenter({
      terminal: this.terminal,
      apiModel,
      documenterConfig: undefined,
      outputFolder
    });
    markdownDocumenter.generateFiles();
  }
}
