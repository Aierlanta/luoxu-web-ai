#!/bin/bash

echo "正在启动服务器..."

# 启动配置服务器
cd server
gnome-terminal -- bash -c "npm install && npm start; exec bash" || \
xterm -e "npm install && npm start" || \
konsole -e "npm install && npm start" || \
terminal -e "npm install && npm start" || \
echo "无法打开新终端，请手动运行: cd server && npm install && npm start"

# 等待2秒，确保服务器已启动
sleep 2

# 启动前端开发服务器
cd ..
gnome-terminal -- bash -c "npm run dev; exec bash" || \
xterm -e "npm run dev" || \
konsole -e "npm run dev" || \
terminal -e "npm run dev" || \
echo "无法打开新终端，请手动运行: npm run dev"

echo "服务器已启动！"
echo "配置服务器运行在 http://localhost:3000"
echo "前端服务器运行在 http://localhost:5174"
