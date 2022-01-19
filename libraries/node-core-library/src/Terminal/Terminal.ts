// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ITerminalProvider, TerminalProviderSeverity } from './ITerminalProvider';
import { IColorableSequence, ColorValue, Colors, eolSequence } from './Colors';
import { ITerminal } from './ITerminal';

/**
 * This class facilitates writing to a console.
 *
 * @beta
 */
export class Terminal implements ITerminal {
  private _providers: Set<ITerminalProvider>;

  public constructor(provider: ITerminalProvider) {
    this._providers = new Set<ITerminalProvider>();
    this._providers.add(provider);
  }

  /**
   * {@inheritdoc ITerminal.registerProvider}
   */
  public registerProvider(provider: ITerminalProvider): void {
    this._providers.add(provider);
  }

  /**
   * {@inheritdoc ITerminal.unregisterProvider}
   */
  public unregisterProvider(provider: ITerminalProvider): void {
    if (this._providers.has(provider)) {
      this._providers.delete(provider);
    }
  }

  /**
   * {@inheritdoc ITerminal.write}
   */
  public write(...messageParts: (string | IColorableSequence)[]): void {
    this._writeSegmentsToProviders(messageParts, TerminalProviderSeverity.log);
  }

  /**
   * {@inheritdoc ITerminal.writeLine}
   */
  public writeLine(...messageParts: (string | IColorableSequence)[]): void {
    this.write(...messageParts, eolSequence);
  }

  /**
   * {@inheritdoc ITerminal.writeWarning}
   */
  public writeWarning(...messageParts: (string | IColorableSequence)[]): void {
    this._writeSegmentsToProviders(
      messageParts.map(
        (part): IColorableSequence => ({
          ...Colors._normalizeStringOrColorableSequence(part),
          foregroundColor: ColorValue.Yellow
        })
      ),
      TerminalProviderSeverity.warning
    );
  }

  /**
   * {@inheritdoc ITerminal.writeWarningLine}
   */
  public writeWarningLine(...messageParts: (string | IColorableSequence)[]): void {
    this._writeSegmentsToProviders(
      [
        ...messageParts.map(
          (part): IColorableSequence => ({
            ...Colors._normalizeStringOrColorableSequence(part),
            foregroundColor: ColorValue.Yellow
          })
        ),
        eolSequence
      ],
      TerminalProviderSeverity.warning
    );
  }

  /**
   * {@inheritdoc ITerminal.writeError}
   */
  public writeError(...messageParts: (string | IColorableSequence)[]): void {
    this._writeSegmentsToProviders(
      messageParts.map(
        (part): IColorableSequence => ({
          ...Colors._normalizeStringOrColorableSequence(part),
          foregroundColor: ColorValue.Red
        })
      ),
      TerminalProviderSeverity.error
    );
  }

  /**
   * {@inheritdoc ITerminal.writeErrorLine}
   */
  public writeErrorLine(...messageParts: (string | IColorableSequence)[]): void {
    this._writeSegmentsToProviders(
      [
        ...messageParts.map(
          (part): IColorableSequence => ({
            ...Colors._normalizeStringOrColorableSequence(part),
            foregroundColor: ColorValue.Red
          })
        ),
        eolSequence
      ],
      TerminalProviderSeverity.error
    );
  }

  /**
   * {@inheritdoc ITerminal.writeVerbose}
   */
  public writeVerbose(...messageParts: (string | IColorableSequence)[]): void {
    this._writeSegmentsToProviders(messageParts, TerminalProviderSeverity.verbose);
  }

  /**
   * {@inheritdoc ITerminal.writeVerboseLine}
   */
  public writeVerboseLine(...messageParts: (string | IColorableSequence)[]): void {
    this.writeVerbose(...messageParts, eolSequence);
  }

  /**
   * {@inheritdoc ITerminal.writeDebug}
   */
  public writeDebug(...messageParts: (string | IColorableSequence)[]): void {
    this._writeSegmentsToProviders(messageParts, TerminalProviderSeverity.debug);
  }

  /**
   * {@inheritdoc ITerminal.writeDebugLine}
   */
  public writeDebugLine(...messageParts: (string | IColorableSequence)[]): void {
    this.writeDebug(...messageParts, eolSequence);
  }

  private _writeSegmentsToProviders(
    segments: (string | IColorableSequence)[],
    severity: TerminalProviderSeverity
  ): void {
    const withColorText: { [eolChar: string]: string } = {};
    const withoutColorText: { [eolChar: string]: string } = {};
    let withColorLines: string[] | undefined;
    let withoutColorLines: string[] | undefined;

    this._providers.forEach((provider) => {
      const eol: string = provider.eolCharacter;
      let textToWrite: string;
      if (provider.supportsColor) {
        if (!withColorLines) {
          withColorLines = Colors.serializeTextSegmentsToLines(segments, true);
        }

        if (!withColorText[eol]) {
          withColorText[eol] = withColorLines.join(eol);
        }

        textToWrite = withColorText[eol];
      } else {
        if (!withoutColorLines) {
          withoutColorLines = Colors.serializeTextSegmentsToLines(segments, false);
        }

        if (!withoutColorText[eol]) {
          withoutColorText[eol] = withoutColorLines.join(eol);
        }

        textToWrite = withoutColorText[eol];
      }

      provider.write(textToWrite, severity);
    });
  }
}
