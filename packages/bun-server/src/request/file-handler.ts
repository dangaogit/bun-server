import type { Context } from '../core/context';

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
}

export class FileHandler {
  private static readonly MAX_SIZE = 10 * 1024 * 1024; // 10MB

  public static async parseFormData(context: Context): Promise<FormData> {
    const contentType = context.getHeader('Content-Type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new Error('Content-Type must be multipart/form-data');
    }
    const request = context.request;
    return await request.formData() as FormData;
  }

  public static async getFiles(formData: FormData): Promise<Record<string, UploadedFile[]>> {
    const files: Record<string, UploadedFile[]> = {};
    for (const [key, value] of formData.entries()) {
      // @ts-ignore
      if (value instanceof File) {
        const buffer = await value.arrayBuffer();
        if (buffer.byteLength > this.MAX_SIZE) {
          throw new Error(`File ${value.name} exceeds maximum size`);
        }
        if (!files[key]) {
          files[key] = [];
        }
        files[key].push({
          name: value.name,
          type: value.type,
          size: value.size,
          data: buffer,
        });
      }
    }
    return files;
  }
}


