import { z } from "zod";

// ========== 流水线模式 ==========

export const PipelineMode = z.enum(["preview", "development"]);
export type PipelineMode = z.infer<typeof PipelineMode>;

export const PreviewFramework = z.enum(["react", "vue", "html"]);
export type PreviewFramework = z.infer<typeof PreviewFramework>;

export const BackendFramework = z.enum(["express", "fastify", "koa"]);
export type BackendFramework = z.infer<typeof BackendFramework>;

// ========== 代码规范配置 ==========

export const CodeStandards = z.object({
  indent: z.enum(["spaces", "tabs"]).default("spaces"),
  indentSize: z.number().default(2),
  quotes: z.enum(["single", "double"]).default("single"),
  semi: z.boolean().default(true),
  componentNaming: z.enum(["PascalCase", "kebab-case"]).default("PascalCase"),
  fileNaming: z.enum(["PascalCase", "kebab-case", "camelCase"]).default("PascalCase"),
  cssApproach: z.enum(["tailwind", "scss", "css-modules", "styled-components"]).default("tailwind"),
  typescript: z.boolean().default(true),
});
export type CodeStandards = z.infer<typeof CodeStandards>;

// ========== 模板配置 ==========

export const ProjectTemplate = z.object({
  name: z.string(),
  description: z.string(),
  frontendStructure: z.array(z.string()).default([]),  // 目录结构
  backendStructure: z.array(z.string()).default([]),
  sharedFiles: z.record(z.string(), z.string()).default({}),  // 文件名 → 模板内容
});
export type ProjectTemplate = z.infer<typeof ProjectTemplate>;

// ========== 设计概要（第1层产出） ==========

export const ComponentSpec = z.object({
  name: z.string(),
  type: z.enum(["form", "table", "card", "nav", "sidebar", "modal", "chart", "list", "header", "footer", "button", "input", "other"]),
  description: z.string(),
  states: z.array(z.string()).default([]),
  interactions: z.array(z.string()).default([]),
  apiEndpoint: z.string().optional(),   // 开发模式：关联的后端接口
  dataModel: z.string().optional(),      // 开发模式：数据模型
});

export const PageSpec = z.object({
  name: z.string(),
  route: z.string(),
  description: z.string(),
  components: z.array(ComponentSpec),
  layout: z.enum(["single-column", "two-column", "dashboard", "fullscreen"]).default("single-column"),
});

export const DesignBrief = z.object({
  project: z.string(),
  theme: z.object({
    style: z.string(),
    colors: z.array(z.string()).default([]),
    atmosphere: z.string().default("professional"),
  }),
  pages: z.array(PageSpec),
  sharedComponents: z.array(ComponentSpec).default([]),
});

export type ComponentSpec = z.infer<typeof ComponentSpec>;
export type PageSpec = z.infer<typeof PageSpec>;
export type DesignBrief = z.infer<typeof DesignBrief>;

// ========== 设计生成结果（第2层产出） ==========

export const DesignOutput = z.object({
  pageName: z.string(),
  stitchUrl: z.string().optional(),
  screenshot: z.string().optional(),
  prompt: z.string(),
  status: z.enum(["generated", "failed", "pending"]),
  error: z.string().optional(),
});
export type DesignOutput = z.infer<typeof DesignOutput>;

// ========== 代码生成结果（第3层产出） ==========

export const CodeOutput = z.object({
  pageName: z.string(),
  componentName: z.string(),
  code: z.string(),
  language: z.enum(["tsx", "ts", "vue", "html", "css", "scss"]),
  filePath: z.string(),
  framework: PreviewFramework.optional(),
});
export type CodeOutput = z.infer<typeof CodeOutput>;

// 后端代码产物
export const BackendCodeOutput = z.object({
  module: z.string(),
  fileName: z.string(),
  code: z.string(),
  language: z.enum(["ts", "js", "json"]),
  filePath: z.string(),
  framework: BackendFramework,
});
export type BackendCodeOutput = z.infer<typeof BackendCodeOutput>;

// 开发模式完整项目产出
export const DevProjectOutput = z.object({
  frontendPath: z.string(),
  backendPath: z.string(),
  frontendFiles: z.array(CodeOutput).default([]),
  backendFiles: z.array(BackendCodeOutput).default([]),
  readme: z.string().optional(),
});
export type DevProjectOutput = z.infer<typeof DevProjectOutput>;

// ========== 评审结果（第5层产出） ==========

export const ReviewIssue = z.object({
  severity: z.enum(["critical", "major", "minor", "suggestion"]),
  category: z.enum(["consistency", "completeness", "usability", "accessibility", "performance"]),
  description: z.string(),
  location: z.string().optional(),
  suggestion: z.string(),
});
export type ReviewIssue = z.infer<typeof ReviewIssue>;

export const ReviewReport = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  issues: z.array(ReviewIssue),
  passThreshold: z.number().default(80),
  needIteration: z.boolean(),
});
export type ReviewReport = z.infer<typeof ReviewReport>;

export const BuildVerification = z.object({
  status: z.enum(["passed", "failed", "skipped"]),
  projectPath: z.string(),
  command: z.string().optional(),
  checkedAt: z.string(),
  output: z.string().default(""),
});
export type BuildVerification = z.infer<typeof BuildVerification>;

export const VisualEvidenceReport = z.object({
  status: z.enum(["passed", "failed"]),
  capturedAt: z.string(),
  screenshots: z.array(z.object({
    route: z.string(),
    viewport: z.string(),
    path: z.string(),
  })).min(1),
  findings: z.array(z.string()).default([]),
});
export type VisualEvidenceReport = z.infer<typeof VisualEvidenceReport>;

export const GsapSkillManifest = z.object({
  enabled: z.boolean(),
  framework: z.string(),
  skills: z.array(z.enum(["gsap-core", "gsap-timeline", "gsap-scrolltrigger", "gsap-performance"])),
  sources: z.array(z.string()),
  generatedAt: z.string(),
});
export type GsapSkillManifest = z.infer<typeof GsapSkillManifest>;

// ========== 流水线状态 ==========

export const PipelineState = z.object({
  id: z.string(),
  prdPath: z.string(),
  currentLayer: z.number().min(1).max(5),
  mode: PipelineMode.default("preview"),
  previewFramework: PreviewFramework.default("react"),
  backendFramework: BackendFramework.default("express"),
  codeStandards: CodeStandards.default({}),
  designBrief: DesignBrief.optional(),
  designs: z.array(DesignOutput).default([]),
  codeOutputs: z.array(CodeOutput).default([]),
  backendOutputs: z.array(BackendCodeOutput).default([]),
  devProject: DevProjectOutput.optional(),
  reviewReport: ReviewReport.optional(),
  buildVerification: BuildVerification.optional(),
  iteration: z.number().default(0),
  maxIterations: z.number().default(3),
});
export type PipelineState = z.infer<typeof PipelineState>;
