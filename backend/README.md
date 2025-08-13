## UtiOpia Backend

运行步骤：

1. 复制 `.env`：
   - 在项目根的 `backend` 目录下创建 `.env`，内容可参考下述键：
     - `DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS`
     - `JWT_SECRET`
     - `CORS_ORIGIN`
     - `COS_REGION, COS_APP_ID, COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET`
     - `TURNSTILE_SECRET`

2. 安装依赖：
```bash
composer install
```

3. 初始化数据库：
```bash
composer migrate
```

4. 启动开发服务器：
```bash
composer start
```

API 路径：`/api/*`


