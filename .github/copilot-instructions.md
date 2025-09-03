# UtiOpia - Copilot 指导说明

欢迎来到 UtiOpia！这是一个全栈“小纸条”应用，前端使用 React，后端使用 PHP (Slim)。本指南将帮助 AI 代理快速理解项目架构、关键工作流程和编码约定。

## 架构概览

UtiOpia 采用经典的前后端分离架构：

- **前端 (`/frontend`)**: 一个使用 Vite 构建的 React 单页应用 (SPA)。负责所有用户界面和用户交互。
- **后端 (`/backend`)**: 一个基于 Slim 4 框架的 PHP REST API。处理业务逻辑、数据库交互和身份验证。

### 核心数据流

1.  **用户操作**: 用户在 React 组件中进行操作。
2.  **状态管理**: [Zustand](https://github.com/pmndrs/zustand) stores (`frontend/src/stores/`) 响应状态变更。
3.  **API 请求**: 使用 [Axios](https://axios-http.com/) 实例 (`frontend/src/lib/api.js`) 向后端发送 HTTP 请求。
4.  **路由处理**: 后端 `backend/public/index.php` 接收请求，Slim 路由 (`backend/src/Routes.php`) 将其分发到相应的控制器/服务。
5.  **服务层**: `backend/src/Services/` 中的服务类（例如 `MessageService.php`, `UserService.php`）执行核心业务逻辑。
6.  **数据库**: 服务与 MySQL 数据库交互以持久化数据。
7.  **响应**: API 返回 JSON 响应，前端更新 UI。

### 关键技术决策

- **前端**:
    - **React + Vite**: 为了获得现代化的开发体验和高性能。
    - **Tailwind CSS + shadcn/ui**: 用于快速构建一个美观、一致且响应式的 UI。组件位于 `frontend/src/components/`。
    - **Zustand**: 一个轻量级的状态管理库，易于使用且样板代码少。
- **后端**:
    - **Slim 4**: 一个轻量级的 PHP 微框架，专注于处理 HTTP 请求。
    - **PHP-DI**: 用于管理依赖注入，使代码更易于测试和维护。
    - **JWT (JSON Web Tokens)**: 用于无状态身份验证 (`backend/src/Services/AuthService.php`)。

## 开发者工作流程

在开始之前，请确保已在 `frontend` 和 `backend` 目录中根据 `env.example` 文件创建了 `.env` 文件。

### 后端 (`/backend`)

使用 Composer 管理依赖和脚本。

1.  **安装依赖**:
    ```bash
    composer install
    ```
2.  **数据库迁移**:
    此项目使用一个简单的自定义迁移脚本。要初始化或更新数据库 schema，请运行：
    ```bash
    composer migrate
    ```
    新的数据库变更应通过在 `backend/scripts/` 目录中创建新的 `upgrade_YYYY_MM_DD.sql` 文件来添加。
3.  **运行开发服务器**:
    ```bash
    composer start
    ```
    服务器将运行在 `http://localhost:8080`。
4.  **运行测试**:
    使用 PHPUnit 进行测试。
    ```bash
    composer test
    ```
    测试用例位于 `backend/tests/`。

### 前端 (`/frontend`)

使用 pnpm 管理依赖。

1.  **安装依赖**:
    ```bash
    pnpm install
    ```
2.  **运行开发服务器**:
    ```bash
    pnpm run dev
    ```
    应用将通过 Vite 启动，并可在 `http://localhost:5173` (或另一个可用端口) 访问。
3.  **构建生产版本**:
    ```bash
    pnpm run build
    ```
    静态文件将被输出到 `frontend/dist/` 目录。

## 项目约定

### 后端

- **服务导向架构**: 业务逻辑被封装在 `src/Services/` 下的各个服务类中。控制器（在 `Routes.php` 中定义的闭包）应保持轻量，并将业务逻辑委托给这些服务。
- **依赖注入**: 所有服务和依赖项都通过 `php-di` 在 `public/index.php` 中进行配置和注入。当需要访问服务时，应通过构造函数注入。
- **验证**: 使用 `respect/validation` 库进行输入验证。

### 前端

- **组件**: UI 由 `shadcn/ui` 组件构成。自定义的可重用组件位于 `frontend/src/components/`。页面级组件位于 `frontend/src/pages/`。
- **状态管理**: 全局状态（如用户信息、消息列表）由 `frontend/src/stores/` 中的 Zustand stores 管理。组件本地状态应使用 React 的 `useState`。
- **路由**: 使用 `react-router-dom` 进行客户端路由。受保护的路由使用 `frontend/src/components/ProtectedRoute.jsx` 组件进行封装。
- **API 交互**: 所有与后端 API 的交互都应通过 `frontend/src/lib/api.js` 中配置的 Axios 实例进行。这确保了所有请求都包含正确的 base URL 和认证头。
