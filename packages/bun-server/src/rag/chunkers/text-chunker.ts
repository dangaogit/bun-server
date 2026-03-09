import type { DocumentChunker, DocumentChunk } from '../types';

/**
 * Splits plain text into overlapping chunks of fixed character size.
 */
export class TextChunker implements DocumentChunker {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  public constructor(chunkSize = 512, chunkOverlap = 50) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  public chunk(text: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const step = this.chunkSize - this.chunkOverlap;

    for (let start = 0; start < text.length; start += step) {
      const end = Math.min(start + this.chunkSize, text.length);
      const content = text.slice(start, end).trim();
      if (content.length > 0) {
        chunks.push({ content });
      }
      if (end >= text.length) break;
    }

    return chunks;
  }
}
