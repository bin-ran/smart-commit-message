import * as vscode from 'vscode';
import { inferLanguage, t } from './i18n';

export interface Config {
  apiKey: string;
  baseUrl: string;
  model: string;
  style: 'conventional' | 'simple' | 'detailed';
  language: string;
  customPrompt: string;
}

export function getConfig(): Config {
  const config = vscode.workspace.getConfiguration('autoCommit');
  return {
    apiKey: config.get<string>('apiKey', ''),
    baseUrl: config.get<string>('baseUrl', 'https://api.deepseek.com'),
    model: config.get<string>('model', 'deepseek-v4-flash'),
    style: config.get<'conventional' | 'simple' | 'detailed'>('style', 'conventional'),
    language: config.get<string>('language', inferLanguage()),
    customPrompt: config.get<string>('customPrompt', ''),
  };
}

export function validateConfig(cfg: Config): string | undefined {
  if (!cfg.apiKey) {
    return t.apiKeyMissing();
  }
  if (!cfg.baseUrl) {
    return t.baseUrlMissing();
  }
  if (!cfg.model) {
    return t.modelMissing();
  }
  return undefined;
}
