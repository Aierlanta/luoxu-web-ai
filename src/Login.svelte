<script lang="ts">
  import { onMount } from "svelte";

  let username = $state("");
  let password = $state("");
  let error = $state("");
  let isLoading = $state(false);

  // 这里可以设置一个简单的用户名和密码
  const VALID_USERNAME = "admin";
  const VALID_PASSWORD = "123456";

  function login() {
    isLoading = true;
    error = "";

    // 简单的登录验证
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      // 登录成功，存储登录状态
      localStorage.setItem("luoxu_logged_in", "true");
      // 重新加载页面以显示主应用
      window.location.reload();
    } else {
      error = "用户名或密码错误";
      isLoading = false;
    }
  }

  onMount(() => {
    // 检查是否已经登录
    if (localStorage.getItem("luoxu_logged_in") === "true") {
      // 已登录，重定向到主应用
      window.location.href = "/";
    }
  });
</script>

<main>
  <div class="login-container">
    <h1>落絮 - 登录</h1>
    <form onsubmit={(e) => { e.preventDefault(); login(); }}>
      <div class="input-group">
        <label for="username">用户名</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          required
          autocomplete="username"
        />
      </div>
      <div class="input-group">
        <label for="password">密码</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          autocomplete="current-password"
        />
      </div>
      {#if error}
        <p class="error">{error}</p>
      {/if}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "登录中..." : "登录"}
      </button>
    </form>
  </div>
</main>

<style>
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: var(--color-bg);
  }

  .login-container {
    width: 100%;
    max-width: 400px;
    padding: 2rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    background-color: var(--color-bg);
  }

  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: var(--color-text);
  }

  .input-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--color-text);
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg);
    color: var(--color-text);
  }

  button {
    width: 100%;
    padding: 0.75rem;
    margin-top: 1rem;
    background-color: var(--color-btn-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-text);
    font-weight: bold;
  }

  button:hover:not(:disabled) {
    background-color: var(--color-hover);
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .error {
    color: var(--color-error);
    text-align: center;
    margin-top: 1rem;
  }
</style>
