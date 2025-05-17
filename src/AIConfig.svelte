<script lang="ts">
  import { onMount } from "svelte";

  // AI配置状态
  let aiProvider = $state("openai");
  let apiKey = $state("");
  let apiEndpoint = $state("https://api.openai.com/v1/chat/completions");
  let aiModel = $state("gpt-3.5-turbo");
  let isLoading = $state(true);
  let loadError = $state("");

  // 获取默认端点
  function getDefaultEndpoint(provider: string, model: string = ""): string {
    if (provider === "openai") {
      return "https://api.openai.com/v1/chat/completions";
    } else if (provider === "gemini") {
      // 从模型名称中提取基本模型名称（例如，从"gemini-pro"中提取"gemini-pro"）
      const modelName = model || "gemini-pro";
      return `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    }
    return "";
  }

  // 更新Gemini端点URL以匹配所选模型
  function updateGeminiEndpoint(model: string) {
    if (aiProvider === "gemini") {
      // 只有当端点包含默认格式时才更新
      if (apiEndpoint.includes("generativelanguage.googleapis.com/v1beta/models/") &&
          apiEndpoint.includes(":generateContent")) {
        // 提取模型名称
        const modelName = model === "custom" ?
          (document.getElementById("gemini-model-custom") as HTMLInputElement)?.value || "gemini-pro" :
          model;

        // 更新端点URL
        apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      }
    }
  }

  // 从服务器获取配置
  async function fetchConfig() {
    isLoading = true;
    loadError = "";

    try {
      const response = await fetch('http://localhost:3000/api/config');

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const config = await response.json();

      // 更新状态
      aiProvider = config.ai_provider || "openai";
      apiKey = config.api_key || "";
      apiEndpoint = config.api_endpoint || getDefaultEndpoint(aiProvider);
      aiModel = config.ai_model || "gpt-3.5-turbo";

      // 同时更新本地存储，作为备份
      localStorage.setItem("luoxu_ai_provider", aiProvider);
      localStorage.setItem("luoxu_api_key", apiKey);
      localStorage.setItem("luoxu_api_endpoint", apiEndpoint);
      localStorage.setItem("luoxu_ai_model", aiModel);

    } catch (error) {
      console.error('获取配置失败:', error);
      loadError = `获取配置失败: ${error.message}`;

      // 从本地存储中获取配置
      aiProvider = localStorage.getItem("luoxu_ai_provider") || "openai";
      apiKey = localStorage.getItem("luoxu_api_key") || "";
      apiEndpoint = localStorage.getItem("luoxu_api_endpoint") || getDefaultEndpoint(aiProvider);
      aiModel = localStorage.getItem("luoxu_ai_model") || "gpt-3.5-turbo";
    } finally {
      isLoading = false;
    }
  }
  let showConfig = $state(false);
  let saveSuccess = $state(false);

  // 保存AI配置
  async function saveConfig() {
    try {
      saveSuccess = false;
      loadError = "";

      const config = {
        ai_provider: aiProvider,
        api_key: apiKey,
        api_endpoint: apiEndpoint,
        ai_model: aiModel
      };

      // 首先保存到本地存储
      localStorage.setItem("luoxu_ai_provider", aiProvider);
      localStorage.setItem("luoxu_api_key", apiKey);
      localStorage.setItem("luoxu_api_endpoint", apiEndpoint);
      localStorage.setItem("luoxu_ai_model", aiModel);

      try {
        // 尝试保存到服务器
        const response = await fetch('http://localhost:3000/api/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(config)
        });

        if (!response.ok) {
          throw new Error(`服务器错误: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || '保存失败');
        }
      } catch (serverError) {
        console.warn('保存到服务器失败，但已保存到本地存储:', serverError);
        // 不阻止保存成功，因为已经保存到了本地存储
      }

      // 无论服务器是否保存成功，都显示保存成功
      saveSuccess = true;
      setTimeout(() => {
        saveSuccess = false;
      }, 3000);
    } catch (error) {
      console.error('保存配置失败:', error);
      loadError = `保存配置失败: ${error.message}`;
    }
  }

  // 根据提供商更新默认端点和模型
  function updateDefaultEndpoint() {
    if (aiProvider === "openai") {
      apiEndpoint = getDefaultEndpoint("openai");
      aiModel = "gpt-3.5-turbo";
    } else if (aiProvider === "gemini") {
      aiModel = "gemini-pro";
      apiEndpoint = getDefaultEndpoint("gemini", aiModel);
    }

    // 确保在组件加载后执行
    setTimeout(() => {
      // 隐藏所有自定义输入框
      const customInputs = document.querySelectorAll('[id$="-model-custom"]');
      customInputs.forEach(input => {
        (input as HTMLElement).style.display = "none";
      });
    }, 0);
  }

  // 切换配置面板显示
  function toggleConfig() {
    showConfig = !showConfig;

    // 如果打开配置面板，检查是否需要显示自定义模型输入框
    if (showConfig) {
      setTimeout(() => {
        const openaiSelect = document.getElementById("ai-model-select");
        const geminiSelect = document.getElementById("gemini-model-select");
        const openaiCustomInput = document.getElementById("ai-model-custom");
        const geminiCustomInput = document.getElementById("gemini-model-custom");

        // 检查OpenAI模型
        if (openaiSelect && openaiCustomInput && aiProvider === "openai") {
          const isCustomModel = !["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "custom"].includes(aiModel);
          if (isCustomModel) {
            (openaiSelect as HTMLSelectElement).value = "custom";
            (openaiCustomInput as HTMLInputElement).value = aiModel;
            (openaiCustomInput as HTMLElement).style.display = "block";
          }
        }

        // 检查Gemini模型
        if (geminiSelect && geminiCustomInput && aiProvider === "gemini") {
          const isCustomModel = !["gemini-pro", "gemini-1.5-pro", "custom"].includes(aiModel);
          if (isCustomModel) {
            (geminiSelect as HTMLSelectElement).value = "custom";
            (geminiCustomInput as HTMLInputElement).value = aiModel;
            (geminiCustomInput as HTMLElement).style.display = "block";
          }
        }
      }, 100);
    }
  }

  onMount(async () => {
    // 从服务器获取配置
    await fetchConfig();

    // 检查是否需要显示自定义模型输入框
    setTimeout(() => {
      if (showConfig) {
        const openaiSelect = document.getElementById("ai-model-select");
        const geminiSelect = document.getElementById("gemini-model-select");
        const openaiCustomInput = document.getElementById("ai-model-custom");
        const geminiCustomInput = document.getElementById("gemini-model-custom");

        // 检查OpenAI模型
        if (openaiSelect && openaiCustomInput) {
          const isCustomModel = !["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "custom"].includes(aiModel);
          if (isCustomModel) {
            (openaiSelect as HTMLSelectElement).value = "custom";
            (openaiCustomInput as HTMLInputElement).value = aiModel;
            (openaiCustomInput as HTMLElement).style.display = "block";
          }
        }

        // 检查Gemini模型
        if (geminiSelect && geminiCustomInput) {
          const isCustomModel = !["gemini-pro", "gemini-1.5-pro", "custom"].includes(aiModel);
          if (isCustomModel) {
            (geminiSelect as HTMLSelectElement).value = "custom";
            (geminiCustomInput as HTMLInputElement).value = aiModel;
            (geminiCustomInput as HTMLElement).style.display = "block";
          }
        }
      }
    }, 100);
  });
</script>

<div class="ai-config">
  <button class="config-toggle" onclick={toggleConfig}>
    {showConfig ? "隐藏AI配置" : "显示AI配置"}
  </button>

  {#if showConfig}
    <div class="config-panel">
      <h3>AI接口配置</h3>

      {#if isLoading}
        <div class="loading">
          <p>正在加载配置...</p>
        </div>
      {:else}
        {#if loadError}
          <div class="warning-message">
            <p>{loadError}</p>
            <p>使用本地存储的配置。您的更改将保存在本地，并在服务器可用时同步。</p>
            <button class="retry-button" onclick={fetchConfig}>重试连接服务器</button>
          </div>
        {/if}
        <div class="form-group">
          <label for="ai-provider">AI提供商</label>
          <select
            id="ai-provider"
            bind:value={aiProvider}
            onchange={updateDefaultEndpoint}
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        <div class="form-group">
          <label for="api-key">API密钥</label>
          <input
            id="api-key"
            type="password"
            bind:value={apiKey}
            placeholder="输入您的API密钥"
          />
        </div>

        <div class="form-group">
          <label for="api-endpoint">API端点</label>
          <input
            id="api-endpoint"
            type="text"
            bind:value={apiEndpoint}
            placeholder="API端点URL"
          />
        </div>

        {#if aiProvider === "openai" || aiProvider === "custom"}
          <div class="form-group">
            <label for="ai-model">模型</label>
            <div class="model-input-container">
              <select id="ai-model-select" bind:value={aiModel} onchange={(e) => {
                if (e.target.value === "custom") {
                  // 如果选择了自定义，显示输入框
                  document.getElementById("ai-model-custom").style.display = "block";
                } else {
                  document.getElementById("ai-model-custom").style.display = "none";
                }
              }}>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="custom">自定义模型</option>
              </select>
              <input
                id="ai-model-custom"
                type="text"
                placeholder="输入自定义模型名称"
                style="display: none; margin-top: 0.5rem;"
                oninput={(e) => {
                  if (e.target.value) {
                    aiModel = e.target.value;
                  }
                }}
              />
            </div>
          </div>
        {/if}

        {#if aiProvider === "gemini"}
          <div class="form-group">
            <label for="ai-model">模型</label>
            <div class="model-input-container">
              <select id="gemini-model-select" bind:value={aiModel} onchange={(e) => {
                if (e.target.value === "custom") {
                  // 如果选择了自定义，显示输入框
                  document.getElementById("gemini-model-custom").style.display = "block";
                } else {
                  document.getElementById("gemini-model-custom").style.display = "none";
                  // 更新端点URL以匹配所选模型
                  updateGeminiEndpoint(e.target.value);
                }
              }}>
                <option value="gemini-pro">Gemini Pro</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="custom">自定义模型</option>
              </select>
              <input
                id="gemini-model-custom"
                type="text"
                placeholder="输入自定义模型名称"
                style="display: none; margin-top: 0.5rem;"
                oninput={(e) => {
                  if (e.target.value) {
                    aiModel = e.target.value;
                    // 更新端点URL以匹配自定义模型
                    updateGeminiEndpoint("custom");
                  }
                }}
              />
            </div>
          </div>
        {/if}

        <button class="save-button" onclick={saveConfig}>保存配置</button>

        {#if saveSuccess}
          <p class="success-message">配置已保存！</p>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .ai-config {
    margin-bottom: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 1rem;
    background-color: var(--color-bg);
  }

  .config-toggle {
    background-color: var(--color-btn-bg);
    border: 1px solid var(--color-border);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 1rem;
  }

  .config-panel {
    padding: 1rem;
    border-top: 1px solid var(--color-border);
  }

  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
  }

  input, select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg);
  }

  .model-input-container {
    display: flex;
    flex-direction: column;
  }

  .save-button {
    background-color: var(--color-btn-bg);
    border: 1px solid var(--color-border);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .save-button:hover {
    background-color: var(--color-hover);
  }

  .success-message {
    color: green;
    margin-top: 0.5rem;
  }

  .loading {
    padding: 1rem;
    text-align: center;
  }

  .error-message {
    color: red;
    padding: 1rem;
    border: 1px solid red;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .warning-message {
    color: #856404;
    background-color: #fff3cd;
    padding: 1rem;
    border: 1px solid #ffeeba;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .retry-button {
    background-color: var(--color-btn-bg);
    border: 1px solid var(--color-border);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 0.5rem;
  }
</style>
