import { ApiError } from './ai';
import { GitError } from './git';
import { t } from './i18n';

// 把内部错误类型映射成用户能看懂的文案，生成命令与配置面板共用
export function describeError(err: unknown): string {
  if (err instanceof GitError) {
    return t.gitFailed(err.detail);
  }
  if (err instanceof ApiError) {
    switch (err.kind) {
      case 'timeout':
        return t.requestTimeout();
      case 'cancelled':
        return t.generationCancelled();
      case 'http':
        return t.requestFailed(err.detail);
      case 'invalid-response':
        return t.invalidResponse();
      case 'empty-response':
        return t.emptyResponse();
      default:
        return t.networkFailed(err.detail);
    }
  }
  return toErrorText(err);
}

export function toErrorText(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return typeof err === 'string' ? err : t.unknownError();
}
