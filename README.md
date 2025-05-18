[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Aierlanta/luoxu-web-ai)

# Luoxu Web AI

这是 [luoxu](https://github.com/lilydjwg/luoxu) 的Web前端，增强了AI总结功能。

## 功能特点

- 简单的登录页面，防止被扫描到后被未授权使用
- AI总结功能，支持接入OpenAI和Google Gemini等多种AI模型
- 时间筛选功能，可查询特定群组在特定时间段内的消息
- 消息数量统计和限制功能
- 搜索结果的AI总结功能
- AI配置信息可存储在服务器或本地，确保配置的持久性

## 开发环境设置

### 前提条件

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装配置服务器依赖
cd server
npm install
cd ..
```

### 开发模式运行

```bash
# 启动前端和配置服务器
npm run dev
```

或者使用提供的启动脚本：

```bash
# Windows
start.bat

# Linux/macOS
./start.sh
```

## VPS部署教程

本教程适用于已经运行luoxu后端的VPS，将指导你如何部署前端和配置服务器。

### 1. 准备工作

确保你的VPS上已经安装了以下软件：

- Node.js 16+（推荐使用nvm安装）
- npm 或 yarn
- Nginx（用于反向代理）
- PM2（用于进程管理）

```bash
# 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc

# 安装Node.js
nvm install 16
nvm use 16

# 安装PM2
npm install -g pm2

# 安装Nginx
apt update
apt install -y nginx
```

### 2. 克隆代码库

```bash
# 创建应用目录
mkdir -p /opt/luoxu-web-ai
cd /opt/luoxu-web-ai

# 克隆代码库
git clone https://github.com/Aierlanta/luoxu-web-ai.git .
```

### 3. 安装依赖并构建前端

```bash
# 安装前端依赖
npm install

# 构建前端
npm run build

# 安装配置服务器依赖
cd server
npm install
cd ..
```

### 4. 配置环境变量

创建一个`.env`文件来存储环境变量：

```bash
# 在项目根目录创建.env文件
cat > .env << EOF
# 后端API地址
LUOXU_URL=http://127.0.0.1:9008
# 配置服务器端口
CONFIG_SERVER_PORT=3000
EOF
```

### 5. 使用PM2启动服务

创建PM2配置文件：

```bash
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'luoxu-config-server',
      script: 'server/api.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
EOF
```

启动服务：

```bash
# 启动配置服务器
pm2 start ecosystem.config.js

# 设置PM2开机自启
pm2 save
pm2 startup
```

### 6. 配置Nginx

创建Nginx配置文件：

```bash
cat > /etc/nginx/sites-available/luoxu-web << EOF
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或IP地址

    # 重定向HTTP到HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;  # 替换为你的域名或IP地址

    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # 前端静态文件
    location / {
        root /opt/luoxu-web-ai/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # 配置服务器API
    location /api/config {
        proxy_pass http://localhost:3000/api/config;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # 后端API代理
    location /luoxu/ {
        proxy_pass http://35.211.165.157:9008/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
```

启用配置并重启Nginx：

```bash
# 创建符号链接
ln -s /etc/nginx/sites-available/luoxu-web /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
```

### 7. 配置SSL证书（可选但推荐）

使用Let's Encrypt获取免费SSL证书：

```bash
# 安装certbot
apt install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com
```

### 8. 更新部署

当需要更新应用时，执行以下命令：

```bash
cd /opt/luoxu-web-ai

# 拉取最新代码
git pull

# 安装依赖并构建
npm install
npm run build

# 重启配置服务器
pm2 restart luoxu-config-server
```

### 9. 故障排查

- **检查日志**：

  ```bash
  # 查看PM2日志
  pm2 logs luoxu-config-server

  # 查看Nginx错误日志
  tail -f /var/log/nginx/error.log
  ```

- **检查服务状态**：

  ```bash
  # 检查PM2服务状态
  pm2 status

  # 检查Nginx状态
  systemctl status nginx
  ```

- **常见问题**：
  - 如果前端无法连接到后端，检查Nginx配置中的代理设置
  - 如果配置服务器无法启动，检查端口是否被占用
  - 如果页面显示空白，检查浏览器控制台是否有错误信息

## 使用说明

1. 访问你的域名或IP地址
2. 使用默认凭据登录（用户名：admin，密码：luoxu123）
3. 配置AI接口（点击"显示AI配置"按钮）
4. 使用搜索和筛选功能查找消息
5. 使用AI总结功能总结消息

## 许可证

MIT
