import type { IParserAdapter } from '../types';

export const nodeParserAdapter: IParserAdapter = {
  parseJSONC(content: string): unknown {
    const { parse } = require('jsonc-parser') as typeof import('jsonc-parser');
    return parse(content);
  },

  parseJSON5(content: string): unknown {
    const JSON5 = require('json5') as typeof import('json5');
    return JSON5.parse(content);
  },

  parseJSONL(content: string): unknown[] {
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line));
  },

  renderMarkdown(md: string): string {
    const { marked } = require('marked') as typeof import('marked');
    const result = marked(md);
    if (typeof result === 'string') {
      return result;
    }
    // marked can return a Promise in some configurations — resolve synchronously
    // by using marked.parseInline which is sync, or fall back to a sync config
    const { marked: markedSync } = require('marked') as typeof import('marked');
    markedSync.setOptions({ async: false });
    return markedSync(md) as string;
  },

  renderMarkdownAnsi(md: string): string {
    // Node.js 平台无 Bun.markdown.ansi()，降级为纯文本（去除 HTML 标签）
    const html = this.renderMarkdown(md);
    return html.replace(/[<>]/g, '');
  },
};
