# Near - AI 智能助手

基于 Vue 2 + Express 构建的 AI 对话应用，支持流式响应、文件上传、深度思考模式，以及暗黑/明亮主题切换。

![Near AI Assistant](https://img.shields.io/badge/Near-AI%20Assistant-6c63ff)
![Vue.js](https://img.shields.io/badge/Vue-2.7-4fc08d?logo=vue.js)
![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06b6d4?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2d3748?logo=prisma)

## ✨ 功能特性

### 核心功能
- **🤖 AI 对话** - 基于 LongCat API 的流式对话，支持实时响应
- **🧠 深度思考模式** - 切换至思考模型，获得更深入的分析
- **📎 文件上传** - 支持图片、PDF、文档等多种格式附件
- **📋 对话历史** - 自动保存对话记录，支持搜索和管理
- **🔄 上下文记忆** - 自动携带最近 40 轮对话上下文

### 交互体验
- **🌓 主题切换** - 支持暗黑/明亮模式，可跟随系统或手动设置
- **📱 响应式设计** - 侧边栏可折叠，适配不同屏幕尺寸
- **⌨️ 快捷操作** - 支持 Enter 发送、Shift+Enter 换行
- **🖼️ 文件粘贴** - 直接粘贴文件进行发送
- **✏️ 对话管理** - 右键菜单支持重命名、删除对话

### 消息展示
- **🎨 Markdown 渲染** - 支持代码高亮、表格、列表等格式
- **💭 思考过程展示** - 可折叠的深度思考内容
- **🔍 图片预览** - 点击消息中的图片查看大图
- **📎 附件展示** - 图片缩略图、文件信息卡片

## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm 或 npm

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd Near
```

2. **安装依赖**
```bash
pnpm install
```

3. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API 密钥：
```env
# 数据库配置
DATABASE_URL="file:./prisma/dev.db"

# LongCat AI 配置（必填）
LONGCAT_API_BASE=https://api.longcat.chat/openai
LONGCAT_API_KEY=your_api_key_here
LONGCAT_MODEL=LongCat-Flash-Chat
LONGCAT_THINKING_MODEL=LongCat-Flash-Thinking-2601
```

4. **初始化数据库**
```bash
pnpm run db:push
```

5. **启动开发服务器**
```bash
pnpm run dev
```

访问 http://localhost:3002 即可使用。

## 📁 项目结构

```
Near/
├── src/                    # Vue 前端源码
│   ├── components/        # Vue 组件
│   │   └── ChatPanel/    # 聊天面板组件
│   │       ├── index.vue         # 主组件（纯 UI）
│   │       ├── ChatInput.vue     # 输入框组件
│   │       ├── MessageList.vue   # 消息列表组件
│   │       ├── Sidebar.vue       # 侧边栏组件
│   │       ├── WelcomeScreen.vue # 欢迎页组件
│   │       └── ThemeToggle.vue   # 主题切换组件
│   ├── api/              # API 调用封装
│   ├── utils/            # 工具函数
│   │   ├── helpers.js    # 辅助函数
│   │   └── markdown.js   # Markdown 渲染
│   ├── styles/           # 全局样式
│   ├── App.vue           # 根组件（业务逻辑）
│   └── main.js           # 入口文件
├── server/               # Express 后端
│   ├── index.js          # 服务器入口
│   ├── prisma.js         # Prisma 客户端配置
│   ├── schema.prisma     # 数据库模型定义
│   └── routes/           # API 路由
│       ├── chat.js             # 流式聊天 API
│       ├── conversations.js     # 对话管理 API
│       ├── conversationDetail.js# 对话详情 API
│       └── upload.js            # 文件上传 API
├── prisma/
│   ├── schema.prisma     # Prisma 主 schema
│   └── migrations/       # 数据库迁移文件
├── public/
│   └── index.html        # HTML 入口
├── vue.config.js         # Vue CLI 配置
├── tailwind.config.js    # Tailwind 配置
└── package.json          # 项目依赖
```

## 🛠️ 技术栈

### 前端
- **Vue 2.7** - 渐进式 JavaScript 框架
- **Vue CLI 5** - 项目脚手架工具
- **Tailwind CSS 3.4** - 原子化 CSS 框架
- **marked 4.3** - Markdown 解析
- **highlight.js 11.9** - 代码语法高亮

### 后端
- **Express 4.18** - Web 应用框架
- **Prisma 5.22** - ORM 数据库工具
- **SQLite** - 轻量级数据库
- **Multer** - 文件上传处理
- **CORS** - 跨域资源共享

### AI 服务
- **LongCat API** - 大语言模型服务

## 🏗️ 架构设计

### 组件分离原则
- **ChatPanel 组件**: 纯 UI 展示层，只接收 props 和触发事件
- **App.vue**: 业务逻辑层，负责数据管理和 API 调用
- **API 层**: 封装所有后端接口调用
- **Server 层**: Express RESTful API + SSE 流式响应

### 数据流向
```
用户操作 → App.vue (业务逻辑) → ChatPanel (UI更新) → API调用 → Express Server → Database/AI API
```

## 📝 使用说明

### 开始对话
1. 点击"新的对话"或直接在输入框输入消息
2. 支持粘贴或点击上传文件
3. 按 Enter 发送，Shift+Enter 换行

### 深度思考模式
- 点击输入框下方的"深度思考"按钮
- 启用后会使用思考模型进行推理
- 思考过程会显示在回答上方，可折叠

### 主题切换
- 点击侧边栏顶部的太阳/月亮图标
- 支持跟随系统自动切换

### 对话管理
- 右键点击对话项打开菜单
- 支持重命名、删除对话
- 点击对话项切换历史记录

## 🔧 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器（前端 + 后端）
pnpm run dev

# 仅启动前端
pnpm run serve

# 仅启动后端
pnpm run server

# 构建生产版本
pnpm run build

# 初始化数据库
pnpm run db:push

# 重新生成 Prisma Client
pnpm run db:generate
```

## 🗄️ 数据库模型

### Conversation（对话）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 唯一标识 (UUID) |
| title | String | 对话标题 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |
| messages | Message[] | 关联消息 |

### Message（消息）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 唯一标识 (UUID) |
| role | String | 角色（user/assistant）|
| content | String | 消息内容 |
| reasoningContent | String? | 思考内容 |
| timestamp | DateTime | 时间戳 |
| conversationId | String | 所属对话 |
| attachments | Attachment[] | 关联附件 |

### Attachment（附件）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 唯一标识 (UUID) |
| name | String | 文件名 |
| url | String | 文件路径 |
| size | Int | 文件大小 |
| type | String | MIME 类型 |
| messageId | String | 所属消息 |

## ⚙️ 配置说明

### 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| DATABASE_URL | 否 | file:./prisma/dev.db | 数据库连接地址 |
| LONGCAT_API_BASE | 否 | https://api.longcat.chat/openai | AI API 基础地址 |
| LONGCAT_API_KEY | **是** | - | API 密钥 |
| LONGCAT_MODEL | 否 | LongCat-Flash-Chat | 默认模型 |
| LONGCAT_THINKING_MODEL | 否 | LongCat-Flash-Thinking-2601 | 思考模型 |

### 端口配置
- **前端开发服务器**: http://localhost:3002
- **后端 API 服务器**: http://localhost:3001
- **代理配置**: `/api` 和 `/uploads` 请求自动代理到后端

### 文件上传限制
- 最大文件大小：10MB
- 支持格式：图片、PDF、Word、TXT、CSV、Excel、JSON、Markdown

## 🔌 API 接口

### 对话管理
- `GET /api/conversations` - 获取对话列表
- `POST /api/conversations` - 创建新对话
- `GET /api/conversations/:id` - 获取对话详情
- `PATCH /api/conversations/:id` - 重命名对话
- `DELETE /api/conversations/:id` - 删除对话

### 聊天功能
- `POST /api/chat` - 发送消息（SSE 流式响应）

### 文件上传
- `POST /api/upload` - 上传文件

## 🚀 部署指南

### 生产环境构建
```bash
# 构建前端
pnpm run build

# 启动生产服务器
NODE_ENV=production node server/index.js
```

### 环境变量检查
确保在生产环境中设置以下必填变量：
- `LONGCAT_API_KEY`
- `DATABASE_URL`

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 开源协议

[MIT License](LICENSE)

---

Made with ❤️ by Near Team
