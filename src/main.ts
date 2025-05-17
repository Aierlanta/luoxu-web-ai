import App from "./App.svelte";
import Login from "./Login.svelte";
import { mount } from "svelte";

// 检查用户是否已登录
const isLoggedIn = localStorage.getItem("luoxu_logged_in") === "true";

// 根据登录状态挂载不同的组件
const app = mount(isLoggedIn ? App : Login, {
  target: document.body,
});

export default app;
