// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import {
  type ICloudBuildCacheProvider,
  type RushSession,
  EnvironmentConfiguration
} from '@rushstack/rush-sdk';

export class GitHubActionsBuildCacheProvider implements ICloudBuildCacheProvider {
  public get isCacheWriteAllowed(): boolean {
    return EnvironmentConfiguration.buildCacheWriteAllowed ?? false;
  }

  public constructor(rushSession: RushSession) {}

  public async tryGetCacheEntryBufferByIdAsync(
    terminal: ITerminal,
    cacheId: string
  ): Promise<Buffer | undefined> {
    throw new Error('Method not implemented.');
  }

  public async trySetCacheEntryBufferAsync(
    terminal: ITerminal,
    cacheId: string,
    entryBuffer: Buffer
  ): Promise<boolean> {
    throw new Error('Method not implemented.');
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
