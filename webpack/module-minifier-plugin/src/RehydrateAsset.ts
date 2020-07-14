// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CachedSource, ConcatSource, ReplaceSource, Source } from 'webpack-sources';

import { CHUNK_MODULES_TOKEN } from './Constants';
import { IAssetInfo, IModuleMap, IModuleInfo } from './ModuleMinifierPlugin.types';

/**
 * Rehydrates an asset with minified modules.
 * @param asset - The asset
 * @param moduleMap - The minified modules
 * @param banner - A banner to inject for license information
 * @public
 */
export function rehydrateAsset(asset: IAssetInfo, moduleMap: IModuleMap, banner: string): Source {
  const { source: assetSource, modules } = asset;

  const assetCode: string = assetSource.source();

  const tokenIndex: number = assetCode.indexOf(CHUNK_MODULES_TOKEN);
  const suffixStart: number = tokenIndex + CHUNK_MODULES_TOKEN.length;
  const suffix: string = assetCode.slice(suffixStart);

  const prefix: ReplaceSource = new ReplaceSource(assetSource);
  // Preserve source map via fiddly logic
  prefix.replace(tokenIndex, assetCode.length, '');

  if (!modules.length) {
    // Empty chunk, degenerate case
    return new ConcatSource(banner, prefix, '[]', suffix);
  }

  const emptyFunction = 'function(){}'; // eslint-disable-line @typescript-eslint/typedef

  const source: ConcatSource = new ConcatSource(banner, prefix);

  const firstModuleId: string | number = modules[0];
  const lastModuleId: string | number = modules[modules.length - 1];

  // Extended logic from webpack.Template.getModulesArrayBounds
  const minId: number = typeof firstModuleId === 'number' ? firstModuleId : 0;
  const maxId: number = typeof lastModuleId === 'number' ? lastModuleId : Infinity;

  const simpleArrayOverhead: number = 2 + maxId;
  let concatArrayOverhead: number = simpleArrayOverhead + 9;

  let useObject: boolean = typeof firstModuleId !== 'number' || typeof lastModuleId !== 'number';
  let objectOverhead: number = 1;
  let lastId: number = 0;

  if (!useObject) {
    for (const id of modules) {
      if (typeof id !== 'number') {
        // This must be an object
        useObject = true;
        break;
      }

      // This is the extension from webpack.Template.getModulesArrayBounds
      // We can make smaller emit by injecting additional filler arrays
      const delta: number = id - lastId - 1;

      // Compare the length of `],Array(${delta}),[` to ','.repeat(delta + 1)
      const threshold: number = (lastId === 0 ? 7 : 11) + ('' + delta).length;
      const fillerArraySavings: number = delta + 1 - threshold;
      if (fillerArraySavings > 0) {
        concatArrayOverhead -= fillerArraySavings;
      }

      objectOverhead += 2 + ('' + id).length;
      lastId = id;
    }
  }

  const useConcat: boolean = concatArrayOverhead < simpleArrayOverhead;

  const arrayOverhead: number = useConcat ? concatArrayOverhead : simpleArrayOverhead;

  useObject = useObject || objectOverhead < arrayOverhead;

  if (useObject) {
    // Write an object literal
    let separator: '{' | ',' = '{';
    for (const id of modules) {
      source.add(`${separator}${JSON.stringify(id)}:`);
      separator = ',';

      const item: IModuleInfo | undefined = moduleMap.get(id);
      const moduleCode: Source | string = item ? item.source : emptyFunction;
      source.add(moduleCode);
    }

    source.add('}');
  } else {
    // Write one or more array literals, joined by Array(gap) expressions

    // There will never be more than 16 + ("" + minId).length consecutive commas, so 40 is more than will ever be used
    // This is because the above criteria triggers an Array(len) expression instead
    const enoughCommas: string = ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,';

    const useConcatAtStart: boolean = useConcat && minId > 8;
    lastId = useConcat ? minId : 0;
    // TODO: Just because we want to use concat elsewhere doesn't mean its optimal to use at the start
    let separator: string = useConcatAtStart ? `Array(${minId}).concat([` : '[';
    let concatInserted: boolean = useConcatAtStart;
    for (const id of modules) {
      const delta: number = (id as number) - lastId - 1;
      const deltaStr: string = '' + delta;
      const fillerArrayThreshold: number = 11 + deltaStr.length;

      const item: IModuleInfo | undefined = moduleMap.get(id);
      const moduleCode: Source | string = item ? item.source : emptyFunction;

      if (useConcat && delta + 1 > fillerArrayThreshold) {
        if (concatInserted) {
          source.add(`],Array(${deltaStr}),[`);
        } else {
          source.add(`].concat(Array(${deltaStr}),[`);
          concatInserted = true;
        }
      } else {
        source.add(separator + enoughCommas.slice(0, delta + 1));
      }
      lastId = id as number;
      source.add(moduleCode);

      separator = '';
    }

    source.add(useConcat ? '])' : ']');
  }

  source.add(suffix);

  return new CachedSource(source);
}
