import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import type { Config } from './config';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message: string;
  };
}

function buildSystemPrompt(cfg: Config): string {
  const stylePrompts: Record<string, string> = {
    conventional: `You are a commit message generator. Generate a concise commit message following the Conventional Commits specification.
Format: <type>(<scope>): <description>
Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build.
Keep the description under 72 characters. Only output the commit message, no explanation.`,
    simple: `You are a commit message generator. Generate a very short and simple commit message summarizing the changes in one sentence. Only output the commit message, no explanation.`,
    detailed: `You are a commit message generator. Generate a commit message with a short summary line (under 72 chars) followed by a blank line and a more detailed explanation of the changes. Only output the commit message, no explanation.`,
  };

  let prompt = stylePrompts[cfg.style] || stylePrompts.conventional;
  prompt += `\nRespond in ${cfg.language}.`;
  if (cfg.customPrompt) {
    prompt += '\n' + cfg.customPrompt;
  }
  return prompt;
}

export async function generateCommitMessage(diff: string, cfg: Config): Promise<string> {
  const url = new URL(cfg.baseUrl);
  const isHttps = url.protocol === 'https:';

  const postData = JSON.stringify({
    model: cfg.model,
    messages: [
      { role: 'system', content: buildSystemPrompt(cfg) },
      { role: 'user', content: `Generate a commit message for the following diff:\n\n${diff}` },
    ],
    temperature: 0.3,
  });

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: `${url.pathname}/chat/completions`.replace(/\/+/g, '/'),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve, reject) => {
    const client = isHttps ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json: ChatCompletionResponse = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message));
            return;
          }
          const message = json.choices?.[0]?.message?.content?.trim();
          if (!message) {
            reject(new Error('Empty response from AI service'));
            return;
          }
          resolve(message);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Request failed: ${err.message}`)));
    req.write(postData);
    req.end();
  });
}
