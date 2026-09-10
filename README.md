# EN ROUTE

一个以图像为主的个人记录站。主视图一屏一则，归档便于查找，随记用于短文。当前视觉以 art.pmusaki.com 的字体与排版为参考：默认纯白背景、Courier Prime 700 等宽字体、44px 桌面导航、居中大图和小号作品说明。手机使用 84px 两行导航以容纳三种语言。所有语言的品牌名统一为 EN ROUTE，没有复制参考站代码或图片。

主题首次访问默认浅色，手动选择的深色主题仍会被记住。中文和日文字形使用系统字体回退，拉丁字母与数字使用自托管的 Courier Prime。

## 本地运行

需要 Node.js 22 或更高版本。进入 `D:\document\still-notes`：

```sh
npm ci
npm run images
npm run dev
```

默认访问 http://localhost:5173 。端口占用时 Vite 会选择其他端口，以终端输出为准。

```sh
npm test
npm run build
npm run preview
```

`build` 自动生成响应式图片与图标，再执行 TypeScript 检查和生产打包。可直接上传 `dist/` 的内容，不能直接双击源文件 `index.html` 运行。当前示例中不需要 API Key、数据库或服务器端程序。

## 多语言

站点支持中文、English、日本語。页头右侧的语言按钮可在不改变当前页面和主视图图片位置的前提下切换语言，选择保存在浏览器 `localStorage` 的 `en-route-language` 键中。首次访问默认中文；隐私模式中存储不可用时仍可在当前会话切换。

新增或修改记录时，先编辑 `src/content/journal.json` 的中文主数据，再同步编辑 `src/content/translations/en.json` 和 `src/content/translations/ja.json`。界面文字位于 `src/i18n/locales/`。`npm test` 会检查三种界面语言、每一则记录与随记的译文是否完整，以及插值参数是否一致。

## 修改内容

主要编辑 `src/content/journal.json`，照片放在 `public/images/`。内容修改后重新构建、发布即可。

- `site.name` / `englishName`：站名。英文与日文展示文案分别在 `src/content/translations/en.json`、`src/content/translations/ja.json`，界面文案在 `src/i18n/locales/`。每种语言都必须保留相同的记录 `id`。
- `site.about`：关于页段落；`email` 为空时不显示联系链接。
- `site.demo`：当前为 `true`，显示示例来源说明。换成自己的内容后才改为 `false`。
- `entries`：所有影像记录。`featured: true` 的记录进入主视图，其余只进入归档。至少保留一则精选记录。
- `notes`：轻量随记，可有或没有图片。
- `id`：唯一的小写英文短名，用于永久链接。正式发布后尽量不变。
- `date`：`YYYY-MM-DD`，记录自动按日期倒序；归档搜索支持日期、地点、标题与正文。
- `image`：例如 `images/my-walk.jpg`，不要加 `public/` 或开头的斜杠。
- `alt`：具体描述画面内容，供辅助技术与图片加载失败时使用。
- `body`：段落数组。
- `category`：可自行添加分类，归档筛选会自动生成。

图片文件名使用英文、数字和连字符。接受 jpg/jpeg/png/webp。替换后运行 `npm run images` 更新 480 / 960 / 1920 宽的 WebP 版本。建议原图宽度 1600–2400px，保留原始比例；不要上传含有敏感定位信息的私人原片。Sharp 生成的展示版本不保留原始 EXIF，但 `public/` 中的源图片也会公开，应提前清理敏感信息。

站点图标由 `scripts/prepare-images.mjs` 生成；可调整该脚本换成自己的标识。页面标题与社交分享描述在 `index.html`，正式改名时一起修改。

## 上线

### Netlify / Vercel

把这个目录作为一个独立 Git 仓库推送，再导入平台。配置文件已包含构建命令与输出目录：

- 安装：`npm ci`
- 构建：`npm run test && npm run build`
- 输出：`dist`
- Node：22 或更高

也可以本地构建后，直接将 `dist` 拖入 Netlify Drop。不要上传 `node_modules` 或整个工作目录。

### GitHub Pages

1. 将项目推送到 GitHub，默认分支名设为 `main`。
2. 仓库 Settings → Pages → Source 选择 GitHub Actions。
3. 推送会触发 `.github/workflows/deploy.yml`，也可以手动运行。
4. 绑定自定义域名时，在 Pages 设置里配置域名与 HTTPS，再到域名服务商配置 DNS。

当前使用 HashRouter，例如 `/#/entry/a-quiet-morning`，加上相对资源路径，兼容 GitHub Pages 的仓库子目录，无需服务器重写规则。刷新详情页不会因静态路由返回 404。

### 自有服务器 / 对象存储

上传 `dist` 内容，启用静态站点服务并把默认文档设为 `index.html`。给域名启用 HTTPS。资源有哈希文件名的 `/assets/` 可以长期缓存；`index.html` 与 `/images/` 不建议设为 immutable，因为照片可能保留文件名更新。

## 发布前清单

- 换掉示例照片、日记文字和暂定站名；确认照片版权与人物隐私。
- 设置真实邮箱，或保持为空。
- 更新首页 description、Open Graph 元信息；有域名后可增加 canonical 和分享图片的绝对 URL。
- 当前 Hash 路由可直达各页，但不是为搜索引擎逐篇收录或逐篇社交预览优化的。需要独立文章 SEO 时，下一步建议迁移到 Astro 静态生成，而非继续为 SPA 增加补丁。
- 执行 `npm test`、`npm run build`，检查生成的 `dist`。
- 在真实 iOS Safari 与 Android Chrome 上用触摸、浏览器地址栏伸缩、横竖屏各检查一次。当前已做桌面 Chromium 的多视口检查，不等同真实设备认证。
- 修改语言、缓存和触摸交互：切换中文、English、日本語，刷新页面确认语言保持；再检查语言切换后当前页面和记录不变。
- 检查手机网络下的图片加载，开启 HTTPS 后再次测试复制链接。

## 当前范围

已实现：全屏原生滚动、轻度吸附、横竖图适配、主视图位置恢复、详情、图片查看器、缩放、键盘切图、分享链接复制、分类搜索、网格/列表归档、随记、关于、中文 / English / 日本語切换与记忆、明暗主题记忆、减少动态效果支持。

尚未实现：后台登录、在线上传、评论、云端同步、访客统计。不包含虚假的上传或发布按钮。当前每则记录一张图；若以后需要一日多图，可扩展记录数据与查看器。

安全与隐私：不屏蔽右键或开发者工具。字体和图片都由站点本地提供，浏览页面不依赖外部图片服务器。除了用户主动点击来源链接，没有引入分析或广告脚本。

## 文件结构

```text
src/main.tsx                 页面、导航和交互
src/styles.css               响应式视觉样式
src/content/journal.json     站点信息与内容
public/images/               照片源文件与生成的 WebP
scripts/prepare-images.mjs   图片处理与图标生成
tests/content.test.mjs       内容完整性检查
screenshots/                本机浏览器验收截图，不提交 Git
netlify.toml / vercel.json   静态托管配置
.github/workflows/deploy.yml GitHub Pages 自动发布
```

## 示例图片

示例来自 Unsplash 图片服务，原始资源地址记录在每则的 `sourceImage` 中。见 `ASSETS.md`。图像仅用于提供可体验的初始页面，正式作为私人日记发布前应换成你自己的照片。示例文字为本项目演示撰写，不代表真实行程。
