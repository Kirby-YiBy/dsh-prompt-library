# dsh-prompt-library

**在 DeepSeek Harness 里复刻 Voyager 的工作台** —— 提示词库、点击复制公式、会话文件夹，一个原生 DSH 插件搞定。

[Gemini Voyager](https://github.com/voyager-crew/voyager) 本身是浏览器扩展。这个项目把其中可以迁移的能力，用 DSH 自己的插件 API 重做进应用里：不需要扩展、不需要另开窗口、不依赖浏览器。

[English](README.md) | 中文

---

## 功能

### 提示词库（右下角悬浮球）

| | |
|---|---|
| 悬浮球 | 46px，可拖动，记住位置，点击展开 |
| 面板 | 440px，向上展开、右边缘对齐、边界钳制；头部可拖、可锁定 |
| 搜索 | 名称 / 正文 / 标签，逐字过滤 |
| 筛选 | 全部 / 已置顶 / 最近，外加标签多选（AND） |
| 视图 | 紧凑（默认）/ 舒适 |
| 排序 | 置顶分组 + 分隔线；拖动抓手排序，或聚焦后按 ↑/↓ |
| 预览 | 悬停 250ms 显示完整 Markdown |
| 编辑 | 备注名（必填、唯一）→ 正文 → 标签；删除会二次确认 |
| 变量 | `{{变量}}` 弹出填充卡，`\{{` 转义 |
| Markdown | 代码围栏、标题、列表、引用、分隔线、粗体、行内码、链接 |
| 导入导出 | Voyager 原生格式 `gemini-voyager.prompts.v1` |
| 其他 | 中英切换；点击可切「插入 / 复制」 |

### 引用回复

在对话里选中任意文字，出现小工具条。点「引用」会把选区以 Markdown 引用块写进输入框：每行
一个 `>`，前面先空一行，走 DSH 自己的草稿 API —— **不模拟按键，所以不会误发你的草稿**。

### 公式复制（点公式即可）

悬停公式会高亮，点一下就把 LaTeX 复制走。

- 识别链：`[data-math]` → `ms-katex` → `.katex` / `.katex-display` → `.math-inline`
- 取源链：`data-math` → `data-math-source` → KaTeX 的 `annotation[encoding="application/x-tex"]`
- 四种格式（面板底部切换）：`$…$`、纯 LaTeX、**Word 用 MathML**、Notion 的 `$$…$$`
- 行内公式包 `$…$`，行间公式包 `$$…$$`

### 会话文件夹（侧栏面板）

侧栏多一个文件夹图标，点开是文件夹页：

- 会话来自 DSH 自己的目录（`ctx.sessions.list`），自动过滤 subagent 子会话
- chips：全部 / 未归档 / 自建文件夹，各带数量
- **把会话拖到文件夹 chip 上**即归档，chip 会高亮成投放态
- 双击文件夹（或 ✎）就地重命名
- ✕ 删除前会确认一次；删文件夹只解除归档，**不删会话**
- 按标题搜索会话；每行显示所属文件夹和运行状态

---

## 环境要求

- DeepSeek Harness **0.2.1-rc.5** 或更新（桌面端或 `dsh web`）
- 宿主机 Node.js 20+

## 安装

从 GitHub 装（推荐）：

```sh
dsh plugin --profile desktop add github:Kirby-YiBy/dsh-prompt-library
```

装完重新加载应用窗口。用 `dsh web` 的话把 `--profile desktop` 换成 `--profile web`。

本地克隆（开发用）：

```sh
git clone https://github.com/Kirby-YiBy/dsh-prompt-library.git
dsh plugin --profile desktop add link:/绝对路径/dsh-prompt-library
```

用 `link:` 安装时别移动目录 —— 目标不存在会导致启动加载失败。

卸载：

```sh
dsh plugin --profile desktop remove dsh-prompt-library
```

数据仍留在 `~/.dsh`，想清空手动删文件即可。

## 数据位置

| 文件 | 内容 |
|---|---|
| `~/.dsh/prompt-library.json` | 提示词库（Voyager 的 `PromptItem` 结构） |
| `~/.dsh/session-folders.json` | 文件夹定义 + 每个会话的归属 |
| `~/.dsh/prompt-library-debug.log` | 诊断日志，随时可删 |

全部在本机，没有遥测、不联网、不需要账号。

## 实现方式

| 路径 | 半边 | 职责 |
|---|---|---|
| `lib/index.js` | 宿主（Node） | 管理两个 JSON 存储，提供 `/dsh-prompts/api/*` 共 13 个路由 |
| `client/client.js` | 浏览器 | 注册四个槽位：`shell.overlay`、`conversation.input.dock`、`sidebar.panellist`、`main` |
| `cordis.patch.yml` | 补丁 | 把条目插进 profile 的层栈 |

客户端用 DSH 的懒加载 CJS 格式（`window.__ModuleLoader__.load`），React 取自平台种子表，所以
仓库里就是实际运行的代码 —— **没有构建步骤**，没有 `dist/`，也没有 `prepare` 钩子。

写入一律走 DSH 自己的草稿编辑器（`shell.draftEditor.appendDraft`），不直接改 DOM：DSH 的输入框
以自己的模型回写 DOM，直接改会被它覆盖掉。

## 接口

精确路由、JSON、`no-store`。读取对 loopback 开放；写入要求来自 DSH 界面（loopback、桌面端的
`dsh-app://` 来源，或 `Origin: null`），其他站点一律 403。

完整路由表见 [README.md](README.md#http-api)。

## 开发

```sh
node test-client.mjs
```

它会 stub 模块加载器、React 和 cordis 上下文，断言四个槽位注册、它们使用的 id/key，以及 composer
桥接不抛错。没有构建步骤：改完 `client/client.js`，触发一次 profile 重组，刷新窗口即可。

## 没有移植的部分

- **时间线** —— 需要对话滚动锚点
- **导出对话** —— 需要会话消息接口
- **收藏库 / 云同步** —— 原版用 Google Drive，这里没有对应 OAuth
- **斜杠 `/` 补全** —— DSH 的 `/` 管线不对第三方插件开放

## 致谢

这个插件能有今天，靠的是 **[Gemini Voyager](https://github.com/voyager-crew/voyager)** —— 原作者
**Nagi-ovo** 及所有贡献者，以 MIT 协议开源。

这里几乎每一处"好用"都是他们先做出来的：悬浮球和它的拖动手感、440px 面板的向上展开与右对齐、
品牌绿配色、紧凑/舒适两种行样式、置顶模型、`{{变量}}` 填充卡、公式复制的四种格式、引用回复的交互。
本项目只是把这些设计在另一套宿主 API（DSH 的槽位、草稿编辑器、会话目录）上重新实现了一遍，
**不是他们代码的分支**。

如果你觉得好用，请去给原作点个 star：<https://github.com/voyager-crew/voyager>。

插件目录与社区在 <https://voyager.nagi.fun>。

## 许可

MIT，见 [LICENSE](LICENSE)。
