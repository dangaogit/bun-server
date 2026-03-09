import { describe, expect, test } from 'bun:test';
import { TextChunker } from '../../src/rag/chunkers/text-chunker';
import { MarkdownChunker } from '../../src/rag/chunkers/markdown-chunker';

describe('TextChunker', () => {
  test('should split text into chunks of specified size', () => {
    const chunker = new TextChunker(10, 0);
    const chunks = chunker.chunk('Hello World this is a test string');
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(10);
    }
  });

  test('should include overlap between chunks', () => {
    const chunker = new TextChunker(20, 5);
    const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const chunks = chunker.chunk(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  test('should return single chunk for short text', () => {
    const chunker = new TextChunker(512, 50);
    const chunks = chunker.chunk('Short text');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe('Short text');
  });

  test('should not return empty chunks', () => {
    const chunker = new TextChunker(10, 0);
    const chunks = chunker.chunk('   \n\n  ');
    expect(chunks).toHaveLength(0);
  });
});

describe('MarkdownChunker', () => {
  test('should split by headings', () => {
    const chunker = new MarkdownChunker(1000);
    const markdown = `# Title\n\nIntro text.\n\n## Section 1\n\nContent 1.\n\n## Section 2\n\nContent 2.`;
    const chunks = chunker.chunk(markdown);
    expect(chunks.length).toBeGreaterThan(1);
  });

  test('should handle text without headings', () => {
    const chunker = new MarkdownChunker(1000);
    const text = 'Just plain text without any headings.';
    const chunks = chunker.chunk(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe(text);
  });

  test('should split large sections into paragraphs', () => {
    const chunker = new MarkdownChunker(50);
    const markdown = `## Big Section\n\nParagraph one with some content.\n\nParagraph two with more content that makes it too long.`;
    const chunks = chunker.chunk(markdown);
    expect(chunks.length).toBeGreaterThan(1);
  });
});
