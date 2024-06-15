/// <reference types="node" />
import type { ITerminal } from '@rushstack/terminal';
import type { ICloudBuildCacheProvider } from '@rushstack/rush-sdk';
export declare function isFeatureAvailable(): boolean;
export declare class GitHubActionsBuildCacheProvider implements ICloudBuildCacheProvider {
    get isCacheWriteAllowed(): boolean;
    tryGetCacheEntryBufferByIdAsync(terminal: ITerminal, cacheId: string): Promise<Buffer | undefined>;
    trySetCacheEntryBufferAsync(terminal: ITerminal, cacheId: string, entryBuffer: Buffer): Promise<boolean>;
    updateCachedCredentialAsync(terminal: ITerminal, credential: string): Promise<void>;
    updateCachedCredentialInteractiveAsync(terminal: ITerminal): Promise<void>;
    deleteCachedCredentialsAsync(terminal: ITerminal): Promise<void>;
}
//# sourceMappingURL=GitHubActionsBuildCacheProvider.d.ts.map