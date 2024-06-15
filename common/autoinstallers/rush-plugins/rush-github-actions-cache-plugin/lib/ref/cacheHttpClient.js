"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCacheBuffer = exports.saveCache = exports.reserveCache = exports.downloadCache = exports.downloadCacheToBuffer = exports.getCacheEntry = exports.getCacheVersion = void 0;
/* eslint-disable */
const core = __importStar(require("@actions/core"));
const http_client_1 = require("@actions/http-client");
const auth_1 = require("@actions/http-client/lib/auth");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const url_1 = require("url");
const stream_1 = require("stream");
const utils = __importStar(require("./cacheUtils"));
const downloadUtils_1 = require("./downloadUtils");
const options_1 = require("./options");
const requestUtils_1 = require("./requestUtils");
const versionSalt = '1.0';
function getCacheApiUrl(resource) {
    const baseUrl = process.env['ACTIONS_CACHE_URL'] || '';
    if (!baseUrl) {
        throw new Error('Cache Service Url not found, unable to restore cache.');
    }
    const url = `${baseUrl}_apis/artifactcache/${resource}`;
    core.debug(`Resource Url: ${url}`);
    return url;
}
function createAcceptHeader(type, apiVersion) {
    return `${type};api-version=${apiVersion}`;
}
function getRequestOptions() {
    const requestOptions = {
        headers: {
            Accept: createAcceptHeader('application/json', '6.0-preview.1')
        }
    };
    return requestOptions;
}
function createHttpClient() {
    const token = process.env['ACTIONS_RUNTIME_TOKEN'] || '';
    const bearerCredentialHandler = new auth_1.BearerCredentialHandler(token);
    return new http_client_1.HttpClient('actions/cache', [bearerCredentialHandler], getRequestOptions());
}
function getCacheVersion(paths, compressionMethod, enableCrossOsArchive = false) {
    // don't pass changes upstream
    const components = paths.slice();
    // Add compression method to cache version to restore
    // compressed cache as per compression method
    if (compressionMethod) {
        components.push(compressionMethod);
    }
    // Only check for windows platforms if enableCrossOsArchive is false
    if (process.platform === 'win32' && !enableCrossOsArchive) {
        components.push('windows-only');
    }
    // Add salt to cache version to support breaking changes in cache entry
    components.push(versionSalt);
    return crypto.createHash('sha256').update(components.join('|')).digest('hex');
}
exports.getCacheVersion = getCacheVersion;
async function getCacheEntry(keys, paths, options) {
    const httpClient = createHttpClient();
    const version = getCacheVersion(paths, options === null || options === void 0 ? void 0 : options.compressionMethod, options === null || options === void 0 ? void 0 : options.enableCrossOsArchive);
    const resource = `cache?keys=${encodeURIComponent(keys.join(','))}&version=${version}`;
    const response = await (0, requestUtils_1.retryTypedResponse)('getCacheEntry', async () => httpClient.getJson(getCacheApiUrl(resource)));
    // Cache not found
    if (response.statusCode === 204) {
        // List cache for primary key only if cache miss occurs
        if (core.isDebug()) {
            await printCachesListForDiagnostics(keys[0], httpClient, version);
        }
        return null;
    }
    if (!(0, requestUtils_1.isSuccessStatusCode)(response.statusCode)) {
        throw new Error(`Cache service responded with ${response.statusCode}`);
    }
    const cacheResult = response.result;
    const cacheDownloadUrl = cacheResult === null || cacheResult === void 0 ? void 0 : cacheResult.archiveLocation;
    if (!cacheDownloadUrl) {
        // Cache achiveLocation not found. This should never happen, and hence bail out.
        throw new Error('Cache not found.');
    }
    core.setSecret(cacheDownloadUrl);
    core.debug(`Cache Result:`);
    core.debug(JSON.stringify(cacheResult));
    return cacheResult;
}
exports.getCacheEntry = getCacheEntry;
async function printCachesListForDiagnostics(key, httpClient, version) {
    const resource = `caches?key=${encodeURIComponent(key)}`;
    const response = await (0, requestUtils_1.retryTypedResponse)('listCache', async () => httpClient.getJson(getCacheApiUrl(resource)));
    if (response.statusCode === 200) {
        const cacheListResult = response.result;
        const totalCount = cacheListResult === null || cacheListResult === void 0 ? void 0 : cacheListResult.totalCount;
        if (totalCount && totalCount > 0) {
            core.debug(`No matching cache found for cache key '${key}', version '${version} and scope ${process.env['GITHUB_REF']}. There exist one or more cache(s) with similar key but they have different version or scope. See more info on cache matching here: https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows#matching-a-cache-key \nOther caches with similar key:`);
            for (const cacheEntry of (cacheListResult === null || cacheListResult === void 0 ? void 0 : cacheListResult.artifactCaches) || []) {
                core.debug(`Cache Key: ${cacheEntry === null || cacheEntry === void 0 ? void 0 : cacheEntry.cacheKey}, Cache Version: ${cacheEntry === null || cacheEntry === void 0 ? void 0 : cacheEntry.cacheVersion}, Cache Scope: ${cacheEntry === null || cacheEntry === void 0 ? void 0 : cacheEntry.scope}, Cache Created: ${cacheEntry === null || cacheEntry === void 0 ? void 0 : cacheEntry.creationTime}`);
            }
        }
    }
}
async function downloadCacheToBuffer(archiveLocation, options) {
    let lastWrittenChunkLocation = 0;
    let writtenBytes = 0;
    const bufferChunks = [];
    await downloadCacheInternal(archiveLocation, (chunkBuffer, chunkLength = chunkBuffer.length, bufferPosition = lastWrittenChunkLocation) => {
        bufferChunks.push({ chunkBuffer, chunkLength, bufferPosition });
        lastWrittenChunkLocation = bufferPosition + chunkLength;
        writtenBytes = writtenBytes > lastWrittenChunkLocation ? writtenBytes : lastWrittenChunkLocation;
    }, () => writtenBytes, options);
    if (bufferChunks.length === 1) {
        const [{ chunkBuffer }] = bufferChunks;
        return chunkBuffer;
    }
    else if (bufferChunks.length === 0) {
        return Buffer.alloc(0);
    }
    else {
        const finalBuffer = Buffer.alloc(writtenBytes);
        for (const { chunkBuffer: buffer, bufferPosition: position, chunkLength: length } of bufferChunks) {
            buffer.copy(finalBuffer, position, 0, length);
        }
        return finalBuffer;
    }
}
exports.downloadCacheToBuffer = downloadCacheToBuffer;
async function downloadCache(archiveLocation, archivePath, options) {
    const archiveDescriptor = await fs.promises.open(archivePath, 'w');
    try {
        await downloadCacheInternal(archiveLocation, async (buffer, length, position) => {
            await archiveDescriptor.write(buffer, 0, length, position);
        }, () => utils.getArchiveFileSizeInBytes(archivePath), options);
    }
    finally {
        await archiveDescriptor.close();
    }
}
exports.downloadCache = downloadCache;
async function downloadCacheInternal(archiveLocation, onChunk, getWrittenLength, options) {
    const archiveUrl = new url_1.URL(archiveLocation);
    const downloadOptions = (0, options_1.getDownloadOptions)(options);
    if (archiveUrl.hostname.endsWith('.blob.core.windows.net')) {
        if (downloadOptions.useAzureSdk) {
            // Use Azure storage SDK to download caches hosted on Azure to improve speed and reliability.
            await (0, downloadUtils_1.downloadCacheStorageSDK)(archiveLocation, onChunk, getWrittenLength, downloadOptions);
        }
        else if (downloadOptions.concurrentBlobDownloads) {
            // Use concurrent implementation with HttpClient to work around blob SDK issue
            await (0, downloadUtils_1.downloadCacheHttpClientConcurrent)(archiveLocation, onChunk, downloadOptions);
        }
        else {
            // Otherwise, download using the Actions http-client.
            await (0, downloadUtils_1.downloadCacheHttpClient)(archiveLocation, onChunk, getWrittenLength);
        }
    }
    else {
        await (0, downloadUtils_1.downloadCacheHttpClient)(archiveLocation, onChunk, getWrittenLength);
    }
}
// Reserve Cache
async function reserveCache(key, paths, options) {
    const httpClient = createHttpClient();
    const version = getCacheVersion(paths, options === null || options === void 0 ? void 0 : options.compressionMethod, options === null || options === void 0 ? void 0 : options.enableCrossOsArchive);
    const reserveCacheRequest = {
        key,
        version,
        cacheSize: options === null || options === void 0 ? void 0 : options.cacheSize
    };
    const response = await (0, requestUtils_1.retryTypedResponse)('reserveCache', async () => httpClient.postJson(getCacheApiUrl('caches'), reserveCacheRequest));
    return response;
}
exports.reserveCache = reserveCache;
function getContentRange(start, end) {
    // Format: `bytes start-end/filesize
    // start and end are inclusive
    // filesize can be *
    // For a 200 byte chunk starting at byte 0:
    // Content-Range: bytes 0-199/*
    return `bytes ${start}-${end}/*`;
}
async function uploadChunk(httpClient, resourceUrl, openStream, start, end) {
    core.debug(`Uploading chunk of size ${end - start + 1} bytes at offset ${start} with content range: ${getContentRange(start, end)}`);
    const additionalHeaders = {
        'Content-Type': 'application/octet-stream',
        'Content-Range': getContentRange(start, end)
    };
    const uploadChunkResponse = await (0, requestUtils_1.retryHttpClientResponse)(`uploadChunk (start: ${start}, end: ${end})`, async () => httpClient.sendStream('PATCH', resourceUrl, openStream(), additionalHeaders));
    if (!(0, requestUtils_1.isSuccessStatusCode)(uploadChunkResponse.message.statusCode)) {
        throw new Error(`Cache service responded with ${uploadChunkResponse.message.statusCode} during upload chunk.`);
    }
}
async function uploadFile(httpClient, cacheId, fileSize, getReadStreamForChunk, options) {
    // Upload Chunks
    const resourceUrl = getCacheApiUrl(`caches/${cacheId.toString()}`);
    const uploadOptions = (0, options_1.getUploadOptions)(options);
    const concurrency = utils.assertDefined('uploadConcurrency', uploadOptions.uploadConcurrency);
    const maxChunkSize = utils.assertDefined('uploadChunkSize', uploadOptions.uploadChunkSize);
    const parallelUploads = [...new Array(concurrency).keys()];
    core.debug('Awaiting all uploads');
    let offset = 0;
    await Promise.all(parallelUploads.map(async () => {
        while (offset < fileSize) {
            const chunkSize = Math.min(fileSize - offset, maxChunkSize);
            const start = offset;
            const end = offset + chunkSize - 1;
            offset += maxChunkSize;
            await uploadChunk(httpClient, resourceUrl, () => getReadStreamForChunk(start, end), start, end);
        }
    }));
}
async function commitCache(httpClient, cacheId, filesize) {
    const commitCacheRequest = { size: filesize };
    return await (0, requestUtils_1.retryTypedResponse)('commitCache', async () => httpClient.postJson(getCacheApiUrl(`caches/${cacheId.toString()}`), commitCacheRequest));
}
async function saveCache(cacheId, archivePath, options) {
    const fileSize = utils.getArchiveFileSizeInBytes(archivePath);
    const fd = fs.openSync(archivePath, 'r');
    try {
        await saveCacheInner(cacheId, (start, end) => fs
            .createReadStream(archivePath, {
            fd,
            start,
            end,
            autoClose: false
        })
            .on('error', error => {
            throw new Error(`Cache upload failed because file read failed with ${error.message}`);
        }), fileSize, options);
    }
    finally {
        fs.closeSync(fd);
    }
}
exports.saveCache = saveCache;
async function saveCacheBuffer(cacheId, buffer, options) {
    await saveCacheInner(cacheId, (start, end) => stream_1.Readable.from(buffer.subarray(start, end + 1)), buffer.length, options);
}
exports.saveCacheBuffer = saveCacheBuffer;
async function saveCacheInner(cacheId, getReadStreamForChunk, cacheSize, options) {
    const httpClient = createHttpClient();
    core.debug('Upload cache');
    await uploadFile(httpClient, cacheId, cacheSize, getReadStreamForChunk, options);
    // Commit Cache
    core.debug('Committing cache');
    core.info(`Cache Size: ~${Math.round(cacheSize / (1024 * 1024))} MB (${cacheSize} B)`);
    const commitCacheResponse = await commitCache(httpClient, cacheId, cacheSize);
    if (!(0, requestUtils_1.isSuccessStatusCode)(commitCacheResponse.statusCode)) {
        throw new Error(`Cache service responded with ${commitCacheResponse.statusCode} during commit cache.`);
    }
    core.info('Cache saved successfully');
}
//# sourceMappingURL=cacheHttpClient.js.map