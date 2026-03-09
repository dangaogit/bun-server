import type { DocumentChunker, DocumentChunk } from '../types';

/**
 * Splits Markdown text into semantic chunks by heading boundaries.
 * Falls back to text chunking for sections that are too large.
 */
export class MarkdownChunker implements DocumentChunker {
  private readonly maxChunkSize: number;

  public constructor(maxChunkSize = 1024) {
    this.maxChunkSize = maxChunkSize;
  }

  public chunk(text: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    // Split on headings (## or ###)
    const sections = text.split(/(?=^#{1,3} )/m).filter((s) => s.trim());

    for (const section of sections) {
      if (section.length <= this.maxChunkSize) {
        chunks.push({ content: section.trim() });
      } else {
        // Split large sections into paragraphs
        const paragraphs = section.split(/\n\n+/).filter((p) => p.trim());
        let current = '';
        for (const para of paragraphs) {
          if ((current + '\n\n' + para).length > this.maxChunkSize && current) {
            chunks.push({ content: current.trim() });
            current = para;
          } else {
            current = current ? current + '\n\n' + para : para;
          }
        }
        if (current.trim()) chunks.push({ content: current.trim() });
      }
    }

    return chunks.length > 0 ? chunks : [{ content: text.trim() }];
  }
}
