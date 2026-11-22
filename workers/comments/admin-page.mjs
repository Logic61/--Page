export function adminPage(nonce, configured) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>留言管理 · 上古祝门</title>
  <style nonce="${nonce}">
    :root { color-scheme: dark; font-family: system-ui, "Microsoft YaHei", sans-serif; color: #f1e8d5; background: #13110f; }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    main { width: min(100% - 2rem, 52rem); margin: clamp(2rem, 6vw, 5rem) auto; }
    header, .bar, .row-head { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
    header { margin-bottom: 1.5rem; }
    h1 { margin: 0; font: 500 clamp(1.6rem, 4vw, 2.2rem)/1.2 Georgia, "Songti SC", "SimSun", serif; }
    p { line-height: 1.55; }
    button, input { font: inherit; }
    button { padding: .55rem .95rem; border: 1px solid #6b5938; border-radius: .4rem; color: #f4e5bd; background: #352b1e; cursor: pointer; }
    button:hover:not(:disabled) { background: #4a3a26; }
    button:disabled { cursor: progress; opacity: .65; }
    :focus-visible { outline: 2px solid #e6bb6e; outline-offset: 3px; }
    .bar, .row, form { border: 1px solid #494035; border-radius: .55rem; padding: 1rem; background: #1c1814; }
    form { max-width: 27rem; display: grid; gap: .8rem; }
    input[type=password] { width: 100%; padding: .65rem .8rem; background: #13110f; border: 1px solid #6b5938; border-radius: .4rem; color: inherit; }
    .bar { gap: 1rem; flex-wrap: wrap; }
    .bar label, .switch { display: inline-flex; align-items: center; gap: .55rem; flex: none; }
    .switch { min-width: 5.5rem; justify-content: flex-end; cursor: pointer; }
    input[role=switch] { appearance: none; margin: 0; width: 2.65rem; height: 1.5rem; border: 1px solid #927b54; border-radius: 2rem; background: #352d24; cursor: pointer; position: relative; }
    input[role=switch]::before { content: ""; width: 1rem; height: 1rem; border-radius: 50%; background: #e6d5b3; position: absolute; top: .1875rem; left: .2rem; }
    input[role=switch]:checked { background: #b58744; border-color: #e0ba78; }
    input[role=switch]:checked::before { left: 1.3rem; background: #fff4df; }
    input[role=switch]:disabled { opacity: .6; cursor: progress; }
    #status { min-height: 1.5em; margin: .9rem 0; color: #e0c493; }
    ol { list-style: none; padding: 0; display: grid; gap: .65rem; }
    .row[data-hidden="true"] { background: #181512; }
    .row-name { font-weight: 650; overflow-wrap: anywhere; }
    .row-meta { color: #bcad98; margin: .2rem 0 0; font-size: .85rem; overflow-wrap: anywhere; }
    .row-body { white-space: pre-wrap; overflow-wrap: anywhere; margin: .7rem 0 0; }
  </style>
</head>
<body>
  <main>
    <header><h1>留言管理</h1><button id="logout" type="button" hidden>退出管理</button></header>
    <p id="status" role="status"></p>
    ${configured ? `<form id="login" hidden>
      <label for="key">站长密钥</label>
      <input id="key" type="password" autocomplete="current-password" required maxlength="64" spellcheck="false">
      <button type="submit">进入管理</button>
    </form>
    <section id="dashboard" aria-label="留言管理" hidden>
      <div class="bar">
        <label><input id="posting" type="checkbox" role="switch"> 接受新留言</label>
        <button id="refresh" type="button">刷新列表</button>
      </div>
      <ol id="comments"></ol>
      <button id="more" type="button" hidden>更早留言</button>
    </section>
    <template id="row-template">
      <li class="row">
        <div class="row-head">
          <div><span class="row-name"></span><p class="row-meta"></p></div>
          <label class="switch"><span></span><input type="checkbox" role="switch" aria-label="隐藏这条留言"></label>
        </div>
        <p class="row-body"></p>
      </li>
    </template>` : '<p>尚未配置管理员密钥。</p>'}
  </main>
  ${configured ? `<script nonce="${nonce}">
    const $ = (id) => document.getElementById(id);
    const login = $('login');
    const key = $('key');
    const loginButton = login.querySelector('button');
    const dashboard = $('dashboard');
    const logout = $('logout');
    const posting = $('posting');
    const refresh = $('refresh');
    const comments = $('comments');
    const more = $('more');
    const template = $('row-template');
    const date = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
    let next = null;
    let postingEnabled = false;

    const status = (message) => { $('status').textContent = message; };

    function setBusy(busy) {
      logout.disabled = busy;
      dashboard.querySelectorAll('button, input').forEach((control) => { control.disabled = busy; });
    }

    function showLogin() {
      login.hidden = false;
      dashboard.hidden = logout.hidden = true;
      comments.replaceChildren();
    }

    async function call(path, options) {
      const response = await fetch('/admin/' + path, options);
      if (response.status === 401) {
        showLogin();
        throw new Error('unauthorized');
      }
      if (!response.ok) throw new Error('unavailable');
      return response.json();
    }

    function render(comment) {
      const row = template.content.firstElementChild.cloneNode(true);
      const toggle = row.querySelector('input');
      const label = row.querySelector('.switch span');
      const name = comment.name || '匿名访客';
      row.querySelector('.row-name').textContent = name;
      row.querySelector('.row-meta').textContent = '#' + comment.id + ' · ' + comment.page + ' · ' + date.format(new Date(comment.created_at));
      row.querySelector('.row-body').textContent = comment.body;
      toggle.setAttribute('aria-label', '隐藏 ' + name + ' 的留言 #' + comment.id);
      let hidden = Boolean(comment.hidden);
      function paint() {
        row.dataset.hidden = String(hidden);
        toggle.checked = hidden;
        label.textContent = hidden ? '已隐藏' : '隐藏';
      }
      paint();
      toggle.addEventListener('change', async () => {
        setBusy(true);
        status('正在保存…');
        try {
          const result = await call('comments/' + comment.id + '?hidden=' + Number(toggle.checked), { method: 'PUT' });
          hidden = result.hidden;
          status(hidden ? '留言已隐藏。' : '留言已恢复显示。');
        } catch (error) {
          status(error.message === 'unauthorized' ? '登录已过期，请重新进入管理。' : '未能确认保存结果，请刷新列表后重试。');
        } finally {
          paint();
          setBusy(false);
        }
      });
      return row;
    }

    async function load(older = false) {
      setBusy(true);
      status('正在读取留言…');
      try {
        const result = await call('comments' + (older ? '?before=' + next : ''));
        if (!older) comments.replaceChildren();
        comments.append(...result.comments.map(render));
        next = result.next;
        more.hidden = next === null;
        postingEnabled = result.postingEnabled;
        posting.checked = postingEnabled;
        dashboard.hidden = logout.hidden = false;
        login.hidden = true;
        status(comments.childElementCount ? '' : '还没有留言。');
      } catch (error) {
        if (error.message === 'unauthorized') status('');
        else {
          status('暂时无法读取留言，请刷新后重试。');
          if (dashboard.hidden) login.hidden = false;
        }
      } finally {
        setBusy(false);
      }
    }

    login.addEventListener('submit', async (event) => {
      event.preventDefault();
      loginButton.disabled = true;
      try {
        await call('session', { method: 'POST', headers: { Authorization: 'Bearer ' + key.value.trim() } });
        key.value = '';
        await load();
      } catch (error) {
        status(error.message === 'unauthorized' ? '密钥不正确。' : '暂时无法登录，请稍后重试。');
      } finally {
        loginButton.disabled = false;
      }
    });

    posting.addEventListener('change', async () => {
      setBusy(true);
      status('正在保存…');
      try {
        const result = await call('posting?enabled=' + Number(posting.checked), { method: 'PUT' });
        postingEnabled = result.postingEnabled;
        status(postingEnabled ? '已恢复接受新留言。' : '已暂停新留言。');
      } catch (error) {
        status(error.message === 'unauthorized' ? '登录已过期，请重新进入管理。' : '未能确认保存结果，请刷新列表后重试。');
      } finally {
        posting.checked = postingEnabled;
        setBusy(false);
      }
    });

    logout.addEventListener('click', async () => {
      setBusy(true);
      try {
        await call('session', { method: 'DELETE' });
        showLogin();
        status('已退出管理。');
      } catch {
        status('暂时无法退出，请重试。');
      } finally {
        setBusy(false);
      }
    });
    refresh.addEventListener('click', () => load());
    more.addEventListener('click', () => load(true));
    void load();
  </script>` : ''}
</body>
</html>`;
}
