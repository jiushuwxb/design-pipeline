# Design Style Presets

These presets translate mature web-design patterns into reusable project constraints and section modules.

They are not copies of third-party websites. Each preset contains:

- `style.md`: design intent, layout rules, component recipes, motion rules, and negative rules.
- `tokens.json`: default color, typography, radius, and spacing tokens for Stitch prompts and code generation.
- `sections.json`: composable page sections such as hero, bento grid, case study, pricing, FAQ, dashboard shell, KPI row, and CTA modules.

Preview mode can use these presets to keep Stitch design and generated code aligned.

Development mode should not apply these presets by default; it should follow `development-code-template/` and company production conventions.

## Important

Theme colors are not hard constraints. PRD/brand colors should override preset colors. The main value of each preset is its section library, layout rhythm, component recipes, motion rules, and negative constraints.

For website/showcase work, the pipeline should:

1. Select a style preset.
2. Select 5-8 suitable sections from that preset's `sections.json`.
3. Arrange sections into a coherent page story.
4. Use tokens as defaults and adapt colors to the PRD/brand.
5. Generate Stitch prompts and code from the same selected section composition.


1. premium-bento-saas
适合：SaaS 官网、AI 产品页、功能展示页。
特点：高级感 bento grid、清晰 CTA、精致渐变、产品截图/指标/功能卡片。默认风格。
2. framer-saas-minimal
适合：创业产品、AI 工具、开发者工具官网。
特点：留白多、层级干净、边框轻、装饰少，偏 Framer 模板那种简洁产品营销感。
3. linear-product-clean
适合：开发者工具、B2B 产品、效率工具、任务/项目管理类产品。
特点：克制、精准、偏深色产品 UI，细边框、状态列表、命令面板、产品截图感强。
4. webflow-portfolio-motion
适合：作品集、创意工作室、个人品牌、案例展示页。
特点：大字号、项目网格、滚动叙事、case study、较强动效节奏，偏 Webflow 作品集风格。
5. awwwards-motion-brand
适合：品牌官网、活动页、创意发布页、高视觉冲击项目。
特点：沉浸式首屏、非对称布局、强字体、强视觉资产、电影感动效，偏 Awwwards 创意站。
6. dark-3d-tech
适合：AI 平台、数据基础设施、网络安全、Web3、技术型产品。
特点：深色背景、空间层次、发光边缘、数据流/网格/节点图、克制的 3D 科技感。
7. editorial-studio
适合：建筑、摄影、设计工作室、高端服务、精品品牌。
特点：杂志式排版、低饱和色、强图文关系、大留白、优雅安静，不偏 SaaS。
8. enterprise-dashboard
适合：后台系统、CRM、运营平台、监控系统、业务管理模块。
特点：高信息密度、KPI、筛选器、表格、图表、侧边栏、低装饰，偏生产工具界面。
