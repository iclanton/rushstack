// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineFlagParameter } from '@rushstack/ts-command-line';
import { Terminal } from '@rushstack/node-core-library';

import { BaseReportAction } from './BaseReportAction';
import { Rundown } from '../Rundown';

export class InspectAction extends BaseReportAction {
  private _terminal: Terminal;
  private _traceParameter!: CommandLineFlagParameter;

  public constructor(terminal: Terminal) {
    super({
      actionName: 'inspect',
      summary: 'Invoke a Node.js script and generate detailed diagnostic output',
      documentation:
        'Invoke a Node.js script and generate detailed diagnostic output.  This command is used' +
        ' to inspect performance regressions.'
    });
    this._terminal = terminal;
  }

  protected onDefineParameters(): void {
    super.onDefineParameters();

    this._traceParameter = this.defineFlagParameter({
      parameterLongName: '--trace-imports',
      parameterShortName: '-t',
      description: 'Reports the call chain for each module path, showing how it was imported'
    });
  }

  protected async onExecute(): Promise<void> {
    const rundown: Rundown = new Rundown(this._terminal);
    await rundown.invokeAsync(
      this.scriptParameter.value!,
      this.argsParameter.value,
      this.quietParameter.value!!,
      this.ignoreExitCodeParameter.value!!
    );
    rundown.writeInspectReport(this._traceParameter.value!!);
  }
}
