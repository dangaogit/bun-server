import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

import type { UploadedFileInfo } from './types';

export interface SaveFileOptions {
  dest: string;
  filename?: string;
  overwrite?: boolean;
}

async function ensureDirectory(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9.-]/g, '_');
}

export class FileStorage {
  public static async saveFile(
    file: File,
    options: SaveFileOptions,
    fieldName: string,
  ): Promise<UploadedFileInfo> {
    await ensureDirectory(options.dest);

    const baseName = sanitizeFilename(options.filename ?? file.name ?? `file-${Date.now()}`);
    let targetName = baseName || `file-${Date.now()}`;
    let targetPath = join(options.dest, targetName);

    if (!options.overwrite) {
      let counter = 1;
      const dotIndex = targetName.lastIndexOf('.');
      const name = dotIndex > 0 ? targetName.slice(0, dotIndex) : targetName;
      const extension = dotIndex > 0 ? targetName.slice(dotIndex) : '';
      while (await fileExists(targetPath)) {
        targetName = `${name}-${counter}${extension}`;
        targetPath = join(options.dest, targetName);
        counter += 1;
      }
    }

    await Bun.write(targetPath, file);

    return {
      fieldName,
      filename: targetName,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      path: targetPath,
    };
  }
}


