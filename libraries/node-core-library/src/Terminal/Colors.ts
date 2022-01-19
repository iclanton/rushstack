// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

/**
 * @beta
 */
export interface IColorableSequence {
  text: string;
  isEol?: boolean;
  foregroundColor?: ColorValue;
  backgroundColor?: ColorValue;
  textAttributes?: TextAttribute[];
}

export const eolSequence: IColorableSequence = {
  isEol: true
} as IColorableSequence;

/**
 * Colors used with {@link IColorableSequence}.
 * @beta
 */
export enum ColorValue {
  Black,
  Red,
  Green,
  Yellow,
  Blue,
  Magenta,
  Cyan,
  White,
  Gray
}

/**
 * Text styles used with {@link IColorableSequence}.
 * @beta
 */
export enum TextAttribute {
  Bold,
  Dim,
  Underline,
  Blink,
  InvertColor,
  Hidden
}

export enum ConsoleColorCodes {
  BlackForeground = 30,
  RedForeground = 31,
  GreenForeground = 32,
  YellowForeground = 33,
  BlueForeground = 34,
  MagentaForeground = 35,
  CyanForeground = 36,
  WhiteForeground = 37,
  GrayForeground = 90,
  DefaultForeground = 39,

  BlackBackground = 40,
  RedBackground = 41,
  GreenBackground = 42,
  YellowBackground = 43,
  BlueBackground = 44,
  MagentaBackground = 45,
  CyanBackground = 46,
  WhiteBackground = 47,
  GrayBackground = 100,
  DefaultBackground = 49,

  Bold = 1,

  // On Linux, the "BoldOff" code instead causes the text to be double-underlined:
  // https://en.wikipedia.org/wiki/Talk:ANSI_escape_code#SGR_21%E2%80%94%60Bold_off%60_not_widely_supported
  // Use "NormalColorOrIntensity" instead
  // BoldOff = 21,

  Dim = 2,
  NormalColorOrIntensity = 22,
  Underline = 4,
  UnderlineOff = 24,
  Blink = 5,
  BlinkOff = 25,
  InvertColor = 7,
  InvertColorOff = 27,
  Hidden = 8,
  HiddenOff = 28
}

/**
 * The static functions on this class are used to produce colored text
 * for use with the node-core-library terminal.
 *
 * @example
 * terminal.writeLine(Colors.green('Green Text!'), ' ', Colors.blue('Blue Text!'));
 *
 * @beta
 */
export class Colors {
  public static black(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      foregroundColor: ColorValue.Black
    };
  }

  public static red(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      foregroundColor: ColorValue.Red
    };
  }

  public static green(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      foregroundColor: ColorValue.Green
    };
  }

  public static yellow(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      foregroundColor: ColorValue.Yellow
    };
  }

  public static blue(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      foregroundColor: ColorValue.Blue
    };
  }

  public static magenta(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      foregroundColor: ColorValue.Magenta
    };
  }

  public static cyan(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      foregroundColor: ColorValue.Cyan
    };
  }

  public static white(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      foregroundColor: ColorValue.White
    };
  }

  public static gray(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      foregroundColor: ColorValue.Gray
    };
  }

  public static blackBackground(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      backgroundColor: ColorValue.Black
    };
  }

  public static redBackground(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      backgroundColor: ColorValue.Red
    };
  }

  public static greenBackground(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      backgroundColor: ColorValue.Green
    };
  }

  public static yellowBackground(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      backgroundColor: ColorValue.Yellow
    };
  }

  public static blueBackground(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      backgroundColor: ColorValue.Blue
    };
  }

  public static magentaBackground(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      backgroundColor: ColorValue.Magenta
    };
  }

  public static cyanBackground(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      backgroundColor: ColorValue.Cyan
    };
  }

  public static whiteBackground(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      backgroundColor: ColorValue.White
    };
  }

  public static grayBackground(text: string | IColorableSequence): IColorableSequence {
    return {
      ...Colors._normalizeStringOrColorableSequence(text),
      backgroundColor: ColorValue.Gray
    };
  }

  public static bold(text: string | IColorableSequence): IColorableSequence {
    return Colors._applyTextAttribute(text, TextAttribute.Bold);
  }

  public static dim(text: string | IColorableSequence): IColorableSequence {
    return Colors._applyTextAttribute(text, TextAttribute.Dim);
  }

  public static underline(text: string | IColorableSequence): IColorableSequence {
    return Colors._applyTextAttribute(text, TextAttribute.Underline);
  }

  public static blink(text: string | IColorableSequence): IColorableSequence {
    return Colors._applyTextAttribute(text, TextAttribute.Blink);
  }

  public static invertColor(text: string | IColorableSequence): IColorableSequence {
    return Colors._applyTextAttribute(text, TextAttribute.InvertColor);
  }

  public static hidden(text: string | IColorableSequence): IColorableSequence {
    return Colors._applyTextAttribute(text, TextAttribute.Hidden);
  }

  public static serializeTextSegmentsToLines(
    segments: (string | IColorableSequence)[],
    withColor: boolean
  ): string[] {
    const lines: string[] = [];
    let segmentsToJoin: string[] = [];
    let lastSegmentWasEol: boolean = false;
    for (let i: number = 0; i < segments.length; i++) {
      const segment: IColorableSequence = Colors._normalizeStringOrColorableSequence(segments[i]);
      lastSegmentWasEol = !!segment.isEol;
      if (lastSegmentWasEol) {
        lines.push(segmentsToJoin.join(''));
        segmentsToJoin = [];
      } else {
        if (withColor) {
          const startColorCodes: number[] = [];
          const endColorCodes: number[] = [];
          switch (segment.foregroundColor) {
            case ColorValue.Black: {
              startColorCodes.push(ConsoleColorCodes.BlackForeground);
              endColorCodes.push(ConsoleColorCodes.DefaultForeground);
              break;
            }

            case ColorValue.Red: {
              startColorCodes.push(ConsoleColorCodes.RedForeground);
              endColorCodes.push(ConsoleColorCodes.DefaultForeground);
              break;
            }

            case ColorValue.Green: {
              startColorCodes.push(ConsoleColorCodes.GreenForeground);
              endColorCodes.push(ConsoleColorCodes.DefaultForeground);
              break;
            }

            case ColorValue.Yellow: {
              startColorCodes.push(ConsoleColorCodes.YellowForeground);
              endColorCodes.push(ConsoleColorCodes.DefaultForeground);
              break;
            }

            case ColorValue.Blue: {
              startColorCodes.push(ConsoleColorCodes.BlueForeground);
              endColorCodes.push(ConsoleColorCodes.DefaultForeground);
              break;
            }

            case ColorValue.Magenta: {
              startColorCodes.push(ConsoleColorCodes.MagentaForeground);
              endColorCodes.push(ConsoleColorCodes.DefaultForeground);
              break;
            }

            case ColorValue.Cyan: {
              startColorCodes.push(ConsoleColorCodes.CyanForeground);
              endColorCodes.push(ConsoleColorCodes.DefaultForeground);
              break;
            }

            case ColorValue.White: {
              startColorCodes.push(ConsoleColorCodes.WhiteForeground);
              endColorCodes.push(ConsoleColorCodes.DefaultForeground);
              break;
            }

            case ColorValue.Gray: {
              startColorCodes.push(ConsoleColorCodes.GrayForeground);
              endColorCodes.push(ConsoleColorCodes.DefaultForeground);
              break;
            }
          }

          switch (segment.backgroundColor) {
            case ColorValue.Black: {
              startColorCodes.push(ConsoleColorCodes.BlackBackground);
              endColorCodes.push(ConsoleColorCodes.DefaultBackground);
              break;
            }

            case ColorValue.Red: {
              startColorCodes.push(ConsoleColorCodes.RedBackground);
              endColorCodes.push(ConsoleColorCodes.DefaultBackground);
              break;
            }

            case ColorValue.Green: {
              startColorCodes.push(ConsoleColorCodes.GreenBackground);
              endColorCodes.push(ConsoleColorCodes.DefaultBackground);
              break;
            }

            case ColorValue.Yellow: {
              startColorCodes.push(ConsoleColorCodes.YellowBackground);
              endColorCodes.push(ConsoleColorCodes.DefaultBackground);
              break;
            }

            case ColorValue.Blue: {
              startColorCodes.push(ConsoleColorCodes.BlueBackground);
              endColorCodes.push(ConsoleColorCodes.DefaultBackground);
              break;
            }

            case ColorValue.Magenta: {
              startColorCodes.push(ConsoleColorCodes.MagentaBackground);
              endColorCodes.push(ConsoleColorCodes.DefaultBackground);
              break;
            }

            case ColorValue.Cyan: {
              startColorCodes.push(ConsoleColorCodes.CyanBackground);
              endColorCodes.push(ConsoleColorCodes.DefaultBackground);
              break;
            }

            case ColorValue.White: {
              startColorCodes.push(ConsoleColorCodes.WhiteBackground);
              endColorCodes.push(ConsoleColorCodes.DefaultBackground);
              break;
            }

            case ColorValue.Gray: {
              startColorCodes.push(ConsoleColorCodes.GrayBackground);
              endColorCodes.push(49);
              break;
            }
          }

          if (segment.textAttributes) {
            for (const textAttribute of segment.textAttributes) {
              switch (textAttribute) {
                case TextAttribute.Bold: {
                  startColorCodes.push(ConsoleColorCodes.Bold);
                  endColorCodes.push(ConsoleColorCodes.NormalColorOrIntensity);
                  break;
                }

                case TextAttribute.Dim: {
                  startColorCodes.push(ConsoleColorCodes.Dim);
                  endColorCodes.push(ConsoleColorCodes.NormalColorOrIntensity);
                  break;
                }

                case TextAttribute.Underline: {
                  startColorCodes.push(ConsoleColorCodes.Underline);
                  endColorCodes.push(ConsoleColorCodes.UnderlineOff);
                  break;
                }

                case TextAttribute.Blink: {
                  startColorCodes.push(ConsoleColorCodes.Blink);
                  endColorCodes.push(ConsoleColorCodes.BlinkOff);
                  break;
                }

                case TextAttribute.InvertColor: {
                  startColorCodes.push(ConsoleColorCodes.InvertColor);
                  endColorCodes.push(ConsoleColorCodes.InvertColorOff);
                  break;
                }

                case TextAttribute.Hidden: {
                  startColorCodes.push(ConsoleColorCodes.Hidden);
                  endColorCodes.push(ConsoleColorCodes.HiddenOff);
                  break;
                }
              }
            }
          }

          for (let j: number = 0; j < startColorCodes.length; j++) {
            const code: number = startColorCodes[j];
            segmentsToJoin.push(...['\u001b[', code.toString(), 'm']);
          }

          segmentsToJoin.push(segment.text);

          for (let j: number = endColorCodes.length - 1; j >= 0; j--) {
            const code: number = endColorCodes[j];
            segmentsToJoin.push(...['\u001b[', code.toString(), 'm']);
          }
        } else {
          segmentsToJoin.push(segment.text);
        }
      }
    }

    if (segmentsToJoin.length > 0) {
      lines.push(segmentsToJoin.join(''));
    }

    if (lastSegmentWasEol) {
      lines.push('');
    }

    return lines;
  }

  /**
   * If called with a string, returns the string wrapped in a {@link IColorableSequence}.
   * If called with a {@link IColorableSequence}, returns the {@link IColorableSequence}.
   *
   * @internal
   */
  public static _normalizeStringOrColorableSequence(value: string | IColorableSequence): IColorableSequence {
    if (typeof value === 'string') {
      return {
        text: value
      };
    } else {
      return value;
    }
  }

  private static _applyTextAttribute(
    text: string | IColorableSequence,
    attribute: TextAttribute
  ): IColorableSequence {
    const sequence: IColorableSequence = Colors._normalizeStringOrColorableSequence(text);
    if (!sequence.textAttributes) {
      sequence.textAttributes = [];
    }

    sequence.textAttributes.push(attribute);
    return sequence;
  }
}
