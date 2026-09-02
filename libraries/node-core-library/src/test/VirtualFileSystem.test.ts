// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import {
  VirtualFileSystem,
  type VirtualFileSystemDirent,
  type VirtualFileSystemStats
} from '../VirtualFileSystem';

describe(VirtualFileSystem.name, () => {
  describe('writeFileSync / readFileSync', () => {
    test('round-trips a string with default utf8 encoding', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/dist/index.js', 'console.log("hi")');
      expect(vfs.readFileSync('/dist/index.js', 'utf8')).toBe('console.log("hi")');
    });

    test('returns a Buffer when no encoding is supplied', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/file.bin', Buffer.from([1, 2, 3]));
      const data: Buffer = vfs.readFileSync('/file.bin') as Buffer;
      expect(Buffer.isBuffer(data)).toBe(true);
      expect(Array.from(data)).toEqual([1, 2, 3]);
    });

    test('returns a copy on read so mutations do not bleed back', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/a.txt', 'hello');
      const buf: Buffer = vfs.readFileSync('/a.txt') as Buffer;
      buf[0] = 0;
      expect(vfs.readFileSync('/a.txt', 'utf8')).toBe('hello');
    });

    test('overwrites by default', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/x', 'first');
      vfs.writeFileSync('/x', 'second');
      expect(vfs.readFileSync('/x', 'utf8')).toBe('second');
    });

    test('throws ENOENT for a missing file', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      try {
        vfs.readFileSync('/missing');
        fail('expected throw');
      } catch (err) {
        expect((err as NodeJS.ErrnoException).code).toBe('ENOENT');
      }
    });

    test('throws EISDIR when reading a directory', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/dir');
      try {
        vfs.readFileSync('/dir');
        fail('expected throw');
      } catch (err) {
        expect((err as NodeJS.ErrnoException).code).toBe('EISDIR');
      }
    });

    test('throws EISDIR when writing onto an existing directory', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/dir');
      try {
        vfs.writeFileSync('/dir', 'oops');
        fail('expected throw');
      } catch (err) {
        expect((err as NodeJS.ErrnoException).code).toBe('EISDIR');
      }
    });
  });

  describe('appendFileSync', () => {
    test('appends to an existing file', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/log', 'first;');
      vfs.appendFileSync('/log', 'second');
      expect(vfs.readFileSync('/log', 'utf8')).toBe('first;second');
    });

    test('creates the file when it does not exist', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.appendFileSync('/new', 'hello');
      expect(vfs.readFileSync('/new', 'utf8')).toBe('hello');
    });
  });

  describe('mkdirSync', () => {
    test('creates a single directory', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/foo');
      expect(vfs.statSync('/foo').isDirectory()).toBe(true);
    });

    test('throws ENOENT when intermediate folders are missing and recursive is false', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      try {
        vfs.mkdirSync('/missing/leaf');
        fail('expected throw');
      } catch (err) {
        expect((err as NodeJS.ErrnoException).code).toBe('ENOENT');
      }
    });

    test('creates intermediate folders with recursive: true', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/a/b/c', { recursive: true });
      expect(vfs.statSync('/a').isDirectory()).toBe(true);
      expect(vfs.statSync('/a/b').isDirectory()).toBe(true);
      expect(vfs.statSync('/a/b/c').isDirectory()).toBe(true);
    });

    test('throws EEXIST when the target already exists and recursive is false', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/foo');
      try {
        vfs.mkdirSync('/foo');
        fail('expected throw');
      } catch (err) {
        expect((err as NodeJS.ErrnoException).code).toBe('EEXIST');
      }
    });

    test('is a no-op when recursive: true and the target exists as a directory', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/a/b', { recursive: true });
      expect(() => vfs.mkdirSync('/a/b', { recursive: true })).not.toThrow();
    });

    test('returns the first directory created when recursive', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      const first: string | undefined = vfs.mkdirSync('/x/y/z', { recursive: true });
      expect(first).toBe('/x');
    });
  });

  describe('readdirSync', () => {
    test('returns a list of entry names', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/dir');
      vfs.writeFileSync('/dir/a.txt', '');
      vfs.writeFileSync('/dir/b.txt', '');
      vfs.mkdirSync('/dir/sub');
      const entries: string[] = vfs.readdirSync('/dir');
      expect(entries.sort()).toEqual(['a.txt', 'b.txt', 'sub']);
    });

    test('returns Dirent-like objects with withFileTypes', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/dir');
      vfs.writeFileSync('/dir/file', '');
      vfs.mkdirSync('/dir/sub');
      const entries: VirtualFileSystemDirent[] = vfs.readdirSync('/dir', {
        withFileTypes: true
      }) as VirtualFileSystemDirent[];
      const file: VirtualFileSystemDirent = entries.find((e) => e.name === 'file')!;
      const sub: VirtualFileSystemDirent = entries.find((e) => e.name === 'sub')!;
      expect(file.isFile()).toBe(true);
      expect(file.isDirectory()).toBe(false);
      expect(sub.isFile()).toBe(false);
      expect(sub.isDirectory()).toBe(true);
    });

    test('throws ENOTDIR when called on a file', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/file', '');
      try {
        vfs.readdirSync('/file');
        fail('expected throw');
      } catch (err) {
        expect((err as NodeJS.ErrnoException).code).toBe('ENOTDIR');
      }
    });
  });

  describe('statSync', () => {
    test('reports size and mtime on files', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/data', 'abcde');
      const stats: VirtualFileSystemStats = vfs.statSync('/data');
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
      expect(stats.size).toBe(5);
      expect(stats.mtime).toBeInstanceOf(Date);
    });

    test('reports a directory', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/d');
      const stats: VirtualFileSystemStats = vfs.statSync('/d');
      expect(stats.isDirectory()).toBe(true);
      expect(stats.isFile()).toBe(false);
    });
  });

  describe('existsSync', () => {
    test('returns false for missing paths', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      expect(vfs.existsSync('/nope')).toBe(false);
    });

    test('returns true for existing paths', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/yep', '');
      expect(vfs.existsSync('/yep')).toBe(true);
    });
  });

  describe('unlinkSync / rmdirSync / rmSync', () => {
    test('unlinkSync deletes a file', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/f', '');
      vfs.unlinkSync('/f');
      expect(vfs.existsSync('/f')).toBe(false);
    });

    test('unlinkSync rejects directories with EISDIR', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/d');
      try {
        vfs.unlinkSync('/d');
        fail('expected throw');
      } catch (err) {
        expect((err as NodeJS.ErrnoException).code).toBe('EISDIR');
      }
    });

    test('rmdirSync rejects non-empty directories with ENOTEMPTY', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/d');
      vfs.writeFileSync('/d/f', '');
      try {
        vfs.rmdirSync('/d');
        fail('expected throw');
      } catch (err) {
        expect((err as NodeJS.ErrnoException).code).toBe('ENOTEMPTY');
      }
    });

    test('rmSync with recursive removes a directory tree', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/d/sub', { recursive: true });
      vfs.writeFileSync('/d/sub/f', '');
      vfs.rmSync('/d', { recursive: true });
      expect(vfs.existsSync('/d')).toBe(false);
    });

    test('rmSync with force does not throw when missing', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      expect(() => vfs.rmSync('/nope', { force: true })).not.toThrow();
    });
  });

  describe('renameSync / copyFileSync', () => {
    test('renameSync moves a file', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/a', 'data');
      vfs.renameSync('/a', '/b');
      expect(vfs.existsSync('/a')).toBe(false);
      expect(vfs.readFileSync('/b', 'utf8')).toBe('data');
    });

    test('copyFileSync duplicates contents', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/src', 'payload');
      vfs.copyFileSync('/src', '/dest');
      expect(vfs.readFileSync('/dest', 'utf8')).toBe('payload');
      // mutations to source should not affect dest
      vfs.writeFileSync('/src', 'mutated');
      expect(vfs.readFileSync('/dest', 'utf8')).toBe('payload');
    });
  });

  describe('cpSync', () => {
    test('copies a directory tree recursively', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/src/sub', { recursive: true });
      vfs.writeFileSync('/src/a', 'A');
      vfs.writeFileSync('/src/sub/b', 'B');
      vfs.cpSync('/src', '/dest', { recursive: true });
      expect(vfs.readFileSync('/dest/a', 'utf8')).toBe('A');
      expect(vfs.readFileSync('/dest/sub/b', 'utf8')).toBe('B');
    });
  });

  describe('mkdtempSync', () => {
    test('creates a unique directory under the given prefix', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/tmp');
      const path1: string = vfs.mkdtempSync('/tmp/x-');
      const path2: string = vfs.mkdtempSync('/tmp/x-');
      expect(path1).not.toBe(path2);
      expect(vfs.statSync(path1).isDirectory()).toBe(true);
      expect(vfs.statSync(path2).isDirectory()).toBe(true);
    });
  });

  describe('callback API', () => {
    test('writeFile / readFile round-trip via callbacks', (done: jest.DoneCallback) => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFile('/cb.txt', 'hello', (writeErr: NodeJS.ErrnoException | null) => {
        expect(writeErr).toBeNull();
        vfs.readFile('/cb.txt', 'utf8', (readErr, data) => {
          expect(readErr).toBeNull();
          expect(data).toBe('hello');
          done();
        });
      });
    });

    test('mkdir with recursive option via callback', (done: jest.DoneCallback) => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdir('/a/b/c', { recursive: true }, (err, result) => {
        expect(err).toBeNull();
        expect(result).toBe('/a');
        expect(vfs.existsSync('/a/b/c')).toBe(true);
        done();
      });
    });

    test('stat callback returns Stats with isFile/isDirectory', (done: jest.DoneCallback) => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.writeFileSync('/file', 'x');
      vfs.stat('/file', (err, stats) => {
        expect(err).toBeNull();
        expect(stats!.isFile()).toBe(true);
        done();
      });
    });

    test('reports errors via the callback', (done: jest.DoneCallback) => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.readFile('/missing', (err) => {
        expect(err).not.toBeNull();
        expect(err!.code).toBe('ENOENT');
        done();
      });
    });
  });

  describe('promises API', () => {
    test('writeFile / readFile round-trip', async () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      await vfs.promises.writeFile('/p.txt', 'data');
      const result: string | Buffer = await vfs.promises.readFile('/p.txt', 'utf8');
      expect(result).toBe('data');
    });

    test('mkdir + readdir', async () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      await vfs.promises.mkdir('/d');
      await vfs.promises.writeFile('/d/a', '1');
      await vfs.promises.writeFile('/d/b', '2');
      const entries: string[] | VirtualFileSystemDirent[] = await vfs.promises.readdir('/d');
      expect((entries as string[]).sort()).toEqual(['a', 'b']);
    });

    test('rejects on missing file', async () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      await expect(vfs.promises.readFile('/nope')).rejects.toMatchObject({ code: 'ENOENT' });
    });

    test('returns the same view across calls', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      expect(vfs.promises).toBe(vfs.promises);
    });
  });

  describe('path normalization', () => {
    test('normalizes ../ segments', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/a/b', { recursive: true });
      vfs.writeFileSync('/a/b/../c', 'x');
      expect(vfs.readFileSync('/a/c', 'utf8')).toBe('x');
    });

    test('treats trailing slashes the same as no trailing slash', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/foo');
      expect(vfs.statSync('/foo/').isDirectory()).toBe(true);
    });
  });

  describe('toJSON', () => {
    test('returns a flat path → contents map', () => {
      const vfs: VirtualFileSystem = new VirtualFileSystem();
      vfs.mkdirSync('/dir');
      vfs.writeFileSync('/dir/a', 'A');
      vfs.writeFileSync('/top.txt', 'T');
      expect(vfs.toJSON()).toEqual({
        '/dir/a': 'A',
        '/top.txt': 'T'
      });
    });
  });
});
