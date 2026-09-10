# 内容更新流程改造 · 实现评估

评估对象：如何让站点持有者更新作品／记录，以及这需要哪些前置准备。
状态：评估中，未开始实现。

---

## 0. 结论速览

| 方案 | 认证 | 前置准备量 | 改动面 | 长期维护 |
|---|---|---|---|---|
| **A. 维持文件驱动** | 不需要 | 极小 | 极小 | 几乎为零 |
| **B. Git 型 CMS** | GitHub OAuth（第三方代理） | 中 | 中 | 低（无服务器） |
| **C. Supabase 后台** | Supabase Auth + MFA | **大** | 大 | **高**（要自己守 RLS） |
| **D. SaaS 无头 CMS** | 平台代管 | 小 | 中 | 低（但绑定供应商） |

**关键前提**：项目目前**不是 Git 仓库**（无 `.git`、无远端），而 B / A 的 CI 路线都依赖它。这是任何方案开始前都要先补的一步。

**最大技术约束**：`npm test` 会强制校验三语译文完整，且部署链路在 build 前先跑 test。这意味着**"只写中文就发布"会直接让构建失败**。任何编辑流程都必须先解决这个冲突。

---

## 1. 现状核查

以下结论来自实际读取代码，不是推测。

### 1.1 数据模型（中文为唯一源数据）

`src/content/journal.json` 是**规范数据源**：

```
site     { name, englishName, tagline, email, demo, about[] }
entries[] { id, title, date, place, category, image, alt, body[], sourceImage?, featured }
notes[]   { id, date, title, body[], image?, alt? }
```

`src/content/translations/{en,ja}.json` **只覆盖文本字段**，按 id 索引：

```
entries:    Record<id, { title, place, alt, body }>
notes:      Record<id, { title, body, alt? }>
categories: Record<中文分类名, 译文>
site:       { name, tagline, about }
```

`src/i18n/index.tsx:54` 的合并方式决定了这个边界：

```js
{ ...entry, ...translation?.entries[entry.id] }
```

即 `id / date / image / featured / category` 永远取自 `journal.json`，译文无法覆盖。**译文缺失时静默回退中文**，界面不报错——靠测试兜底。

**测试的实际严格程度**（`tests/i18n.test.mjs`，远比"检查有没有翻译"要严）：

- `translation.entries` 的 key 集合必须与 `journal.json` 的 id 集合**完全相等**（`deepEqual` 比较排序后的数组），多一条少一条都失败
- 同上适用于 `notes` 与 `categories`
- 单条译文的字段集合必须**精确匹配**：记录为 `["title","place","alt","body"]`；带图随记为 `["title","body","alt"]`；无图随记为 `["title","body"]`。**多出任何字段都会失败**
- `body` 段落数必须与原文一致
- 不允许空字符串，也不允许出现 `TODO` / `TBD` / `{占位符}`
- **英文内容中出现汉字直接失败**（`/\p{Script=Han}/u`）

末两条对"先机翻后润色"和"英文缺失时回退中文"两种做法都是硬性阻断。第三条则意味着：**CMS 若在输出里附加自己的字段（如额外 id、时间戳、排序键），构建会直接失败**。

### 1.2 图片管线只认 journal.json

`scripts/prepare-images.mjs` 直接读 `src/content/journal.json`，对每个 `image` 生成 480 / 960 / 1920 三档 WebP。**它不认识数据库**。内容一旦离开 JSON，这条管线必须改写。

### 1.3 部署链路

- `netlify.toml`：`npm run test && npm run build` → `dist`
- `.github/workflows/deploy.yml`：`npm ci` → `npm test` → `npm run build` → GitHub Pages
- 两条链路都是**纯静态**，GitHub Pages 没有服务端运行时
- `release/still-notes-static.zip`（5.6 MB）是本地打包产物，对应 README 里"拖进 Netlify Drop"的手工路径

### 1.4 项目还不是 Git 仓库 ← 重要

```
Test-Path .git  →  False
git remote -v   →  （无输出）
```

`.gitignore`、`deploy.yml`、`netlify.toml`、`vercel.json` 都已备好，但仓库从未初始化。**方案 B 完全依赖 Git + 远端，方案 A 的 CI 改进也依赖它。**

### 1.5 现有公开承诺

README 第 94 行：

> 尚未实现：后台登录、在线上传、评论、云端同步、访客统计。不包含虚假的上传或发布按钮。

改造后需同步更新此段。

### 1.6 参考站（art.pmusaki.com）的做法

来自其 `robots.txt` 与 `/admin` 页面原文：

- 技术栈 **Next.js + Supabase**（Postgres + Auth + Storage）
- `/admin` 是工具入口页，`/admin/portfolio` 是作品 CMS，`/postcards/manage` 是随记编辑器
- **Supabase Auth + MFA（TOTP）** 保护；页面显示 `Checking authentication…` 为客户端鉴权门
- **没有注册入口**，账号只能在 Supabase 后台手动创建（`Authentication → Users`）
- 图片托管在 Supabase Storage（独立域名）

> 其 `robots.txt` 自己承认了安全边界：
> "It does nothing against a scraper that ... hits the Supabase storage/REST URLs directly"
>
> 即 robots.txt 与客户端鉴权门都只是劝阻，**真正的边界是数据库 Row Level Security 策略**。

---

## 2. 必须先做的四个决定

这四个决定会推翻性地改变实现方案，应在写任何代码前定下来。

### D1 · 是否需要手机发布？
- 否 → A / B 足够
- 是 → 只能 C 或 D（纯静态 + Git 提交在手机上体验很差）

### D2 · 三语是否必须同时完成？
这是**最尖锐的约束**。现状下新增一则中文记录而不补 en/ja，`npm test` 直接失败，部署中断。三种出路：

| 出路 | 做法 | 代价 |
|---|---|---|
| 强制三语 | 发布表单必须填满三种语言 | 发布变慢，但数据最干净 |
| 草稿机制 | 记录加 `draft: true`，测试与公开页面都跳过 | 要同时改 `localize()`、测试、归档筛选、主视图 |
| 先机翻后改 | 自动生成初稿再人工润色 | 要接翻译 API，质量需把关 |

> 推荐"草稿机制"：它同时解决了"先存中文、以后再翻译"的真实需求，且不破坏现有测试哲学（测试改为"非草稿必须三语完整"）。

### D3 · 内容留在 Git 还是进数据库？
- Git → 可 diff、可回滚、可离线、零成本；但更新要经过构建
- 数据库 → 即时生效、可手机操作；但要运维、要写 RLS、内容不再是纯文本

### D4 · 是否愿意长期维护一个后端？
C 的隐性成本不在开发，而在**长期**：依赖升级、RLS 策略审计、Supabase 免费额度、密钥轮换、备份。单人日记站要诚实评估这一点。

---

## 3. 方案对照

### 方案 A · 维持文件驱动（+ CI 优化）

**流程**：改 JSON → 放原图 → push → CI 自动跑 `npm run images` → 构建发布

**前置准备**
1. 初始化 Git 仓库并推到 GitHub
2. 把 `npm run images` 挪进 CI（现在它在 build 里，但需要本地先有原图）

**改动**：仅 `.github/workflows/deploy.yml` 与 `netlify.toml` 微调

**优点**：零认证、零安全面、零成本；内容天然版本化；现有测试与三语结构完全不动

**缺点**：仍需电脑 + Git；手机发不了；每次要等构建

**结论**：若 D1 为否，这是性价比最高的选择。

---

### 方案 B · Git 型 CMS（Sveltia CMS / Decap CMS）

**流程**：访问 `/admin` → GitHub 登录 → 网页填表上传图 → CMS 提交到 Git → 托管平台自动重建

**前置准备**
1. **Git 仓库 + GitHub 远端**（当前没有）
2. **OAuth 代理**：Netlify Identity 路线正在被弱化，当前推荐 GitHub OAuth 代理——Sveltia 有现成的 [`sveltia-cms-auth`](https://github.com/Nuclear-in-Space/sveltia-cms-auth)（Cloudflare Worker），Decap 社区也在往 [PKCE / GitHub 后端](https://github.com/decaporg/decap-cms/issues/7506)迁移。需要一个 Cloudflare / Netlify 账号托管它
3. **CMS 配置**：`public/admin/config.yml`

**改动面（比看起来大）**
- 三语结构需要自定义集合：`entries` 用 `i18n` 多语言配置，或写三个并列集合 + 自定义 widget
- `categories` 是 `Record<中文名, 译文>` 的**映射**，标准 CMS 的 list widget 表达不了，需要自定义 widget 或改为对象列表
- `body[]` 是段落数组，要映射为 markdown 或 string list
- `prepare-images.mjs` 不变（JSON 还在）✓ —— 这是 B 相对 C 的最大优势
- 新增站点需同步改 `localize()` 的读取方式（如果从 JSON 变成 CMS 产物）

**优点**：保持纯静态托管；内容仍是 Git 里的 JSON（可 diff、可回滚）；`npm test` 继续守住三语完整性；无数据库、无服务器要运维

**缺点**：三语 widget 是主要工作量；图片进仓库会让仓库体积增长（每次上传约 1–3 MB 原图 + 三档 WebP）；OAuth 代理是新增的外部依赖

**风险**：CMS 的 JSON 输出格式与现有结构若有偏差，会破坏 `localize()` 与测试——译文文件的字段集合是**精确匹配**的，CMS 附加任何额外字段都会让构建失败。因此**必须**先写一个格式一致性测试（比对 CMS 产出与现有结构），再接入真实内容。

---

### 方案 C · Supabase 后台（照搬参考站）

**前置准备**
1. 注册 Supabase 项目
2. 数据建模：把现有 JSON + 三语文件**规范化成表**。建议 `entries` / `entry_translations` / `notes` / `note_translations` / `categories` / `category_translations`
3. 建 Storage bucket 放图片
4. 手动创建管理员账号（**关闭注册**，与参考站一致）
5. 配置 RLS 策略：匿名只读已发布，认证可写
6. 开启 MFA（TOTP）
7. 写认证界面（登录、会话、登出、MFA 绑定）

**改动面（最大）**
- `scripts/prepare-images.mjs` 必须重写：改为向 Supabase Storage 上传并生成三档变体（可能要迁到 Edge Function）
- `src/i18n/index.tsx` 的数据来源从静态 import 改为异步获取 → **会引入加载态**，主视图、归档、详情、随记、关于全部受影响
- 需要处理加载失败、重试、离线等状态（正好对应 HANDOFF 里"未实现的资源驱动加载体验"）
- 现有的 `npm test` 内容完整性测试**大部分失效**（数据不在仓库里了），需要改为对数据库的校验或降级为运行时校验

**优点**：手机可发；草稿／私密天然支持；图片走 CDN；可扩展到大量作品；与参考站能力对齐

**缺点**：工作量与长期维护成本最高；失去"内容都是 Git 里的文本文件"这一属性；**安全责任转移到自己身上**

**最大风险**：Supabase 的 anon key 必然打包进浏览器 JS，人人可见。**唯一的边界是 RLS 策略**。策略写错（例如 `using (true)` 的写权限）等于把数据库开放给全网。参考站的 `robots.txt` 已明确承认这一点。

**另一个约束**：GitHub Pages 无法运行 Next.js 那样的服务端应用。C 方案在本项目里只能走"静态前端 + 客户端直连 Supabase"，这与参考站的架构并不完全相同。

---

### 方案 D · SaaS 无头 CMS（Sanity / Contentful 等）

**前置准备**：注册平台、建 schema、配 webhook 触发重建

**优点**：编辑体验最好；本地化与图片 CDN 开箱即用；完全不用碰认证

**缺点**：内容离开 Git（不再是可 diff 的文本）；供应商绑定；免费额度限制；仍需处理三语字段结构

**结论**：若不想碰任何基础设施，但接受内容托管在第三方，这是合理选择。

---

## 4. 无论选哪个都要做的准备

1. **初始化 Git 仓库并建立远端** —— 当前完全没有。这也是所有 CI / 托管方案的前提。
2. **决定 D2 的草稿策略** —— 它会同时改动 `localize()`、`tests/i18n.test.mjs`、归档筛选、主视图筛选。
3. **明确图片规范** —— README 已警告 `public/` 里的源图会公开、EXIF 可能泄露定位。上传流程应强制剥离 EXIF 或改为不入库的存储。
4. **准备回滚手段** —— 现在没有版本控制，改坏了无法回退。
5. **更新 README 第 90–96 行** —— "尚未实现：后台登录、在线上传"与"不包含虚假的上传或发布按钮"两段需与最终实现保持一致。

---

## 5. 工作量与风险排序

| 排序 | 事项 | 说明 |
|---|---|---|
| 1 | Git 仓库初始化 | 阻塞 A/B 及所有 CI，且是回滚能力的前提 |
| 2 | 草稿机制（D2） | 阻塞一切编辑流程设计 |
| 3 | 方案 B 的三语 widget | B 方案的主要工作量所在 |
| 4 | 方案 C 的数据建模 + RLS | C 方案的主要风险所在 |

**参考站的装备是否都需要？** 不必。它还有裁剪器、贴纸、调色板提取、直方图、9:16 预览（这些来自其 CSS 类名 `ad-framer` / `ad-sticker` / `ad-palette` / `ad-hist-canvas` / `ad-reel`，为作品集出版场景设计）。个人影像日记不需要这些。

---

## 6. 建议的下一步

1. 先回答 **D1（要不要手机发布）** 和 **D2（三语是否必须同步）** —— 这两个答案基本决定了方案。
2. 无论最终选哪个，**先初始化 Git 仓库**：它是零风险的，且是其他一切的前置条件。
3. 若倾向 B，先做一个**最小验证**：手写三语 collection 配置，只接 `notes` 一种内容，确认 CMS 产出的 JSON 能通过现有 `npm test` 且 `localize()` 正常读取，再扩展到 `entries`。

---

## 待确认

- [ ] D1：是否需要手机发布？
- [ ] D2：三语必须同步，还是允许草稿？
- [ ] D3：内容留在 Git 还是进数据库？
- [ ] D4：是否接受长期维护一个后端？
- [ ] 是否现在就初始化 Git 仓库？
