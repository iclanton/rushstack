// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import { FileSystem } from '@rushstack/node-core-library';
import type { ICloudBuildCacheProvider, RushConfiguration } from '@rushstack/rush-sdk';

import * as cacheHttpClient from './ref/cacheHttpClient';
import type { ArtifactCacheEntry, ITypedResponseWithError, ReserveCacheResponse } from './ref/contracts';

const IS_SUPPORTED: boolean = !!process.env.ACTIONS_CACHE_URL;

export class GitHubActionsBuildCacheProvider implements ICloudBuildCacheProvider {
  private readonly _tempPath: string;

  public get isCacheWriteAllowed(): boolean {
    return IS_SUPPORTED;
  }

  private constructor(tempPath: string) {
    this._tempPath = tempPath;
  }

  public static async initializeAsync(
    rushConfiguration: RushConfiguration
  ): Promise<GitHubActionsBuildCacheProvider> {
    const tempPath: string = `${rushConfiguration.commonTempFolder}/gh-actions-cache`;
    await FileSystem.ensureEmptyFolderAsync(tempPath);
    return new GitHubActionsBuildCacheProvider(tempPath);
  }

  public async tryGetCacheEntryBufferByIdAsync(
    terminal: ITerminal,
    cacheId: string
  ): Promise<Buffer | undefined> {
    if (!IS_SUPPORTED) {
      return undefined;
    }

    const augmentedCacheId: string = `000-${cacheId}`;
    const tempPath: string = `${this._tempPath}/${augmentedCacheId}`;
    const getCacheEntryResult: ArtifactCacheEntry | null = await cacheHttpClient.getCacheEntry(
      [augmentedCacheId],
      [tempPath]
    );
    terminal.writeLine(`Restore cache data for ${cacheId}: ${JSON.stringify(getCacheEntryResult)}`);
    const archiveLocation: string | undefined = getCacheEntryResult?.archiveLocation;
    if (archiveLocation) {
      await cacheHttpClient.downloadCache(archiveLocation, tempPath);
      const result: Buffer = await FileSystem.readFileToBufferAsync(tempPath);
      await FileSystem.deleteFileAsync(tempPath);
      return result;
    }
  }

  public async trySetCacheEntryBufferAsync(
    terminal: ITerminal,
    cacheId: string,
    entryBuffer: Buffer
  ): Promise<boolean> {
    const augmentedCacheId: string = `000-${cacheId}`;
    const tempPath: string = `${this._tempPath}/${augmentedCacheId}`;
    try {
      await FileSystem.writeFileAsync(tempPath, entryBuffer, { ensureFolderExists: true });

      const archiveFileSize: number = entryBuffer.length;
      const reserveCacheResponse: ITypedResponseWithError<ReserveCacheResponse> =
        await cacheHttpClient.reserveCache(augmentedCacheId, [tempPath], { cacheSize: archiveFileSize });

      terminal.writeLine(`Reserve cache data for ${cacheId}: ${JSON.stringify(reserveCacheResponse)}`);

      const newCacheId: number | undefined = reserveCacheResponse?.result?.cacheId;
      if (newCacheId) {
        await cacheHttpClient.saveCache(newCacheId, tempPath);
        return true;
      } else if (reserveCacheResponse?.statusCode === 400) {
        throw new Error(
          reserveCacheResponse?.error?.message ??
            `Cache size of ~${Math.round(
              archiveFileSize / (1024 * 1024)
            )} MB (${archiveFileSize} B) is over the data cap limit, not saving cache.`
        );
      } else {
        throw new Error(
          `Unable to reserve cache with key ${augmentedCacheId}, another job may be creating this cache. More details: ${reserveCacheResponse?.error?.message}`
        );
      }
    } catch (error) {
      terminal.writeErrorLine(`Failed to save cache: ${error}`);
      return false;
    } finally {
      await FileSystem.deleteFileAsync(tempPath);
    }
  }

  public async updateCachedCredentialAsync(terminal: ITerminal, credential: string): Promise<void> {
    throw new Error('Updating cache credentials is not supported by the GitHub Actions cache plugin.');
  }

  public async updateCachedCredentialInteractiveAsync(terminal: ITerminal): Promise<void> {
    throw new Error('Updating cache credentials is not supported by the GitHub Actions cache plugin.');
  }

  public async deleteCachedCredentialsAsync(terminal: ITerminal): Promise<void> {
    throw new Error('Deleting cache credentials is not supported by the GitHub Actions cache plugin.');
  }
}
