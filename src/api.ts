/**
 * 统一的 AI API 调用工具
 * 兼容 Anthropic SDK / DeepSeek / OpenAI 多种响应格式
 */

import { config } from "./config.js";
import type { z } from "zod";

interface CallAIOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  extractJson?: boolean;
}

interface AIResponse {
  content: string;
  json?: any;
}

interface CallAIJsonOptions<S extends z.ZodTypeAny> extends Omit<CallAIOptions, "extractJson"> {
  schema: S;
  schemaName: string;
  retries?: number;
}

export async function callAI(options: CallAIOptions): Promise<AIResponse> {
  const { system, prompt, maxTokens = 16384, extractJson = false } = options;

  const response = await fetch(`${config.anthropic.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropic.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`API 请求失败 [${response.status}]: ${errText.slice(0, 300)}`);
  }

  const data = await response.json() as any;

  // 提取文本内容（兼容多种格式）
  let content = "";

  // Anthropic / DeepSeek Anthropic-compatible 格式：content 是数组
  if (Array.isArray(data.content)) {
    // 优先取 text 类型的块，再用 thinking 类型
    const textBlocks = data.content.filter((c: any) => c.type === "text");
    const thinkBlocks = data.content.filter((c: any) => c.type === "thinking");

    if (textBlocks.length > 0) {
      content = textBlocks.map((c: any) => c.text || "").join("");
    } else if (thinkBlocks.length > 0) {
      content = thinkBlocks.map((c: any) => c.thinking || "").join("");
    }
  }

  // OpenAI 格式
  if (!content && data.choices?.[0]?.message?.content) {
    const msg = data.choices[0].message.content;
    if (typeof msg === "string") {
      content = msg;
    } else if (Array.isArray(msg)) {
      content = msg.map((c: any) => c.text || c.thinking || "").join("");
    }
  }

  // 纯字符串
  if (!content && typeof data.message === "string") {
    content = data.message;
  }

  if (!content) {
    throw new Error(
      `API 返回了空内容。Content 结构: ${JSON.stringify(data.content?.map?.((c: any) => c.type)).slice(0, 300)}`
    );
  }

  const result: AIResponse = { content };

  // 尝试从内容中提取 JSON
  if (extractJson) {
    result.json = extractJSON(content);
  }

  return result;
}

/**
 * Call the model and validate its JSON at the trust boundary. Invalid model
 * output is sent back once (configurable) with concise validation errors.
 */
export async function callAIJson<S extends z.ZodTypeAny>(options: CallAIJsonOptions<S>): Promise<z.output<S>> {
  const { schema, schemaName, retries = 1, ...callOptions } = options;
  let prompt = callOptions.prompt;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await callAI({ ...callOptions, prompt, extractJson: false });
    let candidate: unknown;
    try {
      candidate = extractJSON(result.content);
    } catch (error) {
      lastError = error;
      prompt = `${callOptions.prompt}\n\nYour previous response did not contain parseable JSON for ${schemaName}.\nError: ${String(error).slice(0, 1000)}\n\nReturn a corrected, complete JSON object only. Previous output:\n${result.content.slice(0, 12000)}`;
      continue;
    }

    const parsed = schema.safeParse(candidate);
    if (parsed.success) return parsed.data;

    lastError = parsed.error;
    const issues = parsed.error.issues
      .slice(0, 12)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("\n");

    prompt = `${callOptions.prompt}\n\nYour previous JSON was invalid for ${schemaName}.\nValidation errors:\n${issues}\n\nReturn a corrected, complete JSON object only. Previous output:\n${result.content.slice(0, 12000)}`;
  }

  throw new Error(`AI returned invalid ${schemaName} after ${retries + 1} attempt(s): ${String(lastError)}`);
}

/**
 * 从混合了思考过程和 JSON 的文本中提取有效的 JSON 对象
 */
export function extractJSON(text: string): any {
  // 策略 1：找到第一个 { 和最后一个 }，尝试解析
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`文本中没有找到 JSON 对象:\n${text.slice(0, 500)}`);
  }

  // 尝试从外到内逐步解析
  let bestJSON: any = null;

  // 尝试 1：直接整个范围
  const range = text.slice(firstBrace, lastBrace + 1);
  try {
    bestJSON = JSON.parse(range);
    return bestJSON;
  } catch {
    // 继续
  }

  // 尝试 2：找到 ```json 代码块
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // 继续
    }
  }

  // 尝试 3：修复常见的 JSON 截断问题
  let fixed = range;

  // 移除尾随逗号
  fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

  // 如果被截断在字符串中间，尝试闭合
  const quoteCount = (fixed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    fixed += '"';
  }

  // 按嵌套顺序闭合括号 — 用栈跟踪，LIFO 闭合
  const stack: string[] = [];
  let inString = false;
  let prevChar = "";
  for (const ch of fixed) {
    if (ch === '"' && prevChar !== '\\') {
      inString = !inString;
    } else if (!inString) {
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if (ch === '}' || ch === ']') {
        // 弹出匹配的开括号
        const expected = ch === '}' ? '}' : ']';
        const lastIdx = stack.lastIndexOf(expected);
        if (lastIdx !== -1) {
          stack.splice(lastIdx, 1);
        }
      }
    }
    prevChar = ch;
  }

  // LIFO 闭合：反转栈，先闭合最后打开的
  for (let i = stack.length - 1; i >= 0; i--) {
    fixed += stack[i];
  }

  try {
    return JSON.parse(fixed);
  } catch (e) {
    throw new Error(
      `无法解析 JSON。修复后仍失败: ${String(e).slice(0, 200)}\n原始文本末尾: ...${range.slice(-300)}`
    );
  }
}

/**
 * 将 API 返回的思考过程 + JSON 分离
 * 对于 reasoning 模型，思考过程在前，JSON 结果在后
 */
export function separateThinkingAndJSON(content: string): { thinking: string; jsonText: string } {
  const firstBrace = content.indexOf("{");
  if (firstBrace === -1) {
    return { thinking: content, jsonText: "" };
  }

  const thinking = content.slice(0, firstBrace).trim();
  const jsonText = content.slice(firstBrace);
  return { thinking, jsonText };
}
