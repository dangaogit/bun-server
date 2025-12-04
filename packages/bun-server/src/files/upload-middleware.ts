import type { Middleware } from '../middleware';
import type { UploadedFileInfo } from './types';
import { FileStorage, type SaveFileOptions } from './storage';

export interface FileUploadOptions extends Omit<SaveFileOptions, 'filename'> {
  filename?: (fieldName: string, file: File) => string | undefined;
}

export function createFileUploadMiddleware(options: FileUploadOptions): Middleware {
  const dest = options.dest;

  return async (context, next) => {
    const body = await context.getBody();
    if (!(body instanceof FormData)) {
      return await next();
    }

    const savedFiles: UploadedFileInfo[] = [];

    for (const [field, value] of body.entries()) {
      const candidate = value as unknown;
      if (candidate instanceof File) {
        const filename = options.filename?.(field, candidate);
        const info = await FileStorage.saveFile(
          candidate,
          {
            dest,
            filename,
            overwrite: options.overwrite,
          },
          field,
        );
        savedFiles.push(info);
      }
    }

    if (savedFiles.length > 0) {
      context.files = savedFiles;
    }

    return await next();
  };
}


