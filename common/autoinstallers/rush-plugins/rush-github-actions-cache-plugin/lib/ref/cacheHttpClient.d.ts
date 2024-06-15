/// <reference types="node" />
import { CompressionMethod } from './constants';
import { ArtifactCacheEntry, InternalCacheOptions, ReserveCacheResponse, ITypedResponseWithError } from './contracts';
import { DownloadOptions, UploadOptions } from './options';
export declare function getCacheVersion(paths: string[], compressionMethod?: CompressionMethod, enableCrossOsArchive?: boolean): string;
export declare function getCacheEntry(keys: string[], paths: string[], options?: InternalCacheOptions): Promise<ArtifactCacheEntry | null>;
export declare function downloadCacheToBuffer(archiveLocation: string, options?: DownloadOptions): Promise<Buffer>;
export declare function downloadCache(archiveLocation: string, archivePath: string, options?: DownloadOptions): Promise<void>;
export declare function reserveCache(key: string, paths: string[], options?: InternalCacheOptions): Promise<ITypedResponseWithError<ReserveCacheResponse>>;
export declare function saveCache(cacheId: number, archivePath: string, options?: UploadOptions): Promise<void>;
export declare function saveCacheBuffer(cacheId: number, buffer: Buffer, options?: UploadOptions): Promise<void>;
//# sourceMappingURL=cacheHttpClient.d.ts.map