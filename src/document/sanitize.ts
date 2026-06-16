import {
  extractComments,
  insertComment,
  normalizeMarkdown,
} from "./comments.ts";

export interface SanitizeResult {
  valid: boolean;
  errors: string[];
}

const DISALLOWED: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /^#{1,6}\s/m, message: "不支持标题 (#)" },
  { pattern: /^```/m, message: "不支持代码块 (```)" },
  { pattern: /^>\s/m, message: "不支持块引用 (>)" },
  { pattern: /!\[.*]\(.*\)/, message: "不支持图片" },
  { pattern: /<\/?[a-zA-Z][\s\S]*?>/, message: "不支持 HTML 标签" },
  { pattern: /\n{3,}/, message: "不允许连续空行" },
];

const TEST_DOC = "Test paragraph.\n";
const TEST_ID = "sanitize-check";

export function sanitize(input: string): SanitizeResult {
  if (!input.trim()) {
    return { valid: false, errors: ["评论内容不能为空"] };
  }

  const formatErrors: string[] = [];
  for (const { pattern, message } of DISALLOWED) {
    if (pattern.test(input)) {
      formatErrors.push(message);
    }
  }
  if (formatErrors.length > 0) {
    return { valid: false, errors: formatErrors };
  }

  const withComment = insertComment(TEST_DOC, 0, TEST_ID, "requested", input);
  const extracted = extractComments(withComment);
  const match = extracted.find((c) => c.id === TEST_ID);
  const normalized = normalizeMarkdown(input);

  if (!match || match.body.trim() !== normalized) {
    console.warn(
      "[lotra] round-trip mismatch — DISALLOWED list may be incomplete",
      {
        input: normalized,
        extracted: match?.body.trim() ?? null,
      },
    );
    return { valid: false, errors: ["输入内容包含不支持的格式"] };
  }

  return { valid: true, errors: [] };
}
