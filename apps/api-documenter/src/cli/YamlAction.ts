// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineFlagParameter } from '@rushstack/ts-command-line';

import { ApiDocumenterCommandLine } from './ApiDocumenterCommandLine';
import { BaseAction } from './BaseAction';

import { YamlDocumenter } from '../documenters/YamlDocumenter';
import { OfficeYamlDocumenter } from '../documenters/OfficeYamlDocumenter';
import { Terminal } from '@rushstack/node-core-library';

export class YamlAction extends BaseAction {
  private _officeParameter!: CommandLineFlagParameter;
  private _newDocfxNamespacesParameter!: CommandLineFlagParameter;

  public constructor(parser: ApiDocumenterCommandLine, terminal: Terminal) {
    super(
      {
        actionName: 'yaml',
        summary: 'Generate documentation as universal reference YAML files (*.yml)',
        documentation:
          'Generates API documentation as a collection of files conforming' +
          ' to the universal reference YAML format, which is used by the docs.microsoft.com' +
          ' pipeline.'
      },
      terminal
    );
  }

  protected onDefineParameters(): void {
    // override
    super.onDefineParameters();

    this._officeParameter = this.defineFlagParameter({
      parameterLongName: '--office',
      description: `Enables some additional features specific to Office Add-ins`
    });
    this._newDocfxNamespacesParameter = this.defineFlagParameter({
      parameterLongName: '--new-docfx-namespaces',
      description:
        `This enables an experimental feature that will be officially released with the next major version` +
        ` of API Documenter.  It requires DocFX 2.46 or newer.  It enables documentation for namespaces and` +
        ` adds them to the table of contents.  This will also affect file layout as namespaced items will be nested` +
        ` under a directory for the namespace instead of just within the package.`
    });
  }

  protected async onExecute(): Promise<void> {
    // override
    const { apiModel, inputFolder, outputFolder } = this.buildApiModel();

    const yamlDocumenter: YamlDocumenter = this._officeParameter.value
      ? new OfficeYamlDocumenter(
          this.terminal,
          apiModel,
          inputFolder,
          this._newDocfxNamespacesParameter.value
        )
      : new YamlDocumenter(this.terminal, apiModel, this._newDocfxNamespacesParameter.value);

    yamlDocumenter.generateFiles(outputFolder);
  }
}
