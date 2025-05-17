@echo off
echo 正在启动服务器...

REM 启动配置服务器
cd server
start cmd /k "npm install && npm start"

REM 等待2秒，确保服务器已启动
timeout /t 2 /nobreak > nul

REM 启动前端开发服务器
cd ..
start cmd /k "npm run dev"

echo 服务器已启动！
echo 配置服务器运行在 http://localhost:3000
echo 前端服务器运行在 http://localhost:5174
