# Near - AI 智能助手

基于 Next.js 14 构建的 AI 对话应用，支持流式响应、文件上传、深度思考模式，以及暗黑/明亮主题切换。

![Near AI Assistant](https://img.shields.io/badge/Near-AI%20Assistant-6c63ff)
![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06b6d4?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-5.12-2d3748?logo=prisma)

## ✨ 功能特性

### 核心功能
- **🤖 AI 对话** - 基于 LongCat API 的流式对话，支持实时响应
- **🧠 深度思考模式** - 切换至思考模型，获得更深入的分析
- **📎 文件上传** - 支持图片、PDF、文档等多种格式附件
- **📋 对话历史** - 自动保存对话记录，支持搜索和管理
- **🔄 上下文记忆** - 自动携带最近 20 轮对话上下文

### 交互体验
- **🌓 主题切换** - 支持暗黑/明亮模式，可跟随系统或手动设置
- **📱 响应式设计** - 侧边栏可折叠，适配不同屏幕尺寸
- **⌨️ 快捷操作** - 支持 Enter 发送、Shift+Enter 换行
- **🖼️ 图片粘贴** - 直接粘贴截图或图片进行发送
- **✏️ 对话管理** - 右键菜单支持重命名、删除对话

### 消息展示
- **🎨 Markdown 渲染** - 支持代码高亮、表格、列表等格式
- **💭 思考过程展示** - 可折叠的深度思考内容
- **🔍 图片预览** - 点击消息中的图片查看大图
- **📎 附件展示** - 图片缩略图、文件信息卡片

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd Near
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API 密钥：
```env
# 数据库配置
DATABASE_URL="file:./dev.db"

# LongCat AI 配置（必填）
LONGCAT_API_BASE=https://api.longcat.chat/openai
LONGCAT_API_KEY=your_api_key_here
LONGCAT_MODEL=LongCat-Flash-Chat
LONGCAT_THINKING_MODEL=LongCat-Flash-Thinking-2601
```

4. **初始化数据库**
```bash
npx prisma migrate dev
npx prisma generate
```

5. **启动开发服务器**
```bash
npm run dev
```

访问 http://localhost:3000 即可使用。

## 📁 项目结构

```
Near/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── chat/         # 流式聊天 API
│   │   ├── conversations/# 对话管理 API
│   │   └── upload/       # 文件上传 API
│   ├── components/       # React 组件
│   │   ├── Sidebar.tsx   # 侧边栏
│   │   ├── MessageList.tsx # 消息列表
│   │   ├── ChatInput.tsx   # 输入框
│   │   ├── WelcomeScreen.tsx # 欢迎页
│   │   └── ThemeToggle.tsx   # 主题切换
│   ├── globals.css       # 全局样式
│   ├── layout.tsx        # 根布局
│   ├── page.tsx          # 主页面
│   └── providers.tsx     # 主题提供者
├── lib/                   # 工具函数
│   ├── prisma.ts         # Prisma 客户端
│   ├── markdown.ts       # Markdown 渲染
│   └── utils.ts          # 通用工具
├── prisma/
│   └── schema.prisma     # 数据库模型
├── types/
│   └── index.ts          # TypeScript 类型
└── public/uploads/       # 上传文件存储
```

## 🛠️ 技术栈

### 前端
- **Next.js 14** - React 框架，支持 App Router
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 原子化 CSS 框架
- **next-themes** - 主题管理
- **marked** - Markdown 解析
- **highlight.js** - 代码语法高亮

### 后端
- **Next.js API Routes** - 服务端 API
- **Prisma** - ORM 数据库工具
- **SQLite** - 轻量级数据库
- **Multer** - 文件上传处理

### AI 服务
- **LongCat API** - 大语言模型服务

## 📝 使用说明

### 开始对话
1. 点击"新的对话"或直接在输入框输入消息
2. 支持拖拽或点击上传文件
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
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 数据库迁移
npm run db:migrate

# 数据库可视化
npm run db:studio
```

## 🗄️ 数据库模型

### Conversation（对话）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 唯一标识 |
| title | String | 对话标题 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |
| messages | Message[] | 关联消息 |

### Message（消息）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 唯一标识 |
| role | String | 角色（user/assistant）|
| content | String | 消息内容 |
| reasoningContent | String? | 思考内容 |
| timestamp | DateTime | 时间戳 |
| conversationId | String | 所属对话 |
| attachments | Attachment[] | 关联附件 |

### Attachment（附件）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 唯一标识 |
| name | String | 文件名 |
| url | String | 文件路径 |
| size | Int | 文件大小 |
| type | String | MIME 类型 |
| messageId | String | 所属消息 |

## ⚙️ 配置说明

### 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| DATABASE_URL | 否 | file:./dev.db | 数据库连接地址 |
| LONGCAT_API_BASE | 否 | https://api.longcat.chat/openai | AI API 基础地址 |
| LONGCAT_API_KEY | **是** | - | API 密钥 |
| LONGCAT_MODEL | 否 | LongCat-Flash-Chat | 默认模型 |
| LONGCAT_THINKING_MODEL | 否 | LongCat-Flash-Thinking-2601 | 思考模型 |

### 文件上传限制
- 最大文件大小：10MB
- 支持格式：图片、PDF、Word、TXT、CSV、Excel、JSON、Markdown

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 开源协议

[MIT License](LICENSE)

---

Made with ❤️ by Near Team
