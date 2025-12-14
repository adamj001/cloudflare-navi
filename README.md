<div align="center">
<img src="./public/vite.svg" width="100" height="100" alt="logo">

# WebNav Hub - 您的现代化个人导航站

![NaviHive 导航站](https://img.shields.io/badge/NaviHive-导航站-blue)
![React](https://img.shields.io/badge/React-19.0.0-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6)
![Material UI](https://img.shields.io/badge/Material_UI-7.0-0081cb)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-f38020)
![License](https://img.shields.io/badge/License-MIT-green)


**WebNav Hub** 是一个基于 React + TypeScript + Vite 构建的轻量级、高性能个人导航仪表盘。它支持 PWA 安装，拥有丝滑的拖拽排序体验、漂亮的磨砂玻璃 UI 以及自动化的天气组件。

## ✨ 核心特性

- **🎨 现代化 UI 设计**：基于 Material UI (MUI) 定制，支持 **磨砂玻璃 (Glassmorphism)** 视觉效果。
- **🌗 深色/浅色模式**：内置主题切换，支持跟随系统自动切换，Logo 与图标颜色自动适配。
- **🌤️ 智能天气组件**：
  - 自动定位（无需手动设置）。
  - **无需 API Key**（基于 Open-Meteo 和 BigDataCloud）。
  - 显示实时气温、天气状况动画图标及当前城市名称。
- **🤚 拖拽排序**：
  - 支持 **分组拖拽**（Tab 栏排序）。
  - 支持 **站点卡片拖拽**（dnd-kit 驱动）。
- **📱 PWA 支持**：支持安装到手机或电脑桌面，离线访问，体验接近原生 App。
- **🛠️ 高度可配置**：
  - 桌面端每行卡片数量可调节（3-10列）。
  - 自定义背景图片与遮罩透明度。
  - 管理员模式（增删改查站点/分组）。
- **🚀 极速图标**：使用 `lucide-react` 替换了臃肿的图标库，加载更快。

## 🛠️ 技术栈

- **核心框架**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **UI 组件库**: [Material UI (@mui/material)](https://mui.com/)
- **图标库**: [Lucide React](https://lucide.dev/)
- **拖拽库**: [@dnd-kit](https://dndkit.com/)
- **PWA**: [vite-plugin-pwa](https://vite-plugin-pwa.netlify.app/)
- **包管理器**: [pnpm](https://pnpm.io/)

## 🚀 本地开发指南

### 1. 克隆项目

```bash
git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
cd your-repo-name

2. 安装依赖
本项目使用 pnpm 进行包管理：
# 如果没有安装 pnpm，请先运行：
npm install -g pnpm
pnpm install

3. 启动开发服务器
pnpm dev
启动后访问 http://localhost:5173 即可预览。
📦 构建与部署
构建生产版本
pnpm run build
构建产物将输出到 dist 目录。
部署到 Cloudflare Pages (推荐)
本项目已针对 Cloudflare Pages 进行了优化。
1. 连接 GitHub: 在 Cloudflare Dashboard 中创建一个新 Pages 项目，连接你的 GitHub 仓库。
2. 构建配置:
• 框架预设: Vite
• 构建命令 (Build command): pnpm run build
• 构建输出目录 (Build output directory): dist
3. 环境变量 (可选):
• 如果使用真实后端 API，请在 Settings 中配置 VITE_USE_REAL_API=true。
注意: 不需要并在部署命令中填写 npm install，Cloudflare 会自动根据 pnpm-lock.yaml 安装依赖。

设置D1数据库：
- 创建分组表

CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    order_num INTEGER NOT NULL,
    is_public INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建站点表

CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    notes TEXT,
    order_num INTEGER NOT NULL,
    is_public INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- 创建配置表

CREATE TABLE IF NOT EXISTS configs (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 标记数据库已初始化

INSERT INTO configs (key, value) VALUES ('DB_INITIALIZED', 'true');

-- 创建只读模式所需索引
CREATE INDEX IF NOT EXISTS idx_groups_is_public ON groups(is_public);
CREATE INDEX IF NOT EXISTS idx_sites_is_public ON sites(is_public);




📂 项目结构
src/
├── API/              # API 接口定义 (支持 Mock 和 真实 HTTP)
├── components/       # UI 组件
│   ├── LoginForm.tsx    # 登录弹窗
│   ├── SearchBox.tsx    # 搜索框
│   ├── ThemeToggle.tsx  # (旧)主题切换
│   └── WeatherWidget.tsx # ✨ 天气组件
├── utils/            # 工具函数 (URL处理等)
├── App.tsx           # 主应用逻辑 (包含拖拽、布局、弹窗逻辑)
└── main.tsx          # 入口文件
public/               # 静态资源 (Logo, PWA icons)

📝 待办事项 / 计划中
• [ ] 添加搜索引擎切换功能
• [ ] 增加更多自定义主题色
• [ ] 后端 API 对接 (目前支持 Mock 数据)
📄 开源协议
MIT License


0.0 Create D1 Database Named navigation, then goto control panel to run the following initializing code:

-
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adamj001/cloudflare-navi)

**一个优雅、现代化的网站导航管理系统**
基于 Cloudflare Workers 构建 • 零成本部署 • 全球 CDN 加速 • 企业级安全

[📖 完整文档](https://zqq-nuli.github.io/Cloudflare-Navihive/) • [🎮 在线演示](https://navihive.chatbot.cab/) • [🚀 快速开始](https://zqq-nuli.github.io/Cloudflare-Navihive/deployment/) • [💬 问题反馈](https://github.com/zqq-nuli/Cloudflare-Navihive/issues)

</div>

> 部署过程中遇到问题，暂时可参阅 V1.1.0版本[部署教程](https://github.com/zqq-nuli/Cloudflare-Navihive/tree/v1.1.0)暂时我可能没有那么多时间来修正文档的问题，实在抱歉。databse

## 🎯 快速开始,


### 在线演示

访问演示站点体验所有功能：[navihive.chatbot.cab](https://navihive.chatbot.cab/)

```
👤 演示账号：admin
🔑 演示密码：NaviHive2025!
```

### 立即部署

**5 分钟完成部署，零成本永久使用：**

1. **Fork 项目** → 点击右上角 Fork 按钮
2. **新建 wrangler.jsonc 文件** 从 wrangler.template.jsonc 复制然后修改
3. **一键部署** → [![Deploy](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/你的用户名/Cloudflare-Navihive)
4. **配置数据库** → 按照[部署指南](https://zqq-nuli.github.io/Cloudflare-Navihive/deployment/)创建 D1 数据库

> 详细步骤见[完整部署指南](https://zqq-nuli.github.io/Cloudflare-Navihive/deployment/)

---

## 📖 完整文档

### 📚 用户指南
- [**项目介绍**](https://zqq-nuli.github.io/Cloudflare-Navihive/introduction) - 了解 NaviHive 的特点和优势
- [**为什么选择 NaviHive**](https://zqq-nuli.github.io/Cloudflare-Navihive/guide/why-navihive) - 与其他方案的对比
- [**功能截图**](https://zqq-nuli.github.io/Cloudflare-Navihive/guide/screenshots) - 11 张精美功能截图展示
- [**常见问题**](https://zqq-nuli.github.io/Cloudflare-Navihive/guide/faq) - FAQ 和故障排除
- [**更新日志**](https://zqq-nuli.github.io/Cloudflare-Navihive/guide/changelog) - 版本历史和变更记录

### 🔧 开发者文档
- [**部署指南**](https://zqq-nuli.github.io/Cloudflare-Navihive/deployment/) - 详细的部署步骤
- [**架构设计**](https://zqq-nuli.github.io/Cloudflare-Navihive/architecture/) - 技术栈和系统架构
- [**API 文档**](https://zqq-nuli.github.io/Cloudflare-Navihive/api/) - RESTful API 参考
- [**安全指南**](https://zqq-nuli.github.io/Cloudflare-Navihive/security/) - 14+ 安全加固说明
- [**贡献指南**](https://zqq-nuli.github.io/Cloudflare-Navihive/contributing/) - 如何参与项目

### 🎯 功能特性
- [**功能概览**](https://zqq-nuli.github.io/Cloudflare-Navihive/features/) - 完整功能列表和说明

> 📝 访问 [NaviHive 文档站点](https://zqq-nuli.github.io/Cloudflare-Navihive/) 查看完整文档

---

## 🛠️ 技术栈

**前端**: React 19 • TypeScript 5.7 • Material UI 7.0 • Tailwind CSS 4.1 • DND Kit • Vite 6

**后端**: Cloudflare Workers • Cloudflare D1 (SQLite) • JWT + bcrypt • TypeScript Strict Mode

**开发**: pnpm • Wrangler CLI • ESLint + Prettier

## 🤝 贡献

欢迎所有形式的贡献！查看 [贡献指南](https://zqq-nuli.github.io/Cloudflare-Navihive/contributing/) 了解如何参与项目。

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议发布。

---

## 🙏 致谢

感谢以下开源项目和服务：

- [React](https://reactjs.org/) • [TypeScript](https://www.typescriptlang.org/) • [Vite](https://vitejs.dev/)
- [Material UI](https://mui.com/) • [DND Kit](https://dndkit.com/) • [Tailwind CSS](https://tailwindcss.com/)
- [Cloudflare Workers](https://workers.cloudflare.com/) • [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Claude Code](https://claude.ai/code) • [Cursor](https://www.cursor.com)

感谢所有提交 Issue、PR 和 Star 的开发者们！🌟

---

## ⭐ 支持项目

如果 NaviHive 对你有帮助，欢迎通过以下方式支持：

### 💝 给项目点赞
- 点击右上角的 ⭐ **Star** 按钮，这是对开发者最大的鼓励
- **Fork** 项目，参与改进和定制
- 分享给你的朋友和同事

### 💰 赞赏支持
你的赞赏将用于项目的持续开发和维护：

<div align="center">
  <img src="https://img.zhengmi.org/file/1743956440128_4b965550184c06d8164f8077fa42b5d.jpg" alt="微信赞赏码" width="300">
  <p><em>微信扫码赞赏</em></p>
</div>

### 🤝 其他支持方式
- 💬 提交有价值的 Issue 和 Feature Request
- 📝 改进文档和教程
- 🐛 报告 Bug 并提供复现步骤
- 💻 贡献代码（欢迎提交 PR）

---

## 📈 Star History

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=zqq-nuli/Cloudflare-Navihive&type=Date&theme=dark" />
  <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=zqq-nuli/Cloudflare-Navihive&type=Date" />
  <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=zqq-nuli/Cloudflare-Navihive&type=Date" />
</picture>

---

<div align="center">

## 🎉 让导航管理更简单

**NaviHive** - 你的专属网络导航中心

[立即部署](https://deploy.workers.cloudflare.com/?url=https://github.com/zqq-nuli/Cloudflare-Navihive) • [在线演示](https://navihive.chatbot.cab/) • [完整文档](https://zqq-nuli.github.io/Cloudflare-Navihive/) • [提交问题](https://github.com/zqq-nuli/Cloudflare-Navihive/issues)

Made with ❤️ by [zqq-nuli](https://github.com/zqq-nuli)

⭐ 如果觉得有用，别忘了点个 Star 哦 ⭐

</div>
