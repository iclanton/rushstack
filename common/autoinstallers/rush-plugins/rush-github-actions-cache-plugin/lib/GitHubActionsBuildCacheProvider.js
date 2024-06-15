"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
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
exports.GitHubActionsBuildCacheProvider = exports.isFeatureAvailable = void 0;
const cacheHttpClient = __importStar(require("./ref/cacheHttpClient"));
// Get this from @actions/cache
function isFeatureAvailable() {
    return !!process.env.ACTIONS_CACHE_URL;
}
exports.isFeatureAvailable = isFeatureAvailable;
const IS_SUPPORTED = isFeatureAvailable();
class GitHubActionsBuildCacheProvider {
    get isCacheWriteAllowed() {
        return IS_SUPPORTED;
    }
    async tryGetCacheEntryBufferByIdAsync(terminal, cacheId) {
        if (!IS_SUPPORTED) {
            return undefined;
        }
        const getCacheEntryResult = await cacheHttpClient.getCacheEntry([cacheId], [cacheId]);
        const archiveLocation = getCacheEntryResult === null || getCacheEntryResult === void 0 ? void 0 : getCacheEntryResult.archiveLocation;
        if (archiveLocation) {
            return await cacheHttpClient.downloadCacheToBuffer(archiveLocation);
        }
    }
    async trySetCacheEntryBufferAsync(terminal, cacheId, entryBuffer) {
        var _a, _b, _c, _d;
        try {
            const archiveFileSize = entryBuffer.length;
            const reserveCacheResponse = await cacheHttpClient.reserveCache(cacheId, [cacheId], {
                cacheSize: archiveFileSize
            });
            const newCacheId = (_a = reserveCacheResponse === null || reserveCacheResponse === void 0 ? void 0 : reserveCacheResponse.result) === null || _a === void 0 ? void 0 : _a.cacheId;
            if (newCacheId) {
                await cacheHttpClient.saveCacheBuffer(newCacheId, entryBuffer);
                return true;
            }
            else if ((reserveCacheResponse === null || reserveCacheResponse === void 0 ? void 0 : reserveCacheResponse.statusCode) === 400) {
                throw new Error((_c = (_b = reserveCacheResponse === null || reserveCacheResponse === void 0 ? void 0 : reserveCacheResponse.error) === null || _b === void 0 ? void 0 : _b.message) !== null && _c !== void 0 ? _c : `Cache size of ~${Math.round(archiveFileSize / (1024 * 1024))} MB (${archiveFileSize} B) is over the data cap limit, not saving cache.`);
            }
            else {
                throw new Error(`Unable to reserve cache with key ${cacheId}, another job may be creating this cache. More details: ${(_d = reserveCacheResponse === null || reserveCacheResponse === void 0 ? void 0 : reserveCacheResponse.error) === null || _d === void 0 ? void 0 : _d.message}`);
            }
        }
        catch (error) {
            terminal.writeErrorLine(`Failed to save cache: ${error}`);
            return false;
        }
    }
    async updateCachedCredentialAsync(terminal, credential) {
        throw new Error('Updating cache credentials is not supported by the GitHub Actions cache plugin.');
    }
    async updateCachedCredentialInteractiveAsync(terminal) {
        throw new Error('Updating cache credentials is not supported by the GitHub Actions cache plugin.');
    }
    async deleteCachedCredentialsAsync(terminal) {
        throw new Error('Deleting cache credentials is not supported by the GitHub Actions cache plugin.');
    }
}
exports.GitHubActionsBuildCacheProvider = GitHubActionsBuildCacheProvider;
//# sourceMappingURL=GitHubActionsBuildCacheProvider.js.map