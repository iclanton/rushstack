// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

// `null` appears throughout this file because the public surface mirrors `node:fs`
// callback / option conventions (which use `null`, not `undefined`) so that
// `VirtualFileSystem` instances can satisfy webpack's `OutputFileSystem` contract
// via a thin adapter without runtime translation.
/* eslint-disable @rushstack/no-new-null */

import * as nodeJsPath from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A path value accepted by {@link VirtualFileSystem} methods.
 * Mirrors the values accepted by the corresponding `node:fs` APIs.
 *
 * @public
 */
export type VirtualPathLike = string | Buffer | URL;

/**
 * A file content payload accepted by {@link VirtualFileSystem.writeFileSync}
 * and related write methods.
 *
 * @public
 */
export type VirtualFileContent = string | NodeJS.ArrayBufferView;

/**
 * Options for {@link VirtualFileSystem.writeFileSync} and
 * {@link VirtualFileSystem.appendFileSync}.
 *
 * @public
 */
export interface IVirtualFileSystemWriteFileOptions {
  encoding?: BufferEncoding | null;
  /**
   * Accepted for parity with `node:fs`, but the only honored value is `'a'` /
   * `'a+'` (treated as append). Anything else is treated as a normal write.
   */
  flag?: string;
}

/**
 * Options for `VirtualFileSystem.readFileSync`.
 *
 * @public
 */
export interface IVirtualFileSystemReadFileOptions {
  encoding?: BufferEncoding | null;
  flag?: string;
}

/**
 * Options for {@link VirtualFileSystem.mkdirSync}.
 *
 * @public
 */
export interface IVirtualFileSystemMkdirOptions {
  recursive?: boolean;
  /** Accepted for parity with `node:fs`; ignored. */
  mode?: number | string;
}

/**
 * Options for `VirtualFileSystem.readdirSync`.
 *
 * @public
 */
export interface IVirtualFileSystemReaddirOptions {
  withFileTypes?: boolean;
  encoding?: BufferEncoding | null;
}

/**
 * Options for {@link VirtualFileSystem.rmSync} and
 * {@link VirtualFileSystem.rmdirSync}.
 *
 * @public
 */
export interface IVirtualFileSystemRmOptions {
  recursive?: boolean;
  force?: boolean;
}

/**
 * Options for {@link VirtualFileSystem.cpSync}.
 *
 * @public
 */
export interface IVirtualFileSystemCpOptions {
  recursive?: boolean;
  force?: boolean;
  errorOnExist?: boolean;
}

/**
 * A subset of `fs.Stats` returned by {@link VirtualFileSystem.statSync}.
 *
 * @remarks
 * Symbolic links and devices are unsupported, so the matching `is*` methods
 * always return `false`. Time fields all reflect the same logical mtime.
 *
 * @public
 */
export class VirtualFileSystemStats {
  public readonly size: number;
  public readonly mtime: Date;
  public readonly mtimeMs: number;
  public readonly atime: Date;
  public readonly atimeMs: number;
  public readonly ctime: Date;
  public readonly ctimeMs: number;
  public readonly birthtime: Date;
  public readonly birthtimeMs: number;

  private readonly _isFile: boolean;

  /** @internal */
  public constructor(isFile: boolean, size: number, mtime: Date) {
    this._isFile = isFile;
    this.size = size;
    this.mtime = mtime;
    this.mtimeMs = mtime.getTime();
    this.atime = mtime;
    this.atimeMs = mtime.getTime();
    this.ctime = mtime;
    this.ctimeMs = mtime.getTime();
    this.birthtime = mtime;
    this.birthtimeMs = mtime.getTime();
  }

  public isFile(): boolean {
    return this._isFile;
  }
  public isDirectory(): boolean {
    return !this._isFile;
  }
  public isSymbolicLink(): boolean {
    return false;
  }
  public isBlockDevice(): boolean {
    return false;
  }
  public isCharacterDevice(): boolean {
    return false;
  }
  public isFIFO(): boolean {
    return false;
  }
  public isSocket(): boolean {
    return false;
  }
}

/**
 * A directory entry returned by `VirtualFileSystem.readdirSync`
 * when `withFileTypes` is `true`.
 *
 * @public
 */
export class VirtualFileSystemDirent {
  public readonly name: string;
  private readonly _isFile: boolean;

  /** @internal */
  public constructor(name: string, isFile: boolean) {
    this.name = name;
    this._isFile = isFile;
  }

  public isFile(): boolean {
    return this._isFile;
  }
  public isDirectory(): boolean {
    return !this._isFile;
  }
  public isSymbolicLink(): boolean {
    return false;
  }
  public isBlockDevice(): boolean {
    return false;
  }
  public isCharacterDevice(): boolean {
    return false;
  }
  public isFIFO(): boolean {
    return false;
  }
  public isSocket(): boolean {
    return false;
  }
}

interface IVfsFileNode {
  kind: 'file';
  data: Buffer;
  mtime: Date;
}

interface IVfsDirNode {
  kind: 'dir';
  entries: Map<string, IVfsFileNode | IVfsDirNode>;
  mtime: Date;
}

type VfsNode = IVfsFileNode | IVfsDirNode;

type ErrnoCode = 'ENOENT' | 'EEXIST' | 'ENOTDIR' | 'EISDIR' | 'ENOTEMPTY' | 'EINVAL' | 'EACCES';

const _ERRNO_VALUES: { [code in ErrnoCode]: number } = {
  ENOENT: -2,
  EEXIST: -17,
  ENOTDIR: -20,
  EISDIR: -21,
  ENOTEMPTY: -39,
  EINVAL: -22,
  EACCES: -13
};

type WriteFileCallback = (err: NodeJS.ErrnoException | null) => void;
type GenericCallback = (err: NodeJS.ErrnoException | null) => void;
type ReadFileCallback = (err: NodeJS.ErrnoException | null, data?: string | Buffer) => void;
type StatCallback = (err: NodeJS.ErrnoException | null, stats?: VirtualFileSystemStats) => void;
type ReaddirCallback = (
  err: NodeJS.ErrnoException | null,
  entries?: string[] | VirtualFileSystemDirent[]
) => void;
type MkdirCallback = (err: NodeJS.ErrnoException | null, result?: string) => void;
type MkdtempCallback = (err: NodeJS.ErrnoException | null, folder?: string) => void;
type RealpathCallback = (err: NodeJS.ErrnoException | null, resolvedPath?: string) => void;

/**
 * A POSIX-flavored, in-memory filesystem suitable for tests and other
 * scenarios where a writable filesystem is needed but disk I/O is not.
 *
 * @remarks
 * The instance owns a single tree of directories and files. Paths are
 * normalized via `node:path.resolve()`, so absolute POSIX and Windows paths
 * may both be used (they collapse onto the same internal tree). Symbolic
 * links, file descriptors, watchers, and read/write streams are not
 * supported.
 *
 * For webpack interoperability, use the adapter exported by
 * `@rushstack/webpack-plugin-utilities`.
 *
 * @public
 */
export class VirtualFileSystem {
  private readonly _root: IVfsDirNode;
  private _mkdtempCounter: number;
  private _promisesView: IVirtualFileSystemPromises | undefined = undefined;

  public constructor() {
    this._root = { kind: 'dir', entries: new Map(), mtime: new Date() };
    this._mkdtempCounter = 0;
  }

  // ===== Sync API =====

  public writeFileSync(
    filePath: VirtualPathLike,
    data: VirtualFileContent,
    options?: IVirtualFileSystemWriteFileOptions | BufferEncoding | null
  ): void {
    const normalizedOptions: IVirtualFileSystemWriteFileOptions = VirtualFileSystem._normalizeWriteOptions(options);
    const buffer: Buffer = VirtualFileSystem._dataToBuffer(data, normalizedOptions.encoding ?? undefined);
    const segments: string[] = this._splitPath(filePath);
    if (segments.length === 0) {
      throw VirtualFileSystem._createError('EISDIR', 'open', this._segmentsToString(segments));
    }
    const parentDir: IVfsDirNode = this._resolveParent(segments, 'open');
    const leaf: string = segments[segments.length - 1];
    const existing: VfsNode | undefined = parentDir.entries.get(leaf);
    const flag: string = normalizedOptions.flag ?? 'w';
    const append: boolean = flag === 'a' || flag === 'a+' || flag === 'ax' || flag === 'ax+';

    if (existing && existing.kind === 'dir') {
      throw VirtualFileSystem._createError('EISDIR', 'open', this._segmentsToString(segments));
    }
    const now: Date = new Date();
    if (existing && append) {
      existing.data = Buffer.concat([existing.data, buffer]);
      existing.mtime = now;
    } else {
      parentDir.entries.set(leaf, { kind: 'file', data: Buffer.from(buffer), mtime: now });
    }
    parentDir.mtime = now;
  }

  public appendFileSync(
    filePath: VirtualPathLike,
    data: VirtualFileContent,
    options?: IVirtualFileSystemWriteFileOptions | BufferEncoding | null
  ): void {
    const normalizedOptions: IVirtualFileSystemWriteFileOptions = VirtualFileSystem._normalizeWriteOptions(options);
    this.writeFileSync(filePath, data, { ...normalizedOptions, flag: 'a' });
  }

  public readFileSync(filePath: VirtualPathLike): Buffer;
  public readFileSync(
    filePath: VirtualPathLike,
    options: { encoding: BufferEncoding; flag?: string } | BufferEncoding
  ): string;
  public readFileSync(
    filePath: VirtualPathLike,
    options?: IVirtualFileSystemReadFileOptions | BufferEncoding | null
  ): string | Buffer;
  public readFileSync(
    filePath: VirtualPathLike,
    options?: IVirtualFileSystemReadFileOptions | BufferEncoding | null
  ): string | Buffer {
    const file: IVfsFileNode = this._resolveFile(this._splitPath(filePath), 'open');
    const encoding: BufferEncoding | null | undefined =
      typeof options === 'string' ? options : options?.encoding;
    if (encoding) {
      return file.data.toString(encoding);
    }
    return Buffer.from(file.data);
  }

  public existsSync(filePath: VirtualPathLike): boolean {
    try {
      this._resolveNode(this._splitPath(filePath));
      return true;
    } catch {
      return false;
    }
  }

  public statSync(filePath: VirtualPathLike): VirtualFileSystemStats {
    const node: VfsNode = this._resolveNode(this._splitPath(filePath));
    return VirtualFileSystem._nodeStats(node);
  }

  public lstatSync(filePath: VirtualPathLike): VirtualFileSystemStats {
    return this.statSync(filePath);
  }

  public mkdirSync(
    folderPath: VirtualPathLike,
    options?: IVirtualFileSystemMkdirOptions | boolean
  ): string | undefined {
    const recursive: boolean = typeof options === 'boolean' ? options : !!options?.recursive;
    const segments: string[] = this._splitPath(folderPath);
    if (segments.length === 0) {
      // Root already exists.
      if (recursive) {
        return undefined;
      }
      throw VirtualFileSystem._createError('EEXIST', 'mkdir', this._segmentsToString(segments));
    }
    let firstCreated: string | undefined;
    let cursor: IVfsDirNode = this._root;
    for (let i: number = 0; i < segments.length; i++) {
      const segment: string = segments[i];
      const isLast: boolean = i === segments.length - 1;
      const child: VfsNode | undefined = cursor.entries.get(segment);
      if (child === undefined) {
        if (!isLast && !recursive) {
          throw VirtualFileSystem._createError(
            'ENOENT',
            'mkdir',
            this._segmentsToString(segments.slice(0, i + 1))
          );
        }
        const newDir: IVfsDirNode = { kind: 'dir', entries: new Map(), mtime: new Date() };
        cursor.entries.set(segment, newDir);
        cursor.mtime = newDir.mtime;
        if (firstCreated === undefined) {
          firstCreated = this._segmentsToString(segments.slice(0, i + 1));
        }
        cursor = newDir;
      } else if (child.kind === 'dir') {
        if (isLast && !recursive) {
          throw VirtualFileSystem._createError('EEXIST', 'mkdir', this._segmentsToString(segments));
        }
        cursor = child;
      } else {
        throw VirtualFileSystem._createError(
          'ENOTDIR',
          'mkdir',
          this._segmentsToString(segments.slice(0, i + 1))
        );
      }
    }
    return recursive ? firstCreated : undefined;
  }

  public readdirSync(folderPath: VirtualPathLike): string[];
  public readdirSync(
    folderPath: VirtualPathLike,
    options: { withFileTypes: true; encoding?: BufferEncoding | null }
  ): VirtualFileSystemDirent[];
  public readdirSync(
    folderPath: VirtualPathLike,
    options?: IVirtualFileSystemReaddirOptions | BufferEncoding | null
  ): string[] | VirtualFileSystemDirent[];
  public readdirSync(
    folderPath: VirtualPathLike,
    options?: IVirtualFileSystemReaddirOptions | BufferEncoding | null
  ): string[] | VirtualFileSystemDirent[] {
    const dir: IVfsDirNode = this._resolveDir(this._splitPath(folderPath), 'scandir');
    const withFileTypes: boolean =
      typeof options === 'object' && options !== null ? !!options.withFileTypes : false;
    if (withFileTypes) {
      const result: VirtualFileSystemDirent[] = [];
      for (const [name, child] of dir.entries) {
        result.push(new VirtualFileSystemDirent(name, child.kind === 'file'));
      }
      return result;
    }
    return Array.from(dir.entries.keys());
  }

  public unlinkSync(filePath: VirtualPathLike): void {
    const segments: string[] = this._splitPath(filePath);
    if (segments.length === 0) {
      throw VirtualFileSystem._createError('EISDIR', 'unlink', this._segmentsToString(segments));
    }
    const parentDir: IVfsDirNode = this._resolveParent(segments, 'unlink');
    const leaf: string = segments[segments.length - 1];
    const existing: VfsNode | undefined = parentDir.entries.get(leaf);
    if (existing === undefined) {
      throw VirtualFileSystem._createError('ENOENT', 'unlink', this._segmentsToString(segments));
    }
    if (existing.kind === 'dir') {
      throw VirtualFileSystem._createError('EISDIR', 'unlink', this._segmentsToString(segments));
    }
    parentDir.entries.delete(leaf);
    parentDir.mtime = new Date();
  }

  public rmdirSync(folderPath: VirtualPathLike, options?: IVirtualFileSystemRmOptions): void {
    const segments: string[] = this._splitPath(folderPath);
    if (segments.length === 0) {
      throw VirtualFileSystem._createError('EINVAL', 'rmdir', this._segmentsToString(segments));
    }
    const parentDir: IVfsDirNode = this._resolveParent(segments, 'rmdir');
    const leaf: string = segments[segments.length - 1];
    const existing: VfsNode | undefined = parentDir.entries.get(leaf);
    if (existing === undefined) {
      throw VirtualFileSystem._createError('ENOENT', 'rmdir', this._segmentsToString(segments));
    }
    if (existing.kind !== 'dir') {
      throw VirtualFileSystem._createError('ENOTDIR', 'rmdir', this._segmentsToString(segments));
    }
    if (!options?.recursive && existing.entries.size > 0) {
      throw VirtualFileSystem._createError('ENOTEMPTY', 'rmdir', this._segmentsToString(segments));
    }
    parentDir.entries.delete(leaf);
    parentDir.mtime = new Date();
  }

  public rmSync(targetPath: VirtualPathLike, options?: IVirtualFileSystemRmOptions): void {
    const segments: string[] = this._splitPath(targetPath);
    if (segments.length === 0) {
      throw VirtualFileSystem._createError('EINVAL', 'rm', this._segmentsToString(segments));
    }
    let parentDir: IVfsDirNode;
    try {
      parentDir = this._resolveParent(segments, 'rm');
    } catch (err) {
      if (options?.force) {
        return;
      }
      throw err;
    }
    const leaf: string = segments[segments.length - 1];
    const existing: VfsNode | undefined = parentDir.entries.get(leaf);
    if (existing === undefined) {
      if (options?.force) {
        return;
      }
      throw VirtualFileSystem._createError('ENOENT', 'rm', this._segmentsToString(segments));
    }
    if (existing.kind === 'dir' && !options?.recursive) {
      throw VirtualFileSystem._createError('EISDIR', 'rm', this._segmentsToString(segments));
    }
    parentDir.entries.delete(leaf);
    parentDir.mtime = new Date();
  }

  public renameSync(oldPath: VirtualPathLike, newPath: VirtualPathLike): void {
    const oldSegments: string[] = this._splitPath(oldPath);
    const newSegments: string[] = this._splitPath(newPath);
    if (oldSegments.length === 0 || newSegments.length === 0) {
      throw VirtualFileSystem._createError('EINVAL', 'rename', this._segmentsToString(oldSegments));
    }
    const oldParent: IVfsDirNode = this._resolveParent(oldSegments, 'rename');
    const oldLeaf: string = oldSegments[oldSegments.length - 1];
    const node: VfsNode | undefined = oldParent.entries.get(oldLeaf);
    if (node === undefined) {
      throw VirtualFileSystem._createError('ENOENT', 'rename', this._segmentsToString(oldSegments));
    }
    const newParent: IVfsDirNode = this._resolveParent(newSegments, 'rename');
    const newLeaf: string = newSegments[newSegments.length - 1];
    const replaced: VfsNode | undefined = newParent.entries.get(newLeaf);
    if (replaced && replaced.kind === 'dir' && replaced.entries.size > 0) {
      throw VirtualFileSystem._createError('ENOTEMPTY', 'rename', this._segmentsToString(newSegments));
    }
    oldParent.entries.delete(oldLeaf);
    newParent.entries.set(newLeaf, node);
    const now: Date = new Date();
    oldParent.mtime = now;
    newParent.mtime = now;
  }

  public copyFileSync(srcPath: VirtualPathLike, destPath: VirtualPathLike): void {
    const file: IVfsFileNode = this._resolveFile(this._splitPath(srcPath), 'copyfile');
    const destSegments: string[] = this._splitPath(destPath);
    if (destSegments.length === 0) {
      throw VirtualFileSystem._createError('EISDIR', 'copyfile', this._segmentsToString(destSegments));
    }
    const destParent: IVfsDirNode = this._resolveParent(destSegments, 'copyfile');
    const destLeaf: string = destSegments[destSegments.length - 1];
    const destExisting: VfsNode | undefined = destParent.entries.get(destLeaf);
    if (destExisting && destExisting.kind === 'dir') {
      throw VirtualFileSystem._createError('EISDIR', 'copyfile', this._segmentsToString(destSegments));
    }
    const now: Date = new Date();
    destParent.entries.set(destLeaf, { kind: 'file', data: Buffer.from(file.data), mtime: now });
    destParent.mtime = now;
  }

  public cpSync(
    srcPath: VirtualPathLike,
    destPath: VirtualPathLike,
    options?: IVirtualFileSystemCpOptions
  ): void {
    const srcSegments: string[] = this._splitPath(srcPath);
    const destSegments: string[] = this._splitPath(destPath);
    const srcNode: VfsNode = this._resolveNode(srcSegments);
    if (srcNode.kind === 'dir' && !options?.recursive) {
      throw VirtualFileSystem._createError('EISDIR', 'cp', this._segmentsToString(srcSegments));
    }
    if (destSegments.length === 0) {
      throw VirtualFileSystem._createError('EINVAL', 'cp', this._segmentsToString(destSegments));
    }
    this._copyTree(srcNode, destSegments, !!options?.force, !!options?.errorOnExist);
  }

  public mkdtempSync(prefix: string): string {
    if (typeof prefix !== 'string' || prefix.length === 0) {
      throw VirtualFileSystem._createError('EINVAL', 'mkdtemp', prefix);
    }
    while (true) {
      const suffix: string = (this._mkdtempCounter++).toString(36).padStart(6, '0');
      const candidate: string = `${prefix}${suffix}`;
      const segments: string[] = this._splitPath(candidate);
      const parentDir: IVfsDirNode = this._resolveParent(segments, 'mkdtemp');
      const leaf: string = segments[segments.length - 1];
      if (parentDir.entries.has(leaf)) {
        continue;
      }
      const now: Date = new Date();
      parentDir.entries.set(leaf, { kind: 'dir', entries: new Map(), mtime: now });
      parentDir.mtime = now;
      return this._segmentsToString(segments);
    }
  }

  public accessSync(filePath: VirtualPathLike): void {
    this._resolveNode(this._splitPath(filePath));
  }

  public realpathSync(filePath: VirtualPathLike): string {
    const segments: string[] = this._splitPath(filePath);
    this._resolveNode(segments);
    return this._segmentsToString(segments);
  }

  public truncateSync(filePath: VirtualPathLike, length: number = 0): void {
    const file: IVfsFileNode = this._resolveFile(this._splitPath(filePath), 'open');
    if (length < file.data.length) {
      file.data = Buffer.from(file.data.subarray(0, length));
    } else if (length > file.data.length) {
      const padding: Buffer = Buffer.alloc(length - file.data.length);
      file.data = Buffer.concat([file.data, padding]);
    }
    file.mtime = new Date();
  }

  public utimesSync(filePath: VirtualPathLike, atime: Date | number, mtime: Date | number): void {
    void atime; // accepted for parity with fs.utimesSync; only mtime is tracked
    const node: VfsNode = this._resolveNode(this._splitPath(filePath));
    node.mtime = mtime instanceof Date ? mtime : new Date(mtime * 1000);
  }

  // ===== Async (callback) API – webpack-shaped =====

  public writeFile(
    filePath: VirtualPathLike,
    data: VirtualFileContent,
    options: IVirtualFileSystemWriteFileOptions | BufferEncoding | null,
    callback: WriteFileCallback
  ): void;
  public writeFile(
    filePath: VirtualPathLike,
    data: VirtualFileContent,
    callback: WriteFileCallback
  ): void;
  public writeFile(
    filePath: VirtualPathLike,
    data: VirtualFileContent,
    optionsOrCallback: IVirtualFileSystemWriteFileOptions | BufferEncoding | null | WriteFileCallback,
    maybeCallback?: WriteFileCallback
  ): void {
    const callback: WriteFileCallback = VirtualFileSystem._extractCallback(optionsOrCallback, maybeCallback);
    const opts: IVirtualFileSystemWriteFileOptions | BufferEncoding | null =
      typeof optionsOrCallback === 'function' ? null : optionsOrCallback;
    VirtualFileSystem._invoke(callback, () => {
      this.writeFileSync(filePath, data, opts);
    });
  }

  public appendFile(
    filePath: VirtualPathLike,
    data: VirtualFileContent,
    options: IVirtualFileSystemWriteFileOptions | BufferEncoding | null,
    callback: WriteFileCallback
  ): void;
  public appendFile(
    filePath: VirtualPathLike,
    data: VirtualFileContent,
    callback: WriteFileCallback
  ): void;
  public appendFile(
    filePath: VirtualPathLike,
    data: VirtualFileContent,
    optionsOrCallback: IVirtualFileSystemWriteFileOptions | BufferEncoding | null | WriteFileCallback,
    maybeCallback?: WriteFileCallback
  ): void {
    const callback: WriteFileCallback = VirtualFileSystem._extractCallback(optionsOrCallback, maybeCallback);
    const opts: IVirtualFileSystemWriteFileOptions | BufferEncoding | null =
      typeof optionsOrCallback === 'function' ? null : optionsOrCallback;
    VirtualFileSystem._invoke(callback, () => {
      this.appendFileSync(filePath, data, opts);
    });
  }

  public readFile(
    filePath: VirtualPathLike,
    options: IVirtualFileSystemReadFileOptions | BufferEncoding | null,
    callback: ReadFileCallback
  ): void;
  public readFile(filePath: VirtualPathLike, callback: ReadFileCallback): void;
  public readFile(
    filePath: VirtualPathLike,
    optionsOrCallback: IVirtualFileSystemReadFileOptions | BufferEncoding | null | ReadFileCallback,
    maybeCallback?: ReadFileCallback
  ): void {
    const callback: ReadFileCallback = VirtualFileSystem._extractCallback(optionsOrCallback, maybeCallback);
    const opts: IVirtualFileSystemReadFileOptions | BufferEncoding | null =
      typeof optionsOrCallback === 'function' ? null : optionsOrCallback;
    VirtualFileSystem._invokeWithResult(callback, () => this.readFileSync(filePath, opts));
  }

  public stat(filePath: VirtualPathLike, callback: StatCallback): void;
  public stat(filePath: VirtualPathLike, options: object, callback: StatCallback): void;
  public stat(
    filePath: VirtualPathLike,
    optionsOrCallback: object | StatCallback,
    maybeCallback?: StatCallback
  ): void {
    const callback: StatCallback = VirtualFileSystem._extractCallback(optionsOrCallback, maybeCallback);
    VirtualFileSystem._invokeWithResult(callback, () => this.statSync(filePath));
  }

  public lstat(filePath: VirtualPathLike, callback: StatCallback): void;
  public lstat(filePath: VirtualPathLike, options: object, callback: StatCallback): void;
  public lstat(
    filePath: VirtualPathLike,
    optionsOrCallback: object | StatCallback,
    maybeCallback?: StatCallback
  ): void {
    const callback: StatCallback = VirtualFileSystem._extractCallback(optionsOrCallback, maybeCallback);
    VirtualFileSystem._invokeWithResult(callback, () => this.lstatSync(filePath));
  }

  public mkdir(folderPath: VirtualPathLike, callback: MkdirCallback): void;
  public mkdir(
    folderPath: VirtualPathLike,
    options: IVirtualFileSystemMkdirOptions | boolean,
    callback: MkdirCallback
  ): void;
  public mkdir(
    folderPath: VirtualPathLike,
    optionsOrCallback: IVirtualFileSystemMkdirOptions | boolean | MkdirCallback,
    maybeCallback?: MkdirCallback
  ): void {
    const callback: MkdirCallback = VirtualFileSystem._extractCallback(optionsOrCallback, maybeCallback);
    const opts: IVirtualFileSystemMkdirOptions | boolean | undefined =
      typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback;
    VirtualFileSystem._invokeWithResult(callback, () => this.mkdirSync(folderPath, opts));
  }

  public readdir(folderPath: VirtualPathLike, callback: ReaddirCallback): void;
  public readdir(
    folderPath: VirtualPathLike,
    options: IVirtualFileSystemReaddirOptions | BufferEncoding | null,
    callback: ReaddirCallback
  ): void;
  public readdir(
    folderPath: VirtualPathLike,
    optionsOrCallback: IVirtualFileSystemReaddirOptions | BufferEncoding | null | ReaddirCallback,
    maybeCallback?: ReaddirCallback
  ): void {
    const callback: ReaddirCallback = VirtualFileSystem._extractCallback(optionsOrCallback, maybeCallback);
    const opts: IVirtualFileSystemReaddirOptions | BufferEncoding | null =
      typeof optionsOrCallback === 'function' ? null : optionsOrCallback;
    VirtualFileSystem._invokeWithResult(callback, () => this.readdirSync(folderPath, opts));
  }

  public unlink(filePath: VirtualPathLike, callback: GenericCallback): void {
    VirtualFileSystem._invoke(callback, () => this.unlinkSync(filePath));
  }

  public rmdir(folderPath: VirtualPathLike, callback: GenericCallback): void;
  public rmdir(
    folderPath: VirtualPathLike,
    options: IVirtualFileSystemRmOptions,
    callback: GenericCallback
  ): void;
  public rmdir(
    folderPath: VirtualPathLike,
    optionsOrCallback: IVirtualFileSystemRmOptions | GenericCallback,
    maybeCallback?: GenericCallback
  ): void {
    const callback: GenericCallback = VirtualFileSystem._extractCallback(optionsOrCallback, maybeCallback);
    const opts: IVirtualFileSystemRmOptions | undefined =
      typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback;
    VirtualFileSystem._invoke(callback, () => this.rmdirSync(folderPath, opts));
  }

  public rm(targetPath: VirtualPathLike, callback: GenericCallback): void;
  public rm(
    targetPath: VirtualPathLike,
    options: IVirtualFileSystemRmOptions,
    callback: GenericCallback
  ): void;
  public rm(
    targetPath: VirtualPathLike,
    optionsOrCallback: IVirtualFileSystemRmOptions | GenericCallback,
    maybeCallback?: GenericCallback
  ): void {
    const callback: GenericCallback = VirtualFileSystem._extractCallback(optionsOrCallback, maybeCallback);
    const opts: IVirtualFileSystemRmOptions | undefined =
      typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback;
    VirtualFileSystem._invoke(callback, () => this.rmSync(targetPath, opts));
  }

  public rename(oldPath: VirtualPathLike, newPath: VirtualPathLike, callback: GenericCallback): void {
    VirtualFileSystem._invoke(callback, () => this.renameSync(oldPath, newPath));
  }

  public copyFile(srcPath: VirtualPathLike, destPath: VirtualPathLike, callback: GenericCallback): void;
  public copyFile(
    srcPath: VirtualPathLike,
    destPath: VirtualPathLike,
    mode: number,
    callback: GenericCallback
  ): void;
  public copyFile(
    srcPath: VirtualPathLike,
    destPath: VirtualPathLike,
    modeOrCallback: number | GenericCallback,
    maybeCallback?: GenericCallback
  ): void {
    const callback: GenericCallback = VirtualFileSystem._extractCallback(modeOrCallback, maybeCallback);
    VirtualFileSystem._invoke(callback, () => this.copyFileSync(srcPath, destPath));
  }

  public cp(srcPath: VirtualPathLike, destPath: VirtualPathLike, callback: GenericCallback): void;
  public cp(
    srcPath: VirtualPathLike,
    destPath: VirtualPathLike,
    options: IVirtualFileSystemCpOptions,
    callback: GenericCallback
  ): void;
  public cp(
    srcPath: VirtualPathLike,
    destPath: VirtualPathLike,
    optionsOrCallback: IVirtualFileSystemCpOptions | GenericCallback,
    maybeCallback?: GenericCallback
  ): void {
    const callback: GenericCallback = VirtualFileSystem._extractCallback(optionsOrCallback, maybeCallback);
    const opts: IVirtualFileSystemCpOptions | undefined =
      typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback;
    VirtualFileSystem._invoke(callback, () => this.cpSync(srcPath, destPath, opts));
  }

  public mkdtemp(prefix: string, callback: MkdtempCallback): void {
    VirtualFileSystem._invokeWithResult(callback, () => this.mkdtempSync(prefix));
  }

  public access(filePath: VirtualPathLike, callback: GenericCallback): void;
  public access(filePath: VirtualPathLike, mode: number, callback: GenericCallback): void;
  public access(
    filePath: VirtualPathLike,
    modeOrCallback: number | GenericCallback,
    maybeCallback?: GenericCallback
  ): void {
    const callback: GenericCallback = VirtualFileSystem._extractCallback(modeOrCallback, maybeCallback);
    VirtualFileSystem._invoke(callback, () => this.accessSync(filePath));
  }

  public realpath(filePath: VirtualPathLike, callback: RealpathCallback): void {
    VirtualFileSystem._invokeWithResult(callback, () => this.realpathSync(filePath));
  }

  public exists(filePath: VirtualPathLike, callback: (exists: boolean) => void): void {
    queueMicrotask(() => callback(this.existsSync(filePath)));
  }

  // ===== node:path passthroughs (used by webpack's OutputFileSystem contract) =====

  public readonly join: (path1: string, path2: string) => string = (a, b) => nodeJsPath.join(a, b);
  public readonly dirname: (p: string) => string = (p) => nodeJsPath.dirname(p);
  public readonly relative: (from: string, to: string) => string = (from, to) =>
    nodeJsPath.relative(from, to);

  // ===== Promise-based API =====

  public get promises(): IVirtualFileSystemPromises {
    if (this._promisesView === undefined) {
      this._promisesView = VirtualFileSystem._buildPromises(this);
    }
    return this._promisesView;
  }

  // ===== Debug helpers =====

  /**
   * Returns a flat snapshot of the contents of every file in the tree, keyed by
   * canonical path. Buffers are decoded as UTF-8.
   */
  public toJSON(): { [absolutePath: string]: string } {
    const result: { [absolutePath: string]: string } = {};
    const walk: (node: IVfsDirNode, segments: string[]) => void = (node, segments) => {
      for (const [name, child] of node.entries) {
        const childSegments: string[] = [...segments, name];
        if (child.kind === 'file') {
          result[this._segmentsToString(childSegments)] = child.data.toString('utf8');
        } else {
          walk(child, childSegments);
        }
      }
    };
    walk(this._root, []);
    return result;
  }

  // ===== Internal helpers =====

  private _resolveNode(segments: string[]): VfsNode {
    let cursor: VfsNode = this._root;
    for (let i: number = 0; i < segments.length; i++) {
      if (cursor.kind !== 'dir') {
        throw VirtualFileSystem._createError(
          'ENOTDIR',
          'stat',
          this._segmentsToString(segments.slice(0, i))
        );
      }
      const child: VfsNode | undefined = cursor.entries.get(segments[i]);
      if (child === undefined) {
        throw VirtualFileSystem._createError(
          'ENOENT',
          'stat',
          this._segmentsToString(segments.slice(0, i + 1))
        );
      }
      cursor = child;
    }
    return cursor;
  }

  private _resolveDir(segments: string[], syscall: string): IVfsDirNode {
    const node: VfsNode = this._resolveNode(segments);
    if (node.kind !== 'dir') {
      throw VirtualFileSystem._createError('ENOTDIR', syscall, this._segmentsToString(segments));
    }
    return node;
  }

  private _resolveFile(segments: string[], syscall: string): IVfsFileNode {
    const node: VfsNode = this._resolveNode(segments);
    if (node.kind !== 'file') {
      throw VirtualFileSystem._createError('EISDIR', syscall, this._segmentsToString(segments));
    }
    return node;
  }

  private _resolveParent(segments: string[], syscall: string): IVfsDirNode {
    return this._resolveDir(segments.slice(0, -1), syscall);
  }

  private _splitPath(input: VirtualPathLike): string[] {
    const asString: string = VirtualFileSystem._toPathString(input);
    const resolved: string = nodeJsPath.resolve(asString);
    const normalized: string = resolved.replace(/\\/g, '/');
    return normalized.split('/').filter((segment) => segment.length > 0);
  }

  private _segmentsToString(segments: string[]): string {
    return '/' + segments.join('/');
  }

  private _copyTree(
    sourceNode: VfsNode,
    destSegments: string[],
    force: boolean,
    errorOnExist: boolean
  ): void {
    const destParent: IVfsDirNode = this._resolveParent(destSegments, 'cp');
    const destLeaf: string = destSegments[destSegments.length - 1];
    const existing: VfsNode | undefined = destParent.entries.get(destLeaf);
    if (existing !== undefined) {
      if (errorOnExist) {
        throw VirtualFileSystem._createError('EEXIST', 'cp', this._segmentsToString(destSegments));
      }
      if (!force && sourceNode.kind === 'file') {
        throw VirtualFileSystem._createError('EEXIST', 'cp', this._segmentsToString(destSegments));
      }
    }
    const now: Date = new Date();
    if (sourceNode.kind === 'file') {
      destParent.entries.set(destLeaf, {
        kind: 'file',
        data: Buffer.from(sourceNode.data),
        mtime: now
      });
      destParent.mtime = now;
      return;
    }
    let destDir: IVfsDirNode;
    if (existing && existing.kind === 'dir') {
      destDir = existing;
    } else {
      destDir = { kind: 'dir', entries: new Map(), mtime: now };
      destParent.entries.set(destLeaf, destDir);
      destParent.mtime = now;
    }
    for (const [childName, childNode] of sourceNode.entries) {
      this._copyTree(childNode, [...destSegments, childName], force, errorOnExist);
    }
  }

  private static _nodeStats(node: VfsNode): VirtualFileSystemStats {
    if (node.kind === 'file') {
      return new VirtualFileSystemStats(true, node.data.length, node.mtime);
    }
    return new VirtualFileSystemStats(false, 0, node.mtime);
  }

  private static _toPathString(input: VirtualPathLike): string {
    if (typeof input === 'string') {
      return input;
    }
    if (Buffer.isBuffer(input)) {
      return input.toString('utf8');
    }
    if (input instanceof URL) {
      return fileURLToPath(input);
    }
    throw new TypeError('Expected string, Buffer, or URL');
  }

  private static _normalizeWriteOptions(
    options: IVirtualFileSystemWriteFileOptions | BufferEncoding | null | undefined
  ): IVirtualFileSystemWriteFileOptions {
    if (options === null || options === undefined) {
      return {};
    }
    if (typeof options === 'string') {
      return { encoding: options };
    }
    return options;
  }

  private static _dataToBuffer(data: VirtualFileContent, encoding: BufferEncoding | undefined): Buffer {
    if (typeof data === 'string') {
      return Buffer.from(data, encoding ?? 'utf8');
    }
    if (Buffer.isBuffer(data)) {
      return data;
    }
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  private static _createError(code: ErrnoCode, syscall: string, path: string): NodeJS.ErrnoException {
    const message: string = `${code}: ${syscall} '${path}'`;
    const err: NodeJS.ErrnoException = new Error(message) as NodeJS.ErrnoException;
    err.code = code;
    err.errno = _ERRNO_VALUES[code];
    err.syscall = syscall;
    err.path = path;
    return err;
  }

  private static _extractCallback<T extends (...args: never[]) => void>(
    optionsOrCallback: T | unknown,
    maybeCallback: T | undefined
  ): T {
    if (typeof optionsOrCallback === 'function') {
      return optionsOrCallback as T;
    }
    if (typeof maybeCallback !== 'function') {
      throw new TypeError('Callback must be a function');
    }
    return maybeCallback;
  }

  private static _invoke(callback: GenericCallback, fn: () => void): void {
    queueMicrotask(() => {
      try {
        fn();
      } catch (err) {
        callback(err as NodeJS.ErrnoException);
        return;
      }
      callback(null);
    });
  }

  private static _invokeWithResult<T>(
    callback: (err: NodeJS.ErrnoException | null, result?: T) => void,
    fn: () => T | undefined
  ): void {
    queueMicrotask(() => {
      let result: T | undefined;
      try {
        result = fn();
      } catch (err) {
        callback(err as NodeJS.ErrnoException);
        return;
      }
      callback(null, result);
    });
  }

  private static _buildPromises(vfs: VirtualFileSystem): IVirtualFileSystemPromises {
    return {
      writeFile: (filePath, data, options) => VirtualFileSystem._async(() => vfs.writeFileSync(filePath, data, options)),
      appendFile: (filePath, data, options) =>
        VirtualFileSystem._async(() => vfs.appendFileSync(filePath, data, options)),
      readFile: (filePath, options) => VirtualFileSystem._async(() => vfs.readFileSync(filePath, options)),
      stat: (filePath) => VirtualFileSystem._async(() => vfs.statSync(filePath)),
      lstat: (filePath) => VirtualFileSystem._async(() => vfs.lstatSync(filePath)),
      mkdir: (folderPath, options) => VirtualFileSystem._async(() => vfs.mkdirSync(folderPath, options)),
      readdir: (folderPath, options) => VirtualFileSystem._async(() => vfs.readdirSync(folderPath, options)),
      unlink: (filePath) => VirtualFileSystem._async(() => vfs.unlinkSync(filePath)),
      rmdir: (folderPath, options) => VirtualFileSystem._async(() => vfs.rmdirSync(folderPath, options)),
      rm: (targetPath, options) => VirtualFileSystem._async(() => vfs.rmSync(targetPath, options)),
      rename: (oldPath, newPath) => VirtualFileSystem._async(() => vfs.renameSync(oldPath, newPath)),
      copyFile: (srcPath, destPath) => VirtualFileSystem._async(() => vfs.copyFileSync(srcPath, destPath)),
      cp: (srcPath, destPath, options) =>
        VirtualFileSystem._async(() => vfs.cpSync(srcPath, destPath, options)),
      mkdtemp: (prefix) => VirtualFileSystem._async(() => vfs.mkdtempSync(prefix)),
      access: (filePath) => VirtualFileSystem._async(() => vfs.accessSync(filePath)),
      realpath: (filePath) => VirtualFileSystem._async(() => vfs.realpathSync(filePath)),
      truncate: (filePath, length) => VirtualFileSystem._async(() => vfs.truncateSync(filePath, length)),
      utimes: (filePath, atime, mtime) =>
        VirtualFileSystem._async(() => vfs.utimesSync(filePath, atime, mtime))
    };
  }

  private static _async<T>(fn: () => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queueMicrotask(() => {
        try {
          resolve(fn());
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

/**
 * Promise-flavored mirror of {@link VirtualFileSystem}, accessible via
 * {@link VirtualFileSystem.promises}.
 *
 * @public
 */
export interface IVirtualFileSystemPromises {
  writeFile(
    filePath: VirtualPathLike,
    data: VirtualFileContent,
    options?: IVirtualFileSystemWriteFileOptions | BufferEncoding | null
  ): Promise<void>;
  appendFile(
    filePath: VirtualPathLike,
    data: VirtualFileContent,
    options?: IVirtualFileSystemWriteFileOptions | BufferEncoding | null
  ): Promise<void>;
  readFile(
    filePath: VirtualPathLike,
    options?: IVirtualFileSystemReadFileOptions | BufferEncoding | null
  ): Promise<string | Buffer>;
  stat(filePath: VirtualPathLike): Promise<VirtualFileSystemStats>;
  lstat(filePath: VirtualPathLike): Promise<VirtualFileSystemStats>;
  mkdir(
    folderPath: VirtualPathLike,
    options?: IVirtualFileSystemMkdirOptions | boolean
  ): Promise<string | undefined>;
  readdir(
    folderPath: VirtualPathLike,
    options?: IVirtualFileSystemReaddirOptions | BufferEncoding | null
  ): Promise<string[] | VirtualFileSystemDirent[]>;
  unlink(filePath: VirtualPathLike): Promise<void>;
  rmdir(folderPath: VirtualPathLike, options?: IVirtualFileSystemRmOptions): Promise<void>;
  rm(targetPath: VirtualPathLike, options?: IVirtualFileSystemRmOptions): Promise<void>;
  rename(oldPath: VirtualPathLike, newPath: VirtualPathLike): Promise<void>;
  copyFile(srcPath: VirtualPathLike, destPath: VirtualPathLike): Promise<void>;
  cp(
    srcPath: VirtualPathLike,
    destPath: VirtualPathLike,
    options?: IVirtualFileSystemCpOptions
  ): Promise<void>;
  mkdtemp(prefix: string): Promise<string>;
  access(filePath: VirtualPathLike): Promise<void>;
  realpath(filePath: VirtualPathLike): Promise<string>;
  truncate(filePath: VirtualPathLike, length?: number): Promise<void>;
  utimes(filePath: VirtualPathLike, atime: Date | number, mtime: Date | number): Promise<void>;
}
