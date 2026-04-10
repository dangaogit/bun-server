/**
 * Bun v1.3.12 新增 API 的类型补全
 * 待 @types/bun 升级至对应版本后可删除此文件
 */
declare module 'bun' {
  namespace markdown {
    /**
     * 将 Markdown 字符串渲染为带 ANSI 转义码的彩色终端文本（Bun 1.3.12+）
     */
    function ansi(
      input: string,
      options?: {
        /** 是否输出 ANSI 颜色转义码，默认 true */
        colors?: boolean;
        /** 是否输出可点击超链接（OSC 8），默认 false */
        hyperlinks?: boolean;
        /** 文本换行列宽，默认终端宽度 */
        columns?: number;
        /** 是否通过 Kitty Graphics Protocol 内联图片，默认 false */
        kittyGraphics?: boolean;
      },
    ): string;
  }
}
