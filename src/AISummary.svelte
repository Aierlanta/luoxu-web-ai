<script lang="ts">
  import { getContext, onMount } from "svelte";

  interface Props {
    messages: any[];
    groupinfo: string[][];
    isSearchResult?: boolean;
  }

  let { messages = [], groupinfo = [], isSearchResult = false }: Props = $props();

  let summaryResult = $state("");
  let isLoading = $state(false);
  let error = $state("");
  let messageLimit = $state(50);

  // 获取当前日期和时间
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // 格式：YYYY-MM-DD
  const currentTime = now.toTimeString().slice(0, 5); // 格式：HH:MM

  // 设置默认值
  let startDate = $state(today);
  let startTime = $state("00:00");
  let endDate = $state(today);
  let endTime = $state(currentTime);
  let showDateFilter = $state(false);

  // 消息计数
  let filteredMessageCount = $state(0);
  let showMessageCount = $state(false);

  const LUOXU_URL = getContext("LUOXU_URL");

  // AI配置
  let aiConfig = $state({
    provider: "openai",
    apiKey: "",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo"
  });
  let configLoading = $state(false);
  let configError = $state("");

  // 从服务器获取AI配置
  async function getAIConfig() {
    if (configLoading) return aiConfig;

    configLoading = true;
    configError = "";

    try {
      const response = await fetch('http://localhost:3000/api/config');

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const config = await response.json();

      // 更新配置
      aiConfig = {
        provider: config.ai_provider || "openai",
        apiKey: config.api_key || "",
        endpoint: config.api_endpoint || "https://api.openai.com/v1/chat/completions",
        model: config.ai_model || "gpt-3.5-turbo"
      };

    } catch (error) {
      console.error('获取AI配置失败:', error);
      configError = `获取AI配置失败: ${error.message}`;

      // 从本地存储中获取配置
      aiConfig = {
        provider: localStorage.getItem("luoxu_ai_provider") || "openai",
        apiKey: localStorage.getItem("luoxu_api_key") || "",
        endpoint: localStorage.getItem("luoxu_api_endpoint") || "https://api.openai.com/v1/chat/completions",
        model: localStorage.getItem("luoxu_ai_model") || "gpt-3.5-turbo"
      };
    } finally {
      configLoading = false;
    }

    return aiConfig;
  }

  // 格式化消息为文本
  function formatMessagesForAI(messages) {
    return messages.map(msg => {
      const time = new Date(msg.t * 1000).toLocaleString();
      return `[${time}] ${msg.from_name}: ${msg.html.replace(/<[^>]*>/g, '')}`;
    }).join('\n\n');
  }

  // 调用OpenAI API
  async function callOpenAI(text) {
    const config = await getAIConfig();

    if (!config.apiKey) {
      throw new Error("请先配置OpenAI API密钥");
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "你是一个专业的消息总结助手，请对以下聊天消息进行简洁、全面的总结，提取关键信息和讨论要点。"
          },
          {
            role: "user",
            content: `请总结以下聊天消息：\n\n${text}`
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // 调用Gemini API
  async function callGemini(text) {
    const config = await getAIConfig();

    if (!config.apiKey) {
      throw new Error("请先配置Gemini API密钥");
    }

    // 确保端点URL包含正确的模型名称
    let apiUrl = config.endpoint;

    // 添加API密钥
    apiUrl = apiUrl.includes("?") ? `${apiUrl}&key=${config.apiKey}` : `${apiUrl}?key=${config.apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `你是一个专业的消息总结助手，请对以下聊天消息进行简洁、全面的总结，提取关键信息和讨论要点。\n\n${text}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  // 调用自定义API
  async function callCustomAPI(text) {
    const config = await getAIConfig();

    if (!config.apiKey) {
      throw new Error("请先配置API密钥");
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        prompt: `你是一个专业的消息总结助手，请对以下聊天消息进行简洁、全面的总结，提取关键信息和讨论要点。\n\n${text}`
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.text || data.content || data.message || JSON.stringify(data);
  }

  // 获取指定时间范围内的消息
  function getFilteredMessages() {
    // 如果不使用日期筛选，则直接返回最近的消息
    if (!showDateFilter) {
      return messages.slice(0, messageLimit);
    }

    // 如果使用日期筛选
    if (showDateFilter && startDate && endDate) {
      // 创建完整的日期时间对象
      const startDateTime = new Date(`${startDate}T${startTime || '00:00'}`);
      const endDateTime = new Date(`${endDate}T${endTime || '23:59'}`);

      const startTimestamp = Math.floor(startDateTime.getTime() / 1000);
      const endTimestamp = Math.floor(endDateTime.getTime() / 1000);

      return messages.filter(msg =>
        msg.t >= startTimestamp && msg.t <= endTimestamp
      );
    }

    // 默认返回所有消息
    return messages;
  }

  // 统计筛选后的消息数量
  function countFilteredMessages() {
    const filteredMessages = getFilteredMessages();
    filteredMessageCount = filteredMessages.length;
    showMessageCount = true;
    return filteredMessageCount;
  }

  // 总结消息
  async function summarizeMessages() {
    isLoading = true;
    error = "";
    summaryResult = "";

    try {
      // 获取要总结的消息
      let messagesToSummarize = getFilteredMessages();

      // 如果不使用日期筛选，则直接使用最近的消息
      if (!showDateFilter) {
        messagesToSummarize = messages.slice(0, messageLimit);
      } else {
        // 限制消息数量
        messagesToSummarize = messagesToSummarize.slice(0, messageLimit);
      }

      if (messagesToSummarize.length === 0) {
        throw new Error("没有符合条件的消息可以总结");
      }

      // 更新消息计数
      filteredMessageCount = messagesToSummarize.length;
      showMessageCount = true;

      // 格式化消息
      const formattedText = formatMessagesForAI(messagesToSummarize);

      // 根据提供商调用不同的API
      const config = await getAIConfig();
      let summary;

      if (configError) {
        console.warn(`获取服务器配置失败: ${configError}，使用本地存储的配置`);
      }

      if (config.provider === "openai") {
        summary = await callOpenAI(formattedText);
      } else if (config.provider === "gemini") {
        summary = await callGemini(formattedText);
      } else {
        summary = await callCustomAPI(formattedText);
      }

      summaryResult = summary;
    } catch (e) {
      error = e.message || "总结失败，请检查API配置";
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  // 切换日期筛选
  function toggleDateFilter() {
    showDateFilter = !showDateFilter;
  }

  // 在组件加载时获取AI配置
  onMount(async () => {
    await getAIConfig();
  });
</script>

<div class="ai-summary">
  <div class="controls">
    <div class="limit-control">
      <label for="message-limit">消息数量限制:</label>
      <input
        id="message-limit"
        type="number"
        bind:value={messageLimit}
        min="1"
        max="1000"
      />
    </div>

    <button class="toggle-date" onclick={toggleDateFilter}>
      {showDateFilter ? "隐藏日期筛选" : "显示日期筛选"}
    </button>

    {#if showDateFilter}
      <div class="date-filters">
        <div class="date-input">
          <label for="start-date">开始日期时间:</label>
          <div class="datetime-input">
            <input id="start-date" type="date" bind:value={startDate} />
            <input id="start-time" type="time" bind:value={startTime} />
          </div>
        </div>
        <div class="date-input">
          <label for="end-date">结束日期时间:</label>
          <div class="datetime-input">
            <input id="end-date" type="date" bind:value={endDate} />
            <input id="end-time" type="time" bind:value={endTime} />
          </div>
        </div>

        {#if showMessageCount && filteredMessageCount > 0}
          <div class="message-count">
            <p>时间段内共有 <strong>{filteredMessageCount}</strong> 条消息</p>
          </div>
        {/if}

        <button
          class="count-button"
          onclick={() => countFilteredMessages()}
          disabled={!startDate || !endDate}
        >
          统计消息数量
        </button>
      </div>
    {/if}

    <button
      class="summarize-button"
      onclick={summarizeMessages}
      disabled={isLoading || messages.length === 0}
    >
      {isLoading ? "正在总结..." : "AI总结"}
    </button>
  </div>

  {#if configLoading}
    <div class="loading">正在加载AI配置...</div>
  {:else}
    {#if configError}
      <div class="warning">
        <p>AI配置从服务器加载失败: {configError}</p>
        <p>使用本地存储的配置继续。</p>
      </div>
    {/if}
    {#if error}
      <div class="error">{error}</div>
    {/if}
  {/if}

  {#if summaryResult}
    <div class="summary-result">
      <h3>AI总结结果</h3>
      <div class="summary-content">{summaryResult}</div>
    </div>
  {/if}
</div>

<style>
  .ai-summary {
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
    align-items: center;
  }

  .limit-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .limit-control input {
    width: 80px;
  }

  .date-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 0.5rem;
    width: 100%;
  }

  .date-input {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .datetime-input {
    display: flex;
    gap: 0.5rem;
  }

  .datetime-input input[type="time"] {
    min-width: 100px;
  }

  .message-count {
    width: 100%;
    padding: 0.5rem;
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    margin: 0.5rem 0;
  }

  .message-count p {
    margin: 0;
  }

  .count-button {
    margin-top: 0.5rem;
  }

  button {
    padding: 0.5rem 1rem;
    background-color: var(--color-btn-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background-color: var(--color-hover);
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .summarize-button {
    font-weight: bold;
  }

  .error {
    color: var(--color-error);
    margin: 1rem 0;
  }

  .warning {
    color: #856404;
    background-color: #fff3cd;
    padding: 1rem;
    border: 1px solid #ffeeba;
    border-radius: 4px;
    margin: 1rem 0;
  }

  .loading {
    text-align: center;
    padding: 1rem;
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    margin: 1rem 0;
  }

  .summary-result {
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg);
  }

  .summary-result h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: var(--color-text);
  }

  .summary-content {
    white-space: pre-line;
    line-height: 1.5;
  }
</style>
