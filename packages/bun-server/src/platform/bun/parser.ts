import type { IParserAdapter } from '../types';

export const bunParserAdapter: IParserAdapter = {
  parseJSONC(content: string): unknown {
    return Bun.JSONC.parse(content);
  },

  parseJSON5(content: string): unknown {
    return Bun.JSON5.parse(content);
  },

  parseJSONL(content: string): unknown[] {
    return Bun.JSONL.parse(content) as unknown[];
  },

  renderMarkdown(md: string): string {
    return Bun.markdown.html(md, { headings: true });
  },

  renderMarkdownAnsi(md: string): string {
    return Bun.markdown.ansi(md);
  },
};
