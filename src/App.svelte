<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount, setContext } from "svelte";
  import Message from "./Message.svelte";
  import Name from "./Name.svelte";
  import AIConfig from "./AIConfig.svelte";
  import AISummary from "./AISummary.svelte";
  import { sleep } from "./util.js";
  import "./global.css";

  // 配置后端URL
  const LUOXU_URL = "/luoxu_api/luoxu";
  const islocal = LUOXU_URL.startsWith("http://localhost");

  // 添加登出功能
  function logout() {
    localStorage.removeItem("luoxu_logged_in");
    window.location.reload();
  }

  // 添加时间筛选和消息数量选择
  // 获取当前日期和时间
  const currentDate = new Date();
  const today = currentDate.toISOString().split('T')[0]; // 格式：YYYY-MM-DD
  const currentTime = currentDate.toTimeString().slice(0, 5); // 格式：HH:MM

  // 设置默认值
  let startDate = $state(today);
  let startTime = $state("00:00");
  let endDate = $state(today);
  let endTime = $state(currentTime);
  let messageLimit = $state(50);
  let showTimeFilter = $state(false);
  let showAISummary = $state(false);
  let aiSummaryLastXCount = $state(100); // 新增: AI总结的默认消息数量

  // 消息计数
  let filteredMessageCount = $state(0);
  let showMessageCount = $state(false);
  let groups: { group_id: string; name: string }[] = $state([]);
  let group: string = $state();
  let query: string = $state();
  let error: string = $state();
  let result: {
    messages: {
      from_name: string;
      t: any;
      edited: any;
      group_id: string;
      id: string;
      from_id: string;
      html: string;
    }[];
    has_more: boolean;
    groupinfo: string[][];
  } = $state();
  let now = $state(new Date());
  let loading = $state(false);
  let need_update_title = $state(false);
  let sender: string = $state();
  let selected_init: string = $state();
  let our_hash_change = $state(false);
  let abort = new AbortController();

  setContext("LUOXU_URL", LUOXU_URL);

  function parse_hash() {
    const hash = location.hash;
    if (hash) {
      return new URLSearchParams(hash.substring(1));
    }
  }

  onMount(async () => {
    do_hash_search();
    while (true) {
      try {
        const res = await fetch(`${LUOXU_URL}/groups`);
        groups = (await res.json()).groups;
        need_update_title = true;
        if (!group) {
          group = "";
        }
        break;
      } catch (e) {
        console.error("failed to fetch group info, will retry", e);
        await sleep(1000);
      }
    }
  });

  run(() => {
    // only update title on hash change (doing a search)
    if (need_update_title && groups) {
      let group_name: string;
      for (const g of groups) {
        if (g.group_id === group) {
          group_name = g.name;
        }
      }
      if (query && group_name) {
        document.title = `搜索：${query} 于 ${group_name} - 落絮`;
      } else if (query) {
        document.title = `搜索：${query} - 落絮`;
      } else if (group_name) {
        document.title = `搜索 ${group_name} - 落絮`;
      } else {
        document.title = "落絮";
      }
      need_update_title = false;
    }
  });

  function do_hash_search() {
    const info = parse_hash();
    if (info) {
      query = "";
      group = "";
      result = null;
      if (info.has("g")) {
        group = info.get("g");
      }
      if (info.has("q")) {
        query = info.get("q");
      }
      if (info.has("sender")) {
        sender = info.get("sender");
        selected_init = sender;
      }
      if ((group || islocal) && query) {
        result = null;
        do_search();
      }
    }
  }

  let concurrency = 0;
  async function do_search(more?: any) {
    concurrency += 1;
    try {
      abort.abort();
      abort = new AbortController();
      if (!group && !islocal) {
        error = "请选择要搜索的群组";
        return;
      }
      if (!query && !islocal && !sender) {
        error = "请输入搜索关键字";
        return;
      }
      error = "";
      our_hash_change = true;
      console.log(
        `searching ${query} for group ${group}, older than ${more}, from ${sender}`,
      );
      const q = new URLSearchParams();
      if (group) {
        q.append("g", group);
      }
      if (query) {
        q.append("q", query);
      }
      if (sender) {
        q.append("sender", sender);
      }

      // 添加时间筛选参数
      if (showTimeFilter && startDate) {
        // 创建完整的日期时间对象
        const formattedStartDate = startDate.replace(/\//g, '-');
        const startDateTime = new Date(`${formattedStartDate}T${startTime || '00:00'}`);
        const startTimestamp = Math.floor(startDateTime.getTime() / 1000);
        q.append("start", startTimestamp.toString());
      }
      if (showTimeFilter && endDate) {
        // 创建完整的日期时间对象
        const formattedEndDate = endDate.replace(/\//g, '-');
        const endDateTime = new Date(`${formattedEndDate}T${endTime || '23:59'}`);
        const endTimestamp = Math.floor(endDateTime.getTime() / 1000);
        q.append("end", endTimestamp.toString());
      }

      // 添加消息数量限制
      if (messageLimit > 0) {
        q.append("limit", messageLimit.toString());
      }
      let url: RequestInfo | URL;
      const qstr = q.toString();
      if (!more) {
        location.hash = `#${qstr}`;
        need_update_title = true;
        if (result) {
          result.messages = [];
        }
        url = `${LUOXU_URL}/search?${qstr}`;
      } else {
        url = `${LUOXU_URL}/search?${q}&end=${more}`;
      }

      now = new Date();
      loading = true;
      try {
        const res = await fetch(url, { signal: abort.signal });
        const r = await res.json();
        loading = false;
        if (abort.signal.aborted) {
          return [];
        }
        if (more) {
          return r;
        } else {
          result = r;
        }
      } catch (e) {
        if (concurrency <= 1) {
          error = e;
          loading = false;
        }
      }
      our_hash_change = false;
    } finally {
      concurrency -= 1;
    }
  }

  async function on_group_change() {
    error = "";
    if (query) {
      await do_search();
    }
  }

  async function do_search_more() {
    const more = result.messages[result.messages.length - 1].t;
    const old_msgs = result.messages;
    const new_result = await do_search(more);
    result.messages = [...old_msgs, ...new_result.messages];
    result.has_more = new_result.has_more;
  }

  // 获取指定时间范围内的消息数量
  async function countFilteredMessages() {
    if (!group && !islocal) {
      error = "请选择要搜索的群组";
      return;
    }

    if (!startDate || !endDate) {
      error = "请设置开始和结束日期";
      return;
    }

    error = "";

    try {
      // 创建完整的日期时间对象
      const formattedStartDate = startDate.replace(/\//g, '-');
      const formattedEndDate = endDate.replace(/\//g, '-');

      const startDateTime = new Date(`${formattedStartDate}T${startTime || '00:00'}`);
      const endDateTime = new Date(`${formattedEndDate}T${endTime || '23:59'}`);

      const startTimestamp = Math.floor(startDateTime.getTime() / 1000);
      const endTimestamp = Math.floor(endDateTime.getTime() / 1000);

      const q = new URLSearchParams();
      if (group) {
        q.append("g", group);
      }
      if (query) {
        q.append("q", query);
      }
      if (sender) {
        q.append("sender", sender);
      }

      q.append("start", startTimestamp.toString());
      q.append("end", endTimestamp.toString());
      q.append("count", "true"); // 只获取消息数量

      const url = `${LUOXU_URL}/search?${q}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data && data.count !== undefined) {
        filteredMessageCount = data.count;
        showMessageCount = true;
      } else {
        throw new Error("获取消息数量失败");
      }
    } catch (e) {
      error = e.message || "获取消息数量失败";
      console.error(e);
    }
  }
</script>

<svelte:window
  onhashchange={() => {
    if (!our_hash_change) do_hash_search();
  }}
/>

<main>
  <div class="header">
    <h1>落絮</h1>
    <button class="logout-button" onclick={logout}>登出</button>
  </div>

  <!-- AI配置组件 -->
  <AIConfig />

  <div id="searchbox">
    {#if groups.length === 0}
      <select>
        <option selected>正在加载群组信息...</option>
      </select>
    {:else}
      <select bind:value={group} onchange={on_group_change}>
        {#if islocal}
          <option value="">全部</option>
        {/if}
        {#each groups as group}
          <option value={group.group_id}>{group.name}</option>
        {/each}
      </select>
    {/if}
    <input
      type="search"
      bind:value={query}
      oninput={() => (error = "")}
      onkeydown={(e) => {
        if (e.key === "Enter") {
          do_search();
        }
      }}
    />
    <Name {group} bind:selected={sender} {selected_init} />
    <button onclick={() => do_search()}>搜索</button>
  </div>

  <!-- 时间筛选和消息数量控制 -->
  <div class="filter-controls">
    <button onclick={() => showTimeFilter = !showTimeFilter}>
      {showTimeFilter ? "隐藏时间筛选" : "显示时间筛选"}
    </button>

    {#if showTimeFilter}
      <div class="time-filter">
        <div class="filter-item">
          <label for="start-date">开始日期时间:</label>
          <div class="datetime-input">
            <input id="start-date" type="date" bind:value={startDate} />
            <input id="start-time" type="time" bind:value={startTime} />
          </div>
        </div>
        <div class="filter-item">
          <label for="end-date">结束日期时间:</label>
          <div class="datetime-input">
            <input id="end-date" type="date" bind:value={endDate} />
            <input id="end-time" type="time" bind:value={endTime} />
          </div>
        </div>
        <div class="filter-item">
          <label for="message-limit">消息数量限制:</label>
          <input
            id="message-limit"
            type="number"
            bind:value={messageLimit}
            min="1"
            max="1000"
          />
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

    <button onclick={() => showAISummary = !showAISummary}>
      {showAISummary ? "隐藏AI总结" : "显示AI总结"}
    </button>
  </div>

  <!-- AI总结组件 -->
  {#if showAISummary && result && result.messages && result.messages.length > 0}
    <div class="ai-summary-controls">
      <label for="ai-summary-count">总结最近消息条数:</label>
      <input id="ai-summary-count" type="number" bind:value={aiSummaryLastXCount} min="1" />
    </div>
    <AISummary
      messages={result.messages.slice(Math.max(0, result.messages.length - aiSummaryLastXCount))}
      groupinfo={result.groupinfo}
      isSearchResult={true}
    />
  {/if}

  {#if result}
    {#each result.messages as message}
      <Message msg={message} groupinfo={result.groupinfo} {now} />
    {/each}
  {:else if !loading && !error}
    <div>
      <p>
        搜索消息时，搜索字符串不区分简繁（会使用 OpenCC
        自动转换），也不进行分词（请手动将可能不连在一起的词语以空格分开）。
      </p>
      <p>搜索字符串支持以下功能：</p>
      <ul>
        <li>以空格分开的多个搜索词是「与」的关系</li>
        <li>使用 OR（全大写）来表达「或」条件</li>
        <li>使用 - 来表达排除，如 落絮 - 测试</li>
        <li>使用小括号来分组</li>
      </ul>
      <p>人名补全支持上下方向键和 Alt+N/P 进行选择。</p>
      <p>
        搜索结果右下角的时间，悬停可查看绝对时间、最后编辑时间（如编辑过），点击可跳转到
        Telegram 中展示该消息。
      </p>
    </div>
  {/if}

  {#if loading}
    <div class="info"><p>正在加载...</p></div>
  {:else}
    {#if error}
      <p class="error">{error}</p>
    {:else if result && result.messages.length === 0}
      <div class="info"><p>没有匹配的消息。</p></div>
    {:else if result && !result.has_more}
      <div class="info"><p>到底了。</p></div>
    {/if}
    {#if result && result.has_more}
      <div class="info">
        <button onclick={do_search_more}>加载更多</button>
      </div>
    {/if}
  {/if}
</main>

<style>
  main {
    margin: 1em;
  }

  button {
    white-space: nowrap;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .logout-button {
    padding: 0.5rem 1rem;
    background-color: var(--color-btn-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .logout-button:hover {
    background-color: var(--color-hover);
  }

  #searchbox {
    display: flex;
    margin-left: 1px;
    padding-bottom: 8px;
  }
  #searchbox > :global(*) {
    /* make borders collapse */
    margin-left: -1px;
  }
  #searchbox input[type="search"] {
    flex-grow: 1;
  }
  @media (max-width: 700px) {
    #searchbox {
      flex-direction: column;
    }
  }

  .filter-controls {
    margin: 1rem 0;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }

  .time-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 0.5rem;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg);
    width: 100%;
  }

  .filter-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .filter-item input {
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg);
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

  .error {
    color: var(--color-error);
    text-align: center;
  }

  .info {
    display: flex;
    justify-content: center;
  }
  .info > * {
    padding: 0.5em 1em;
    margin: 1em 0;
  }
  .info > p {
    border: 1px solid var(--color-border);
    border-radius: 2em;
  }

  .ai-summary-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg);
  }

  .ai-summary-controls label {
    white-space: nowrap;
  }

  .ai-summary-controls input[type="number"] {
    width: 60px; /* Adjust width as needed */
    padding: 0.25rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }
</style>
