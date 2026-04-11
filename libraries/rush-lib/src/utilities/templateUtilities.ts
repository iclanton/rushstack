// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { FileSystem, NewlineKind } from '@rushstack/node-core-library';
import { Colorize } from '@rushstack/terminal';
import { processTemplate } from '@rushstack/file-templates';

import { Rush } from '../api/Rush';

// Copy the template from sourcePath, transform any macros, and write the output to destinationPath.
//
// We implement a simple template engine.  "Single-line section" macros have this form:
//
//     /*[LINE "NAME"]*/ (content goes here)
//
// ...and when commented out will look like this:
//
//     // (content goes here)
//
// "Block section" macros have this form:
//
//     /*[BEGIN "NAME"]*/
//     (content goes
//     here)
//     /*[END "NAME"]*/
//
// ...and when commented out will look like this:
//
//     // (content goes
//     // here)
//
// Lastly, a variable expansion has this form:
//
//     // The value is [%NAME%].
//
// ...and when expanded with e.g. "123" will look like this:
//
//     // The value is 123.
//
// The section names used by "rush init" are:
//
//   HYPOTHETICAL - always commented out
//   DEMO - uncommented only when the "--rush-example-repo" flag is NOT passed to "rush init"
//
// A single-line section may appear inside a block section, in which case it will get
// commented twice.
export async function copyTemplateFileAsync(
  sourcePath: string,
  destinationPath: string,
  overwrite: boolean,
  demo: boolean = false
): Promise<void> {
  const destinationFileExists: boolean = await FileSystem.existsAsync(destinationPath);

  if (!overwrite) {
    if (destinationFileExists) {
      // eslint-disable-next-line no-console
      console.log(Colorize.yellow('Not overwriting already existing file: ') + destinationPath);
      return;
    }
  }

  if (destinationFileExists) {
    // eslint-disable-next-line no-console
    console.log(Colorize.yellow(`Overwriting: ${destinationPath}`));
  } else {
    // eslint-disable-next-line no-console
    console.log(`Generating: ${destinationPath}`);
  }

  const templateText: string = await FileSystem.readFileAsync(sourcePath, {
    convertLineEndings: NewlineKind.Lf
  });

  // HYPOTHETICAL sections are intentionally omitted from activeSections — they are always commented out.
  // DEMO sections are shown only when the caller passes demo=false (i.e. "--rush-example-repo" is active).
  const activeSections: Set<string> = new Set<string>();
  if (!demo) {
    activeSections.add('DEMO');
  }

  const outputText: string = processTemplate(templateText, {
    variables: new Map<string, string>([['RUSH_VERSION', Rush.version]]),
    activeSections
  });

  // Write the output
  await FileSystem.writeFileAsync(destinationPath, outputText, {
    ensureFolderExists: true
  });
}
