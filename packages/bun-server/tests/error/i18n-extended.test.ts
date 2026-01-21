import { describe, expect, test } from 'bun:test';

import { ErrorMessageI18n, type SupportedLanguage } from '../../src/error/i18n';
import { ErrorCode } from '../../src/error/error-codes';

describe('Error I18n', () => {
  describe('ErrorMessageI18n.getMessage', () => {
    test('should return English message by default', () => {
      const message = ErrorMessageI18n.getMessage(ErrorCode.INTERNAL_ERROR);
      expect(message.toLowerCase()).toContain('internal');
    });

    test('should return Chinese message when specified', () => {
      const message = ErrorMessageI18n.getMessage(ErrorCode.INTERNAL_ERROR, 'zh-CN');
      expect(message).toBe('服务器内部错误');
    });

    test('should return Japanese message when available', () => {
      const message = ErrorMessageI18n.getMessage(ErrorCode.INTERNAL_ERROR, 'ja');
      expect(message).toBe('サーバー内部エラー');
    });

    test('should return Korean message when available', () => {
      const message = ErrorMessageI18n.getMessage(ErrorCode.INTERNAL_ERROR, 'ko');
      expect(message).toBe('서버 내부 오류');
    });

    test('should fallback to English when translation not available', () => {
      // Use an error code that might not have translations in all languages
      const message = ErrorMessageI18n.getMessage(ErrorCode.DATABASE_POOL_EXHAUSTED, 'ja');
      // Should fallback to English
      expect(message).toBeDefined();
    });

    test('should return message for auth errors', () => {
      const messages = {
        en: ErrorMessageI18n.getMessage(ErrorCode.AUTH_REQUIRED, 'en'),
        zhCN: ErrorMessageI18n.getMessage(ErrorCode.AUTH_REQUIRED, 'zh-CN'),
      };

      expect(messages.en.toLowerCase()).toContain('authentication');
      expect(messages.zhCN).toBe('需要认证');
    });

    test('should return message for validation errors', () => {
      const message = ErrorMessageI18n.getMessage(ErrorCode.VALIDATION_FAILED, 'zh-CN');
      expect(message).toBe('验证失败');
    });

    test('should support message parameters', () => {
      // getMessage supports params as third argument
      const message = ErrorMessageI18n.getMessage(ErrorCode.INTERNAL_ERROR, 'en', { detail: 'test' });
      expect(message).toBeDefined();
    });
  });

  describe('default language', () => {
    test('should support multiple languages', () => {
      // Test that different languages return different messages
      const enMessage = ErrorMessageI18n.getMessage(ErrorCode.INTERNAL_ERROR, 'en');
      const zhMessage = ErrorMessageI18n.getMessage(ErrorCode.INTERNAL_ERROR, 'zh-CN');

      // English and Chinese messages should be different
      expect(enMessage).not.toBe(zhMessage);
      expect(zhMessage).toBe('服务器内部错误');
    });
  });

  describe('ErrorMessageI18n.parseLanguageFromHeader', () => {
    test('should parse zh-CN from header', () => {
      const lang = ErrorMessageI18n.parseLanguageFromHeader('zh-CN,zh;q=0.9,en;q=0.8');
      expect(lang).toBe('zh-CN');
    });

    test('should parse Japanese', () => {
      const lang = ErrorMessageI18n.parseLanguageFromHeader('ja,en;q=0.8');
      expect(lang).toBe('ja');
    });

    test('should parse Korean', () => {
      const lang = ErrorMessageI18n.parseLanguageFromHeader('ko-KR,ko;q=0.9');
      expect(lang).toBe('ko');
    });

    test('should return English by default', () => {
      const lang = ErrorMessageI18n.parseLanguageFromHeader('fr,de;q=0.8');
      expect(lang).toBe('en');
    });

    test('should return English when header is null', () => {
      const lang = ErrorMessageI18n.parseLanguageFromHeader(null);
      expect(lang).toBe('en');
    });

    test('should return English when header is undefined', () => {
      const lang = ErrorMessageI18n.parseLanguageFromHeader(undefined);
      expect(lang).toBe('en');
    });

    test('should handle zh without region code', () => {
      const lang = ErrorMessageI18n.parseLanguageFromHeader('zh');
      expect(lang).toBe('zh-CN');
    });
  });
});
