import type { JWTConfig, JWTPayload } from './types';

/**
 * JWT 工具类
 */
export class JWTUtil {
  private readonly config: Required<JWTConfig>;

  public constructor(config: JWTConfig) {
    this.config = {
      secret: config.secret,
      accessTokenExpiresIn: config.accessTokenExpiresIn ?? 3600,
      refreshTokenExpiresIn: config.refreshTokenExpiresIn ?? 86400 * 7,
      algorithm: config.algorithm ?? 'HS256',
    };
  }

  /**
   * 生成访问令牌
   * @param payload - JWT 载荷
   * @returns 访问令牌
   */
  public generateAccessToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): string {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload: JWTPayload = {
      ...payload,
      sub: payload.sub as string,
      iat: now,
      exp: now + this.config.accessTokenExpiresIn,
    };
    return this.sign(tokenPayload);
  }

  /**
   * 生成刷新令牌
   * @param payload - JWT 载荷
   * @returns 刷新令牌
   */
  public generateRefreshToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): string {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload: JWTPayload = {
      ...payload,
      sub: payload.sub as string,
      iat: now,
      exp: now + this.config.refreshTokenExpiresIn,
    };
    return this.sign(tokenPayload);
  }

  /**
   * 验证令牌
   * @param token - JWT 令牌
   * @returns 载荷或 null（如果无效）
   */
  public verify(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // 解析载荷
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8'),
      ) as JWTPayload;

      // 验证签名
      const signature = this.signature(parts[0] + '.' + parts[1]);
      if (signature !== parts[2]) {
        return null;
      }

      // 验证过期时间
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch (_error) {
      return null;
    }
  }

  /**
   * 签名 JWT
   */
  private sign(payload: JWTPayload): string {
    const header = {
      alg: this.config.algorithm,
      typ: 'JWT',
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.signature(encodedHeader + '.' + encodedPayload);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * 生成签名
   */
  private signature(data: string): string {
    // 使用 Bun 的 CryptoHasher
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.secret);
    const messageData = encoder.encode(data);

    // 使用 HMAC-SHA256
    const hash = this.hmacSha256(keyData, messageData);
    return this.base64UrlEncode(Buffer.from(hash).toString('base64'));
  }

  /**
   * HMAC-SHA256 实现
   */
  private hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
    const blockSize = 64;
    let keyBuffer: Uint8Array;

    if (key.length > blockSize) {
      // 如果密钥长度超过块大小，先哈希
      const hasher = new Bun.CryptoHasher('sha256');
      hasher.update(key);
      keyBuffer = new Uint8Array(hasher.digest());
    } else {
      keyBuffer = new Uint8Array(blockSize);
      keyBuffer.set(key);
    }

    // 创建 o_key_pad 和 i_key_pad
    const oKeyPad = new Uint8Array(blockSize);
    const iKeyPad = new Uint8Array(blockSize);

    for (let i = 0; i < blockSize; i++) {
      oKeyPad[i] = keyBuffer[i] ^ 0x5c;
      iKeyPad[i] = keyBuffer[i] ^ 0x36;
    }

    // 计算 inner hash
    const innerData = new Uint8Array(iKeyPad.length + data.length);
    innerData.set(iKeyPad);
    innerData.set(data, iKeyPad.length);
    const innerHasher = new Bun.CryptoHasher('sha256');
    innerHasher.update(innerData);
    const innerHash = new Uint8Array(innerHasher.digest());

    // 计算 outer hash
    const outerData = new Uint8Array(oKeyPad.length + innerHash.length);
    outerData.set(oKeyPad);
    outerData.set(innerHash, oKeyPad.length);
    const outerHasher = new Bun.CryptoHasher('sha256');
    outerHasher.update(outerData);

    return new Uint8Array(outerHasher.digest());
  }

  /**
   * Base64URL 编码
   */
  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

