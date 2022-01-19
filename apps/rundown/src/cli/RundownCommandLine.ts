// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineParser } from '@rushstack/ts-command-line';

import { SnapshotAction } from './SnapshotAction';
import { InspectAction } from './InspectAction';
import { Terminal } from '@rushstack/node-core-library';

export class RundownCommandLine extends CommandLineParser {
  public constructor(terminal: Terminal) {
    super({
      toolFilename: 'rundown',
      toolDescription:
        'Detect load time regressions by running an app, tracing require() calls,' +
        ' and generating a deterministic report',
      terminal
    });

    this.addAction(new SnapshotAction(terminal));
    this.addAction(new InspectAction(terminal));
  }

  protected onDefineParameters(): void {}
}
