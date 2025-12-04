import type { Middleware } from '../middleware';
import { FileHandler } from '../../request/file-handler';

export interface FileUploadOptions {
  maxSize?: number;
}

/**
 * 简单的文件上传中间件：解析 multipart/form-data 并将文件附加到 context.body
 */
export function createFileUploadMiddleware(options: FileUploadOptions = {}): Middleware {
  const maxSize = options.maxSize ?? 10 * 1024 * 1024;

  return async (context, next) => {
    const contentType = context.getHeader('Content-Type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return await next();
    }

    const formData = await FileHandler.parseFormData(context);
    const files = await FileHandler.getFiles(formData);

    // 限制大小
    for (const fileList of Object.values(files)) {
      for (const file of fileList) {
        if (file.size > maxSize) {
          context.setStatus(413);
          return context.createResponse({ error: `File ${file.name} exceeds max size` });
        }
      }
    }

    context.body = {
      fields: Object.fromEntries(formData.entries()),
      files,
    };

    return await next();
  };
}


