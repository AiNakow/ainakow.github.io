/* ============================================================
   共享外壳脚本 —— 主页与工具合集页共用
   一处声明（SECTIONS），三处共用（首页卡片 / 合集页卡片 / 导航栏）
   新增工具或新分区：只需往 SECTIONS 加一项
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 声明式站点清单（可扩展核心） ----------
     section: { id, title, items: [...] }
     item: { id, title, desc, icon, url(相对站点根) }
     非工具类页面同样按 item 形式登记，type='page' 时不在合集 iframe 内加载，
     而是直接跳转到对应页面。
  */
  const SECTIONS = [
    {
      id: "tools", title: "工具", items: [
        { id: "scheduler", title: "团队赛分组器", desc: "模拟退火求解赛程 · 浏览器内运行 · 支持 CSV", icon: "📅", url: "tools/scheduler/index.html", type: "tool" },
        // 新增工具在这里加一行即可
      ]
    },
    // 未来新增分区（如博客、关于）在这里加一个对象即可：
    // { id: "posts", title: "文章", items: [ { id: "...", title: "...", desc: "...", icon: "✍️", url: "posts/index.html", type: "page" } ] }
  ];

  /* ---------- 站点元信息（首页用，按需修改） ---------- */
  const SITE = {
    name: "AiNakow",
    bio: "我去，我的猫猫在自己写代码",
    github: "https://github.com/AiNakow",   // 留接口，可改
  };

  /* ---------- 工具：取所有 item 扁平 ---------- */
  function allItems() {
    const out = [];
    for (const s of SECTIONS) for (const it of s.items) out.push({ ...it, sectionId: s.id });
    return out;
  }
  function findItem(id) { return allItems().find(i => i.id === id); }

  /* ============================================================
     首页：渲染头像区 + 工具卡片网格
     首页本身也挂导航栏（由 ShellBoot 渲染），这里只负责首页专属内容
     暴露 window.HomeBoot，由 index.html 在 DOM 就绪后调用
     ============================================================ */
  function renderHome() {
    const root = document.getElementById("home-root");
    if (!root) return;

    // 头像 + 简介
    const hero = root.querySelector(".hero");
    if (hero) {
      const nameEl = hero.querySelector(".name");
      const bioEl = hero.querySelector(".bio");
      if (nameEl) nameEl.textContent = SITE.name;
      if (bioEl) bioEl.textContent = SITE.bio;
      // 头像首字母占位
      const ph = hero.querySelector(".avatar-ph");
      if (ph) ph.textContent = (SITE.name || "A").trim().charAt(0).toUpperCase();
    }

    // 工具卡片网格：首页只放"工具"分区
    const gridHost = root.querySelector(".tool-grid");
    if (gridHost) {
      const tools = (SECTIONS.find(s => s.id === "tools") || { items: [] }).items;
      gridHost.innerHTML = "";
      for (const t of tools) {
        const a = document.createElement("a");
        a.className = "tool-card";
        a.href = "tools/index.html#/" + t.id;
        a.innerHTML =
          '<span class="icon">' + (t.icon || "🧰") + "</span>" +
          '<span class="t">' + esc(t.title) + "</span>" +
          '<span class="d">' + esc(t.desc || "") + "</span>" +
          '<span class="go">打开 →</span>';
        gridHost.appendChild(a);
      }
      if (tools.length === 0) {
        const e = document.createElement("div");
        e.className = "empty";
        e.textContent = "还没有工具，敬请期待。";
        gridHost.appendChild(e);
      }
    }
  }

  /* ============================================================
     外壳（导航栏 + 折叠/抽屉 + 可选 iframe 路由）
     首页与工具合集页共用：首页没有 iframe/list-view，仅用导航栏；
     工具合集页有 iframe，按 hash 路由加载工具。
     暴露 window.ShellBoot，由各页在 DOM 就绪后调用
     ============================================================ */
  function renderShell() {
    const nav = document.getElementById("nav");
    const navBody = document.getElementById("nav-body");
    const iframe = document.getElementById("frame");         // 首页为 null
    const listView = document.getElementById("list-view");   // 首页为 null
    const overlay = document.getElementById("overlay");
    const topbarTitle = document.getElementById("topbar-title");
    const navToggle = document.getElementById("nav-toggle");
    if (!nav || !navBody) return;

    // 是否带 iframe（工具合集页）；首页为 false
    const hasFrame = !!iframe;

    /* ----- 渲染导航栏（含"首页"项 + 各分区） ----- */
    function buildNav() {
      navBody.innerHTML = "";

      // 顶部"首页"项：始终存在，方便从任何页回到首页
      const homeItem = document.createElement("a");
      homeItem.className = "nav-item";
      homeItem.dataset.id = "home";
      homeItem.href = resolveUrl("index.html");
      homeItem.title = "首页";
      homeItem.innerHTML = '<span class="ico">⌂</span><span class="lbl">首页</span>';
      navBody.appendChild(homeItem);

      for (const sec of SECTIONS) {
        const group = document.createElement("div");
        group.className = "nav-group";
        const label = document.createElement("div");
        label.className = "glabel";
        label.textContent = sec.title;
        group.appendChild(label);
        for (const it of sec.items) {
          const item = document.createElement("div");
          item.className = "nav-item";
          item.dataset.id = it.id;
          item.title = it.title;
          item.innerHTML =
            '<span class="ico">' + (it.icon || "•") + "</span>" +
            '<span class="lbl">' + esc(it.title) + "</span>";
          item.addEventListener("click", (ev) => {
            if (hasFrame) {
              // 工具合集页：用 hash 路由在 iframe 内加载
              ev.preventDefault();
              location.hash = "/" + it.id;
            } else {
              // 首页：跳转到工具合集页并带上 hash
              ev.preventDefault();
              location.href = resolveUrl("tools/index.html#/" + it.id);
            }
            closeDrawer();
          });
          group.appendChild(item);
        }
        navBody.appendChild(group);
      }
    }

    /* ----- 高亮当前导航项 ----- */
    function highlight(id) {
      navBody.querySelectorAll(".nav-item").forEach(el => {
        el.classList.toggle("active", el.dataset.id === id);
      });
    }

    /* ----- 根据 hash 决定显示什么（仅工具合集页走此路） ----- */
    function route() {
      if (!hasFrame) { highlight("home"); return; }
      const hash = location.hash.replace(/^#\/?/, ""); // "scheduler" 或 ""
      if (!hash || hash === "list") {
        showList();
        highlight("");
        if (topbarTitle) topbarTitle.textContent = "工具合集";
        return;
      }
      const it = findItem(hash);
      if (!it) { showList(); highlight(""); return; }
      highlight(it.id);
      if (topbarTitle) topbarTitle.textContent = it.title;
      if (it.type === "page") {
        location.href = resolveUrl(it.url);
        return;
      }
      loadTool(it);
    }

    /* ----- 加载某个工具到 iframe ----- */
    function loadTool(it) {
      if (!iframe) return;
      const src = resolveUrl(it.url);
      if (iframe.src !== src && iframe.getAttribute("src") !== src) {
        iframe.src = src;
      }
      if (listView) listView.style.display = "none";
      iframe.style.display = "block";
    }

    /* ----- 显示工具卡片列表视图（无 hash） ----- */
    function showList() {
      if (!listView || !iframe) return;
      iframe.style.display = "none";
      iframe.removeAttribute("src");
      listView.style.display = "block";
      const host = listView.querySelector(".tool-grid");
      if (!host) return;
      host.innerHTML = "";
      const tools = (SECTIONS.find(s => s.id === "tools") || { items: [] }).items;
      for (const t of tools) {
        const a = document.createElement("a");
        a.className = "tool-card";
        a.href = "#/" + t.id;
        a.innerHTML =
          '<span class="icon">' + (t.icon || "🧰") + "</span>" +
          '<span class="t">' + esc(t.title) + "</span>" +
          '<span class="d">' + esc(t.desc || "") + "</span>" +
          '<span class="go">打开 →</span>';
        host.appendChild(a);
      }
      if (tools.length === 0) {
        const e = document.createElement("div");
        e.className = "empty";
        e.textContent = "还没有工具，敬请期待。";
        host.appendChild(e);
      }
    }

    /* ----- 导航折叠（桌面端，记忆状态） ----- */
    function applyCollapsed() {
      if (!nav) return;
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      if (isMobile) { nav.classList.remove("collapsed"); return; } // 移动端用抽屉，不折叠
      const c = localStorage.getItem("navCollapsed") === "1";
      nav.classList.toggle("collapsed", c);
    }
    function toggleCollapse() {
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      if (isMobile) { toggleDrawer(); return; }
      const c = nav.classList.toggle("collapsed");
      localStorage.setItem("navCollapsed", c ? "1" : "0");
    }

    /* ----- 移动端抽屉 ----- */
    function openDrawer() {
      nav.classList.add("open");
      if (overlay) overlay.classList.add("show");
    }
    function closeDrawer() {
      nav.classList.remove("open");
      if (overlay) overlay.classList.remove("show");
    }
    function toggleDrawer() {
      nav.classList.contains("open") ? closeDrawer() : openDrawer();
    }

    /* ----- 绑定事件 ----- */
    // nav-toggle 始终可见：桌面端折叠/展开，移动端开/关抽屉
    if (navToggle) navToggle.addEventListener("click", toggleCollapse);
    if (overlay) overlay.addEventListener("click", closeDrawer);
    if (hasFrame) window.addEventListener("hashchange", route);
    window.addEventListener("resize", applyCollapsed);

    /* ----- 启动 ----- */
    buildNav();
    applyCollapsed();
    route();
  }

  /* ---------- URL 解析：相对站点根的路径 → 相对当前页的路径 ----------
     首页在根目录，合集页在 tools/ 下。统一用 <base> 之外的相对计算。
     站点根相对路径如 "tools/scheduler/index.html"。
  */
  function resolveUrl(siteRelUrl) {
    // 当前页相对站点根的深度：tools/index.html → "tools/" → 前缀 "../"
    // index.html → ""
    const depth = siteDepth();
    if (depth === 0) return siteRelUrl;
    const prefix = Array(depth + 1).join("../");
    return prefix + siteRelUrl;
  }
  function siteDepth() {
    // 用 <html data-root=".."> 之类不好维护，这里依据 location.pathname 计算
    const p = location.pathname.replace(/\\/g, "/");
    // 去掉结尾 index.html
    const trimmed = p.replace(/index\.html$/i, "");
    // 统计目录层级，根为 depth 0
    const segs = trimmed.split("/").filter(Boolean);
    return segs.length;
  }

  /* ---------- HTML 转义 ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ---------- 对外暴露 ---------- */
  window.SiteData = { SECTIONS, SITE };
  window.HomeBoot = renderHome;
  window.ShellBoot = renderShell;
})();
