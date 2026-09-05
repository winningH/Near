# Near - AI 智能助手

基于 Vue 2 + Express 构建的自托管 AI 对话应用，支持流式响应、文件上传、深度思考模式与明暗主题切换。
后端对接**任意 OpenAI 兼容接口**（OpenAI、DeepSeek、Moonshot、本地 Ollama/vLLM 等），换服务商只需改三行环境变量。

![Vue.js](https://img.shields.io/badge/Vue-2.7-4fc08d?logo=vue.js)
![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06b6d4?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2d3748?logo=prisma)

## ✨ 功能特性

### 核心功能
- **🤖 OpenAI 兼容接口** - 任何 `/v1/chat/completions` 兼容服务都能接，含流式响应
- **🧠 深度思考模式** - 切换到推理模型，思考过程可折叠展示（需配置 `OPENAI_THINKING_MODEL`）
- **📎 文件上传** - 图片送入多模态模型；文本类附件读取正文；其余格式仅记录文件名
- **📋 对话历史** - 自动保存，支持重命名、删除与右键菜单
- **🔄 上下文记忆** - 自动携带最近 40 条消息

### 交互体验
- **🌓 主题切换** - 明暗模式，首次访问跟随系统，手动切换后以选择为准（含代码高亮配色）
- **⌨️ 快捷操作** - Enter 发送、Shift+Enter 换行
- **🖼️ 文件粘贴** - 直接粘贴图片或文件发送
- **⏹ 中断生成** - 生成中可随时停止，已生成的部分内容会保留到会话中

### 消息展示
- **🎨 Markdown 渲染** - 代码高亮、表格、列表；内联 HTML 一律转义显示
- **💭 思考过程展示** - 可折叠的深度思考内容
- **🔍 图片预览** - 点击消息中的图片查看大图

## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm（推荐）或 npm

### 安装步骤

1. 安装依赖
```bash
pnpm install
```

2. 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env`，填入你的接口信息：
```env
OPENAI_API_KEY=your_api_key_here
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

3. 初始化数据库
```bash
pnpm run db:push
```

4. 启动开发服务器（前端 + 后端）
```bash
pnpm run dev
```

前端访问 http://localhost:3000，后端运行在 http://localhost:3001。

## 🔌 接入其他模型服务

只要服务商提供 OpenAI 兼容的 `/v1/chat/completions` 接口，改这三行即可（以下地址以各服务商最新文档为准）：

| 服务商 | OPENAI_API_BASE | OPENAI_MODEL 示例 |
|--------|-----------------|-------------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 本地 Ollama | `http://localhost:11434/v1` | `qwen2.5:7b` |

说明：
- `OPENAI_API_BASE` 末尾写不写 `/v1` 都可以，程序会自动补全。
- 思考字段同时兼容 `reasoning_content` 与 `reasoning`。
- 若模型不支持图片理解，把 `ENABLE_VISION` 设为 `false`，图片将退化为文件名提示。
- 可调用的模型由服务端白名单控制（只能是 `OPENAI_MODEL` 或 `OPENAI_THINKING_MODEL`），客户端无法指定任意模型。

## ⚙️ 配置说明

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `OPENAI_API_KEY` | **是** | 无 | 接口密钥 |
| `OPENAI_API_BASE` | **是** | 无 | 接口地址，自动补 `/v1` |
| `OPENAI_MODEL` | **是** | 无 | 对话模型，需与接口地址所属服务商对应 |
| `OPENAI_THINKING_MODEL` | 否 | 空 | 深度思考模型，留空则关闭该功能 |
| `OPENAI_THINKING_OFF_PARAMS` | 否 | `{}` | 关闭思考时附加的请求参数（JSON 对象）。智谱 GLM-4.5 必须用 `{"thinking":{"type":"disabled"}}`，不能用 boolean |
| `OPENAI_TEMPERATURE` | 否 | `0.7` | 采样温度 |
| `DATABASE_URL` | 否 | `file:./dev.db` | SQLite 路径，相对于 `prisma/` 目录 |
| `PORT` | 否 | `3001` | 后端端口 |
| `CLIENT_PORT` | 否 | `3000` | 前端开发服务器端口 |
| `CORS_ORIGIN` | 否 | 空 | 允许的前端来源，逗号分隔；留空则允许所有 |
| `ENABLE_VISION` | 否 | `true` | 是否以 base64 把图片送入多模态模型 |
| `CHAT_RATE_LIMIT` | 否 | `30` | 每 IP 每分钟聊天请求上限 |
| `UPLOAD_RATE_LIMIT` | 否 | `30` | 每 IP 每分钟上传请求上限 |
| `MAX_CONTEXT_MESSAGES` | 否 | `40` | 携带的历史消息条数 |

> 三项必填配置**没有任何内置默认值**。缺失时服务启动会在日志里列出缺少哪些变量，
> `/api/chat` 也会直接返回错误而不发起任何 AI 请求——不会出现"静默用了某个默认服务却调用失败"的情况。

> `OPENAI_THINKING_OFF_PARAMS` 用于关闭那些"默认开启思考"的模型（如智谱 GLM-4.5）。
> 不同服务商格式不同：智谱 `{"thinking":{"type":"disabled"}}`、通义 `{"enable_thinking":false}`。
> 该参数必须是 JSON **对象**，传 boolean 会被智谱等接口直接 400 拒绝。

### 文件上传限制
- 单文件最大 10MB，单次最多 10 个
- 白名单：png / jpg / jpeg / gif / webp / bmp / pdf / txt / md / csv / json / doc / docx / xls / xlsx
- 超过 5MB 的图片不做 base64 内联，避免请求体过大

## 📁 项目结构

```
Near/
├── src/                          # Vue 前端源码
│   ├── components/ChatPanel/    # 聊天面板组件（纯 UI）
│   │   ├── index.vue            # 布局容器
│   │   ├── Sidebar.vue          # 会话列表
│   │   ├── MessageList.vue      # 消息列表与流式渲染
│   │   ├── ChatInput.vue        # 输入框与附件
│   │   ├── Drawer.vue           # 设置与关于
│   │   ├── WelcomeScreen.vue    # 欢迎页
│   │   └── ThemeToggle.vue      # 主题切换
│   ├── api/                     # 接口封装
│   ├── utils/                   # helpers / markdown 渲染
│   ├── styles/                  # 全局样式
│   ├── App.vue                  # 业务逻辑层
│   └── main.js
├── server/                       # Express 后端
│   ├── index.js                 # 入口（CORS / 限流 / 静态服务 / 优雅退出）
│   ├── config.js                # 环境变量集中管理
│   ├── prisma.js                # Prisma 客户端
│   ├── middleware/rateLimit.js  # 内存限流
│   └── routes/                  # chat / conversations / conversationDetail / upload / config
├── prisma/
│   ├── schema.prisma            # 唯一数据模型定义
│   ├── migrations/
│   └── dev.db                   # SQLite 数据库（gitignore）
├── public/
│   ├── index.html
│   └── uploads/                 # 上传文件（gitignore）
├── .env.example
└── vue.config.js
```

## 📦 依赖组织

前后端**共用一份 `package.json` 和一个 `node_modules`**，这是刻意的，不是遗留问题。

原因是这个项目的部署形态本来就是一体的：后端 `express.static(dist)` 直接托管前端构建产物，一条 `pnpm run dev` 同时拉起两边。拆成 monorepo 会凭空引入 workspace 协议、跨包构建顺序、两套安装步骤，而换来的收益接近于零。

依赖归属如下：

| 归属 | 包 |
|------|-----|
| 后端运行期 | `express` `multer` `dotenv` `@prisma/client` `uuid` |
| 前端（构建期，产物进 `dist/`） | `vue` `marked` `highlight.js` |
| 前端工具链 | `@vue/cli-service` `vue-template-compiler` `tailwindcss` `postcss` `autoprefixer` |
| 后端 CLI | `prisma` |
| 开发工具 | `concurrently` |

### 已知代价

- 生产部署时 `vue` / `marked` / `highlight.js` 会跟着装上，但它们已经打包进 `dist/`，服务端运行时并不需要（约 1–2MB，影响很小）。
- 前端工具链（webpack 系，数百个传递依赖）和后端运行时共享 `node_modules`，任何一个出 CVE 都会算进生产依赖里。`pnpm audit` 时留意一下产物归属即可。
- `pnpm install` 无法只装一半，CI 里无法跳过前端工具链。

### 什么时候该拆

出现下面任一情况时，再考虑拆成 pnpm workspace（`apps/web` + `apps/server`）：

- 后端需要单独容器化部署，或前端要上 CDN / 静态托管
- 前后端有了独立的发布节奏或团队
- 出现真实的依赖版本冲突（例如某个后端包和 webpack 工具链需要同一包的不同大版本）
- 后端依赖明显膨胀（加 Redis、队列、认证等），前端工具链又很重

真要拆的话，`uuid` 需要两边各装一份（前端用 `src/utils/helpers.js` 里的 `generateId()`，不依赖 uuid 包），`prisma` 目录和 `uploads/` 的归属也要重新规划。

## 🗄️ 数据库模型

- **Conversation** - `id` / `title` / `createdAt` / `updatedAt`
- **Message** - `id` / `role` / `content` / `reasoning_content` / `timestamp` / `conversation_id`
- **Attachment** - `id` / `name` / `url` / `size` / `type` / `message_id`

删除会话会级联删除其消息与附件。

## 🔌 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config` | 返回模型、接口地址、是否已配置 Key（不含密钥） |
| POST | `/api/chat` | 发送消息，SSE 流式响应 |
| GET | `/api/conversations` | 会话列表 |
| POST | `/api/conversations` | 新建会话 |
| GET | `/api/conversations/:id` | 会话详情（含消息与附件） |
| PATCH | `/api/conversations/:id` | 重命名 |
| DELETE | `/api/conversations/:id` | 删除 |
| POST | `/api/upload` | 上传文件 |

SSE 事件体：`{ id, content, reasoning_content, done, error? }`。

## 🔧 开发命令

```bash
pnpm install          # 安装依赖
pnpm run dev          # 前后端同时启动
pnpm run serve        # 仅前端（3000）
pnpm run server       # 仅后端（3001）
pnpm run build        # 构建前端到 dist/
pnpm run db:push      # 同步数据库结构
pnpm run db:generate  # 重新生成 Prisma Client
pnpm run db:migrate   # 创建迁移文件
pnpm run db:studio    # 打开 Prisma Studio
```

## 🚀 部署

```bash
pnpm install
pnpm run db:push      # 或 pnpm run db:migrate
pnpm run build        # 产出 dist/
NODE_ENV=production PORT=3001 node server/index.js
```

`dist/` 存在时，后端会同时提供前端静态文件与 SPA 回退，访问 http://localhost:3001 即可使用完整应用。

生产环境建议：
- 设置 `CORS_ORIGIN` 为实际前端域名，不要留空
- 用 Nginx / Caddy 做 HTTPS 与反向代理
- 定期备份 `prisma/dev.db` 与 `uploads/`

## 🛡️ 安全说明

- API Key 只保存在服务端 `.env`，`/api/config` 仅返回是否已配置
- 聊天与上传接口按 IP 限流，可拒绝未配置的来源
- 上传文件校验 MIME 与扩展名白名单，存储时重命名为 UUID
- 消息中的内联 HTML 全部转义，避免 XSS

## ❓ 常见问题

**Prisma 报 "did not initialize"** — 没生成 Client，执行 `pnpm run db:generate`。若用 pnpm 10+，确认 `pnpm-workspace.yaml` 中 prisma 相关的 `allowBuilds` 为 `true`。

**数据库文件在哪** — `DATABASE_URL` 的相对路径基于 `prisma/` 目录，默认 `prisma/dev.db`。

**深度思考按钮是灰的** — 未配置 `OPENAI_THINKING_MODEL`。

**模型看不到图片** — 确认模型支持视觉能力，或把 `ENABLE_VISION` 设为 `false` 退化为文件名提示。

## 📜 更新日志

版本迭代记录见 [CHANGELOG.md](CHANGELOG.md)，与「关于 → 版本记录」保持一致。

## 📄 开源协议

[MIT License](LICENSE)
