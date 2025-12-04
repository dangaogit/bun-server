export interface UploadedFileInfo {
  /**
   * 表单字段名
   */
  fieldName: string;

  /**
   * 保存后的文件名
   */
  filename: string;

  /**
   * 原始文件名
   */
  originalName?: string;

  /**
   * MIME 类型
   */
  mimeType: string;

  /**
   * 文件大小（字节）
   */
  size: number;

  /**
   * 文件保存路径
   */
  path: string;
}


