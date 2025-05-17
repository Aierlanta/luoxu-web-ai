const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'config.json');

// 中间件
app.use(express.json());
app.use(cors());

// 获取AI配置
app.get('/api/config', (req, res) => {
  try {
    // 读取配置文件
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    
    res.json(config);
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: '读取配置失败' });
  }
});

// 保存AI配置
app.post('/api/config', (req, res) => {
  try {
    const { ai_provider, api_key, api_endpoint, ai_model } = req.body;
    
    // 验证必要的字段
    if (!ai_provider || !api_endpoint || !ai_model) {
      return res.status(400).json({ error: '缺少必要的配置字段' });
    }
    
    // 创建新的配置对象
    const newConfig = {
      ai_provider,
      api_key,
      api_endpoint,
      ai_model
    };
    
    // 将配置写入文件
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
    
    res.json({ success: true, message: '配置已保存' });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: '保存配置失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
