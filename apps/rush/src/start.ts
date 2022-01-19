// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

// We're using a path-based import here to minimize the amount of code that is evaluated before
// we check to see if the Node.js version is too old. If, for whatever reason, Rush crashes with
// an old Node.js version when evaluating one of the more complex imports, we'll at least
// shown a meaningful error message.
import { NodeJsCompatibility } from '@microsoft/rush-lib/lib/logic/NodeJsCompatibility';

if (NodeJsCompatibility.reportAncientIncompatibleVersion()) {
  // The Node.js version is known to have serious incompatibilities.  In that situation, the user
  // should downgrade Rush to an older release that supported their Node.js version.
  process.exit(1);
}

const alreadyReportedNodeTooNewError: boolean = NodeJsCompatibility.warnAboutVersionTooNew({
  isRushLib: false,
  alreadyReportedNodeTooNewError: false
});

import * as semver from 'semver';

import {
  Text,
  PackageJsonLookup,
  Terminal,
  ConsoleTerminalProvider,
  Colors
} from '@rushstack/node-core-library';
import { EnvironmentVariableNames } from '@microsoft/rush-lib';
import * as rushLib from '@microsoft/rush-lib';

import { RushCommandSelector } from './RushCommandSelector';
import { RushVersionSelector } from './RushVersionSelector';
import { MinimalRushConfiguration } from './MinimalRushConfiguration';

const terminal: Terminal = new Terminal(new ConsoleTerminalProvider());

// Load the configuration
const configuration: MinimalRushConfiguration | undefined =
  MinimalRushConfiguration.loadFromDefaultLocation();

const currentPackageVersion: string = PackageJsonLookup.loadOwnPackageJson(__dirname).version;

let rushVersionToLoad: string | undefined = undefined;

const previewVersion: string | undefined = process.env[EnvironmentVariableNames.RUSH_PREVIEW_VERSION];

if (previewVersion) {
  if (!semver.valid(previewVersion, false)) {
    terminal.writeErrorLine(
      `Invalid value for RUSH_PREVIEW_VERSION environment variable: "${previewVersion}"`
    );
    process.exit(1);
  }

  rushVersionToLoad = previewVersion;

  const lines: string[] = [];
  lines.push(
    `*********************************************************************`,
    `* WARNING! THE "RUSH_PREVIEW_VERSION" ENVIRONMENT VARIABLE IS SET.  *`,
    `*                                                                   *`,
    `* You are previewing Rush version:        ${Text.padEnd(previewVersion, 25)} *`
  );

  if (configuration) {
    lines.push(`* The rush.json configuration asks for:   ${Text.padEnd(configuration.rushVersion, 25)} *`);
  }

  lines.push(
    `*                                                                   *`,
    `* To restore the normal behavior, unset the RUSH_PREVIEW_VERSION    *`,
    `* environment variable.                                             *`,
    `*********************************************************************`
  );

  for (const line of lines) {
    terminal.writeLine(Colors.black(Colors.yellowBackground(line)));
  }
} else if (configuration) {
  rushVersionToLoad = configuration.rushVersion;
}

// If we are previewing an older Rush that doesn't understand the RUSH_PREVIEW_VERSION variable,
// then unset it.
if (rushVersionToLoad && semver.lt(rushVersionToLoad, '5.0.0-dev.18')) {
  delete process.env[EnvironmentVariableNames.RUSH_PREVIEW_VERSION];
}

// Rush is "managed" if its version and configuration are dictated by a repo's rush.json
const isManaged: boolean = !!configuration;
const launchOptions: rushLib.ILaunchOptions = { isManaged, alreadyReportedNodeTooNewError };

// If we're inside a repo folder, and it's requesting a different version, then use the RushVersionManager to
// install it
if (rushVersionToLoad && rushVersionToLoad !== currentPackageVersion) {
  const versionSelector: RushVersionSelector = new RushVersionSelector(currentPackageVersion, terminal);
  versionSelector
    .ensureRushVersionInstalledAsync(rushVersionToLoad, configuration, launchOptions)
    .catch((error: Error) => terminal.writeErrorLine('Error: ' + error.message));
} else {
  // Otherwise invoke the rush-lib that came with this rush package
  const rushCommandSelector: RushCommandSelector = new RushCommandSelector(terminal);
  rushCommandSelector.execute(currentPackageVersion, rushLib, launchOptions);
}
