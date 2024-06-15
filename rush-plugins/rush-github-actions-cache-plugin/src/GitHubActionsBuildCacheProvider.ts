// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import type { ICloudBuildCacheProvider } from '@rushstack/rush-sdk';

import * as cacheHttpClient from './ref/cacheHttpClient';
import type { ArtifactCacheEntry, ITypedResponseWithError, ReserveCacheResponse } from './ref/contracts';

// Get this from @actions/cache
export function isFeatureAvailable(): boolean {
  return !!process.env.ACTIONS_CACHE_URL;
}

const IS_SUPPORTED: boolean = isFeatureAvailable();

export class GitHubActionsBuildCacheProvider implements ICloudBuildCacheProvider {
  public get isCacheWriteAllowed(): boolean {
    return IS_SUPPORTED;
  }

  public async tryGetCacheEntryBufferByIdAsync(
    terminal: ITerminal,
    cacheId: string
  ): Promise<Buffer | undefined> {
    if (!IS_SUPPORTED) {
      return undefined;
    }

    const getCacheEntryResult: ArtifactCacheEntry | null = await cacheHttpClient.getCacheEntry(
      [cacheId],
      [cacheId]
    );
    terminal.writeLine(`Restore cache data for ${cacheId}: ${JSON.stringify(getCacheEntryResult)}`);
    const archiveLocation: string | undefined = getCacheEntryResult?.archiveLocation;
    if (archiveLocation) {
      return await cacheHttpClient.downloadCacheToBuffer(archiveLocation);
    }
  }

  public async trySetCacheEntryBufferAsync(
    terminal: ITerminal,
    cacheId: string,
    entryBuffer: Buffer
  ): Promise<boolean> {
    try {
      const archiveFileSize: number = entryBuffer.length;
      const reserveCacheResponse: ITypedResponseWithError<ReserveCacheResponse> =
        await cacheHttpClient.reserveCache(cacheId, [cacheId], {
          cacheSize: archiveFileSize
        });

      terminal.writeLine(`Reserve cache data for ${cacheId}: ${JSON.stringify(reserveCacheResponse)}`);

      const newCacheId: number | undefined = reserveCacheResponse?.result?.cacheId;
      if (newCacheId) {
        await cacheHttpClient.saveCacheBuffer(newCacheId, entryBuffer);
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
          `Unable to reserve cache with key ${cacheId}, another job may be creating this cache. More details: ${reserveCacheResponse?.error?.message}`
        );
      }
    } catch (error) {
      terminal.writeErrorLine(`Failed to save cache: ${error}`);
      return false;
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
