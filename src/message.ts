// 模型偶尔会把结果包在代码围栏/引号里，或加一句 “Here is …”，这里统一清干净
const FENCE = /^```[a-zA-Z0-9_+-]*[ \t]*\r?\n?([\s\S]*?)\r?\n?```$/;
const PREAMBLE = /^(?:sure[,!. ]*)?(?:here(?:'s| is)\b|the commit message\b)[^\n]{0,120}[:：]?$/i;
const QUOTE_PAIRS: Array<[string, string]> = [
  ['"', '"'],
  ["'", "'"],
  ['`', '`'],
  ['“', '”'],
  ['「', '」'],
];

function stripWrappingOnce(text: string): string {
  const fence = text.match(FENCE);
  if (fence) {
    return fence[1].trim();
  }

  for (const [open, close] of QUOTE_PAIRS) {
    if (text.length > open.length + close.length && text.startsWith(open) && text.endsWith(close)) {
      return text.slice(open.length, text.length - close.length).trim();
    }
  }

  if (text.startsWith('**') && text.endsWith('**') && text.length > 4) {
    return text.slice(2, text.length - 2).trim();
  }

  return text;
}

function stripPreamble(text: string): string {
  const lines = text.split('\n');
  while (lines.length > 1 && PREAMBLE.test(lines[0].trim())) {
    lines.shift();
  }
  return lines.join('\n').trim();
}

function normalizeWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeCommitMessage(raw: string): string {
  if (!raw || !raw.trim()) {
    return '';
  }

  let text = raw.replace(/\r\n?/g, '\n').trim();
  // 围栏与引号可能层层包裹（```"feat: x"```），逐层剥离
  for (let round = 0; round < 3; round += 1) {
    const next = stripWrappingOnce(text);
    if (next === text) {
      break;
    }
    text = next;
  }

  return normalizeWhitespace(stripPreamble(text));
}
