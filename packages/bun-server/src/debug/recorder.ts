import type { RequestRecord } from './types';

/**
 * 请求录制器
 * 使用环形缓冲区存储 HTTP 请求记录
 */
export class RequestRecorder {
  private readonly buffer: (RequestRecord | null)[];
  private readonly maxRecords: number;
  private writeIndex: number = 0;
  private count: number = 0;
  private idCounter: number = 0;
  private readonly idMap = new Map<string, number>();

  /**
   * 创建请求录制器
   * @param maxRecords - 最大录制数量
   */
  public constructor(maxRecords: number = 500) {
    this.maxRecords = maxRecords;
    this.buffer = new Array(maxRecords).fill(null);
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    this.idCounter += 1;
    const ts = Date.now().toString(16);
    const counter = this.idCounter.toString(16);
    return `${ts}-${counter}`;
  }

  /**
   * 录制请求
   * @param record - 请求记录（不含 id，由本方法生成）
   */
  public record(record: Omit<RequestRecord, 'id'>): void {
    const id = this.generateId();
    const fullRecord: RequestRecord = { ...record, id };

    const oldRecord = this.buffer[this.writeIndex];
    if (oldRecord) {
      this.idMap.delete(oldRecord.id);
    }

    this.buffer[this.writeIndex] = fullRecord;
    this.idMap.set(id, this.writeIndex);

    this.writeIndex = (this.writeIndex + 1) % this.maxRecords;
    if (this.count < this.maxRecords) {
      this.count += 1;
    }
  }

  /**
   * 获取所有记录（按时间倒序，最新的在前）
   */
  public getAll(): RequestRecord[] {
    const records: RequestRecord[] = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.writeIndex - 1 - i + this.maxRecords) % this.maxRecords;
      const record = this.buffer[idx];
      if (record) {
        records.push(record);
      }
    }
    return records;
  }

  /**
   * 根据 ID 获取单条记录
   * @param id - 记录 ID
   */
  public getById(id: string): RequestRecord | undefined {
    const index = this.idMap.get(id);
    if (index === undefined) {
      return undefined;
    }
    return this.buffer[index] ?? undefined;
  }

  /**
   * 清除所有记录
   */
  public clear(): void {
    for (let i = 0; i < this.maxRecords; i++) {
      this.buffer[i] = null;
    }
    this.writeIndex = 0;
    this.count = 0;
    this.idMap.clear();
  }

  /**
   * 获取当前记录数量
   */
  public getCount(): number {
    return this.count;
  }
}
