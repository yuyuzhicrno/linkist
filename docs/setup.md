# 部署配置指南

---

## 目录

- [1. 环境要求](#1-环境要求)
- [2. 开发环境配置](#2-开发环境配置)
- [3. 生产环境部署](#3-生产环境部署)
- [4. 数据库配置](#4-数据库配置)
- [5. 环境变量](#5-环境变量)
- [6. Docker 部署](#6-docker-部署)
- [7. Nginx 配置](#7-nginx-配置)
- [8. 常见问题](#8-常见问题)

---

## 1. 环境要求

### 基础要求

| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18.0.0 | 运行时环境 |
| npm | >= 9.0.0 | 包管理器 |
| PostgreSQL | >= 14（可选） | 关系型数据库 |

### 推荐配置

| 环境 | CPU | 内存 | 存储 |
|------|-----|------|------|
| 开发 | 2核 | 4GB | 10GB |
| 测试 | 4核 | 8GB | 20GB |
| 生产 | 8核 | 16GB | 50GB+ |

---

## 2. 开发环境配置

### 步骤 1：克隆项目

```bash
git clone <repository-url>
cd linkist
```

### 步骤 2：安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 步骤 3：配置环境变量

```bash
# 复制示例配置
cd server
cp .env.example .env

# 编辑配置文件
nano .env
```

### 步骤 4：启动开发服务器

```bash
# 启动后端（终端1）
cd server
npm run dev

# 启动前端（终端2）
cd client
npm run dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:3001 |
| API 文档 | http://localhost:3001/api |

---

## 3. 生产环境部署

### 步骤 1：编译项目

```bash
# 编译后端 TypeScript
cd server
npm run build

# 构建前端
cd ../client
npm run build
```

### 步骤 2：配置生产环境变量

```bash
cd server
nano .env
```

生产环境推荐配置：

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your_strong_secret_key_here
CORS_ORIGIN=https://yourdomain.com
BASE_URL=https://api.yourdomain.com

# PostgreSQL 配置（生产环境推荐）
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linkist_prod
DB_USER=linkist_user
DB_PASSWORD=your_db_password
```

### 步骤 3：启动生产服务器

```bash
# 使用 pm2 管理进程（推荐）
npm install -g pm2

# 启动后端服务
cd server
pm2 start dist/index.js --name linkist-server

# 查看状态
pm2 status

# 查看日志
pm2 logs linkist-server
```

### 步骤 4：配置前端静态文件

将前端构建产物部署到 Nginx 或 CDN：

```bash
# 将前端构建产物复制到 Nginx 目录
cp -r client/dist/* /var/www/linkist/
```

---

## 4. 数据库配置

### 4.1 使用文件存储（开发环境）

默认使用 LowDB 文件存储，无需额外配置。

数据文件位置：`server/data/db.json`

### 4.2 使用 PostgreSQL（生产环境）

#### 创建数据库

```sql
-- 创建数据库用户
CREATE USER linkist_user WITH PASSWORD 'your_password';

-- 创建数据库
CREATE DATABASE linkist_prod WITH OWNER linkist_user;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE linkist_prod TO linkist_user;
```

#### 配置环境变量

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linkist_prod
DB_USER=linkist_user
DB_PASSWORD=your_password
```

#### 数据库初始化

首次启动时，系统会自动创建表结构。

#### 数据表结构

主要数据表：

| 表名 | 说明 |
|------|------|
| users | 用户信息 |
| posts | 帖子 |
| comments | 评论 |
| polls | 投票 |
| channels | 频道 |
| messages | 消息 |
| columns | 专栏 |
| articles | 文章 |
| friend_requests | 好友请求 |
| direct_messages | 私信 |
| notifications | 通知 |
| tags | 标签 |

---

## 5. 环境变量

### 后端环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | development | 运行环境 |
| `PORT` | 3001 | 服务端口 |
| `JWT_SECRET` | linkist_dev_secret_2026 | JWT 签名密钥 |
| `CORS_ORIGIN` | http://localhost:5173 | 允许的跨域来源 |
| `BASE_URL` | http://localhost:3001 | 基础 URL |
| `DB_TYPE` | file | 数据库类型：file 或 postgres |
| `DB_HOST` | localhost | 数据库主机 |
| `DB_PORT` | 5432 | 数据库端口 |
| `DB_NAME` | linkist | 数据库名称 |
| `DB_USER` | postgres | 数据库用户 |
| `DB_PASSWORD` | | 数据库密码 |
| `UPLOAD_DIR` | ./uploads | 文件上传目录 |
| `LOG_LEVEL` | info | 日志级别 |

### 前端环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_API_URL` | http://localhost:3001/api | 后端 API 地址 |
| `VITE_SOCKET_URL` | http://localhost:3001 | Socket.IO 地址 |

---

## 6. Docker 部署

### 使用 docker-compose（推荐）

项目根目录已包含 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    container_name: linkist-postgres
    environment:
      POSTGRES_DB: linkist
      POSTGRES_USER: linkist
      POSTGRES_PASSWORD: linkist_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U linkist"]
      interval: 10s
      timeout: 5s
      retries: 5

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: linkist-server
    environment:
      NODE_ENV: production
      DB_TYPE: postgres
      DB_HOST: postgres
      DB_NAME: linkist
      DB_USER: linkist
      DB_PASSWORD: linkist_password
      JWT_SECRET: your_strong_secret_key
      CORS_ORIGIN: https://yourdomain.com
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: linkist-client
    ports:
      - "5173:5173"
    depends_on:
      - server

volumes:
  postgres_data:
```

### 启动 Docker 服务

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## 7. Nginx 配置

### 示例配置

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    # SSL 配置
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 前端静态文件
    location / {
        root /var/www/linkist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 代理
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 8. 常见问题

### Q1: 启动时报错 "Cannot find module"

**原因**：依赖未安装或编译未完成

**解决方案**：

```bash
cd server
npm install
npm run build
```

### Q2: 数据库连接失败

**原因**：数据库配置不正确

**解决方案**：

1. 检查 PostgreSQL 服务是否启动
2. 验证数据库配置信息
3. 确保数据库用户有权限访问

```bash
# 检查 PostgreSQL 状态
systemctl status postgresql

# 连接测试
psql -h localhost -U linkist_user -d linkist_prod
```

### Q3: 前端无法连接后端

**原因**：CORS 配置不正确

**解决方案**：

检查 `.env` 文件中的 `CORS_ORIGIN` 配置：

```env
CORS_ORIGIN=https://yourdomain.com
```

### Q4: 文件上传失败

**原因**：上传目录权限不足

**解决方案**：

```bash
# 设置正确的权限
chown -R www-data:www-data server/uploads
chmod -R 755 server/uploads
```

### Q5: JWT 令牌过期

**原因**：JWT 默认有效期为 7 天

**解决方案**：

用户需要重新登录，系统会自动刷新令牌。

### Q6: 性能问题

**优化建议**：

1. 使用 PostgreSQL 替代文件存储
2. 启用 Redis 缓存
3. 配置 Nginx 反向代理和缓存
4. 使用 CDN 加速静态资源
5. 定期清理日志文件

---

## 日志管理

### 日志位置

```bash
# 应用日志
server/logs/app.log

# PM2 日志
~/.pm2/logs/linkist-server-out.log
~/.pm2/logs/linkist-server-error.log
```

### 日志轮转

配置 logrotate：

```bash
sudo nano /etc/logrotate.d/linkist
```

```
/var/log/linkist/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reload linkist-server
    endscript
}
```