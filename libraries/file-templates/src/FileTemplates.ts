// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

// Matches a well-formed BEGIN macro starting a block section.
// Example:  /*[BEGIN "DEMO"]*/
//
// Group #1 is the indentation spaces before the macro
// Group #2 is the section name
const BEGIN_MACRO_REGEXP: RegExp = /^(\s*)\/\*\[BEGIN "([A-Z]+)"\]\s*\*\/\s*$/;

// Matches a well-formed END macro ending a block section.
// Example:  /*[END "DEMO"]*/
//
// Group #1 is the indentation spaces before the macro
// Group #2 is the section name
const END_MACRO_REGEXP: RegExp = /^(\s*)\/\*\[END "([A-Z]+)"\]\s*\*\/\s*$/;

// Matches a well-formed single-line section, including the space character after it if present.
// Example:  /*[LINE "HYPOTHETICAL"]*/
//
// Group #1 is the section name
const LINE_MACRO_REGEXP: RegExp = /\/\*\[LINE "([A-Z]+)"\]\s*\*\/\s?/;

// Matches a variable expansion.
// Example:  [%RUSH_VERSION%]
//
// Group #1 is the variable name including percent-sign markers (e.g. "%RUSH_VERSION%")
const VARIABLE_MACRO_REGEXP: RegExp = /\[(%[A-Z0-9_]+%)\]/;

// Matches anything that starts with "/*[" and ends with "]*/"
// Used to catch malformed macro expressions
const ANY_MACRO_REGEXP: RegExp = /\/\*\s*\[.*\]\s*\*\//;

/**
 * Options for {@link processTemplate}.
 * @public
 */
export interface IProcessTemplateOptions {
  /**
   * A map from variable name to replacement value. Variable names should be specified
   * without the `[%` and `%]` delimiter markers.
   *
   * @example
   * To expand `[%RUSH_VERSION%]`, add an entry with key `"RUSH_VERSION"`.
   */
  variables?: ReadonlyMap<string, string>;

  /**
   * The set of section names that should remain uncommented. Block sections delimited by
   * `/*[BEGIN "NAME"]*\/` and `/*[END "NAME"]*\/`, and inline `/*[LINE "NAME"]*\/` macros,
   * whose name is NOT in this set will be commented out with `//` prefixes.
   *
   * If this is `undefined` or empty, all sections will be commented out.
   */
  activeSections?: ReadonlySet<string>;
}

/**
 * Processes a template string, expanding variable macros and applying section visibility.
 *
 * @remarks
 * Three macro types are supported:
 *
 * **Block sections** — comment or uncomment multiple lines:
 * ```
 * /*[BEGIN "SECTION_NAME"]*\/
 * (content here)
 * /*[END "SECTION_NAME"]*\/
 * ```
 *
 * **Line macros** — comment or uncomment a single-line prefix:
 * ```
 * /*[LINE "SECTION_NAME"]*\/ content here
 * ```
 *
 * **Variable expansions** — replace a placeholder with a provided value:
 * ```
 * [%VARIABLE_NAME%]
 * ```
 *
 * Sections whose name is present in `options.activeSections` are left as-is; all others
 * are commented out by inserting `// ` after any leading indentation.  If a variable
 * referenced by `[%NAME%]` is not present in `options.variables`, an error is thrown.
 *
 * @throws `Error` if the template is malformed (unmatched sections, unknown variables,
 *   inconsistent indentation, etc.)
 *
 * @public
 */
export function processTemplate(templateText: string, options?: IProcessTemplateOptions): string {
  const { variables, activeSections } = options ?? {};

  const outputLines: string[] = [];
  const lines: string[] = templateText.split('\n');

  let activeBlockSectionName: string | undefined = undefined;
  let activeBlockIndent: string = '';

  for (const line of lines) {
    let match: RegExpMatchArray | null;

    // Check for a block section start
    // Example:  /*[BEGIN "DEMO"]*/
    match = line.match(BEGIN_MACRO_REGEXP);
    if (match) {
      if (activeBlockSectionName !== undefined) {
        throw new Error(
          `The template contains a nested BEGIN macro "${match[2]}" inside section "${activeBlockSectionName}"`
        );
      }
      activeBlockSectionName = match[2];
      activeBlockIndent = match[1];
      // Remove the entire line containing the macro
      continue;
    }

    // Check for a block section end
    // Example:  /*[END "DEMO"]*/
    match = line.match(END_MACRO_REGEXP);
    if (match) {
      if (activeBlockSectionName === undefined) {
        throw new Error(`The template contains an END macro "${match[2]}" without a matching BEGIN`);
      }
      if (activeBlockSectionName !== match[2]) {
        throw new Error(
          `The template contains a mismatched END macro "${match[2]}" (expected "${activeBlockSectionName}")`
        );
      }
      if (activeBlockIndent !== match[1]) {
        throw new Error(
          `The template contains inconsistently indented BEGIN/END macros for section "${activeBlockSectionName}"`
        );
      }
      activeBlockSectionName = undefined;
      // Remove the entire line containing the macro
      continue;
    }

    let transformedLine: string = line;

    // Check for a single-line section
    // Example:  /*[LINE "HYPOTHETICAL"]*/
    match = transformedLine.match(LINE_MACRO_REGEXP);
    if (match) {
      const sectionName: string = match[1];
      const isSectionActive: boolean = activeSections?.has(sectionName) ?? false;
      const replacement: string = isSectionActive ? '' : '// ';
      transformedLine = transformedLine.replace(LINE_MACRO_REGEXP, replacement);
    }

    // Check for variable expansions
    // Example:  [%RUSH_VERSION%]
    while ((match = transformedLine.match(VARIABLE_MACRO_REGEXP))) {
      const variableWithMarkers: string = match[1]; // e.g. "%RUSH_VERSION%"
      const variableName: string = variableWithMarkers.slice(1, -1); // e.g. "RUSH_VERSION"
      const value: string | undefined = variables?.get(variableName);
      if (value === undefined) {
        throw new Error(`The template references an undefined variable "[%${variableName}%]"`);
      }
      transformedLine = transformedLine.replace(VARIABLE_MACRO_REGEXP, value);
    }

    // Verify that all macros were handled
    match = transformedLine.match(ANY_MACRO_REGEXP);
    if (match) {
      throw new Error(`The template contains a malformed macro expression: ${JSON.stringify(match[0])}`);
    }

    // If we are inside a block section that is commented out, insert "//" after indentation
    if (activeBlockSectionName !== undefined) {
      const isSectionActive: boolean = activeSections?.has(activeBlockSectionName) ?? false;
      if (!isSectionActive) {
        // Verify the line starts with the expected indentation
        if (transformedLine.substring(0, activeBlockIndent.length).trim().length > 0) {
          throw new Error(
            `The template contains inconsistently indented lines inside section "${activeBlockSectionName}"`
          );
        }
        const contentAfterIndent: string = transformedLine.substring(activeBlockIndent.length);
        transformedLine = activeBlockIndent + '// ' + contentAfterIndent;
      }
    }

    outputLines.push(transformedLine);
  }

  if (activeBlockSectionName !== undefined) {
    throw new Error(`The template contains an unclosed BEGIN macro for section "${activeBlockSectionName}"`);
  }

  return outputLines.join('\n');
}
