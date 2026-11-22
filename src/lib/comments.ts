type Comment = {
  id: number;
  name: string;
  body: string;
  created_at: string;
  reply_count?: number;
  parent_id?: number | null;
  parent_name?: string | null;
  thread_id?: number | null;
};

type Thread = {
  id: number;
  button: HTMLButtonElement;
  region: HTMLElement;
  list: HTMLOListElement;
  status: HTMLElement;
  more: HTMLButtonElement;
  next: number | null;
  loaded: boolean;
};

const copy = {
  loading: ['正在载入留言……', 'Loading comments…'],
  empty: ['还没有留言。', 'No comments yet.'],
  load_error: ['留言载入失败。', 'Could not load comments.'],
  reviewing: ['正在审核……', 'Reviewing your comment…'],
  published: ['留言已发布。', 'Comment published.'],
  content_violation: ['内容违规，留言未发布。请修改后重试。', 'Your comment violates the posting rules. Please edit it and try again.'],
  paused: ['留言暂时关闭，已发布的留言仍可阅读。', 'New comments are paused. Published comments are still available.'],
  hidden: ['这条留言已被隐藏。', 'This comment has been hidden.'],
  reply_unavailable: ['这条留言已无法回复。', 'This comment can no longer be replied to.'],
  rate_limit: ['提交太频繁，请稍等一分钟再试。', 'Too many submissions. Please wait a minute and try again.'],
  invalid: ['请检查昵称和留言内容后重试。', 'Please check your display name and comment and try again.'],
  unavailable: ['暂时无法审核，留言尚未发布，请稍后重试。', 'The review service is temporarily unavailable. Please try again later.'],
} as const;

const languages = ['zh', 'en'] as const;
const dateFormats = [new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }), new Intl.DateTimeFormat('en', { dateStyle: 'medium' })];

function showText(element: HTMLElement, translation?: readonly [string, string]) {
  element.replaceChildren(...(translation ? languages.map((lang, index) => {
    const span = document.createElement('span');
    span.className = `zl-${lang}`;
    span.textContent = translation[index];
    return span;
  }) : []));
}

function showStatus(element: HTMLElement, message?: keyof typeof copy) {
  element.dataset.state = message ?? '';
  showText(element, message && copy[message]);
}

export function initComments(root: HTMLElement) {
  const endpoint = new URL(root.dataset.endpoint!, document.baseURI);
  endpoint.searchParams.set('page', root.dataset.page!);
  const replyEndpoint = new URL(endpoint);
  replyEndpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}/replies`;
  const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const form = find<HTMLFormElement>('form');
  const listStatus = find('[data-list-status]');
  const list = find<HTMLOListElement>('[data-comment-list]');
  const template = find<HTMLTemplateElement>('[data-comment-template]');
  const more = find<HTMLButtonElement>('[data-more]');
  const moreLabel = find('[data-more-label]');
  const retryLabel = find('[data-retry-label]');
  const displayed = new Set<number>();
  let before: number | null = null;
  let threadsEnabled = false;

  function makeEntry(comment: Comment) {
    const entry = template.content.firstElementChild!.cloneNode(true) as HTMLLIElement;
    entry.dataset.commentId = String(comment.id);
    if (comment.name) entry.querySelector('[data-author]')!.textContent = comment.name;
    entry.querySelector('[data-body]')!.textContent = comment.body;
    languages.forEach((lang, index) => {
      const time = entry.querySelector<HTMLTimeElement>(`[data-date-${lang}]`)!;
      time.dateTime = comment.created_at;
      time.textContent = dateFormats[index].format(new Date(comment.created_at));
    });
    return entry;
  }

  function attachReply(entry: HTMLLIElement, comment: Comment, thread: Thread) {
    entry.querySelector<HTMLElement>('[data-thread-actions]')!.hidden = false;
    const button = entry.querySelector<HTMLButtonElement>('[data-reply-button]')!;
    const slot = entry.querySelector<HTMLElement>('[data-reply-slot]')!;
    slot.id = `comment-reply-${root.dataset.page}-${comment.id}`;
    button.setAttribute('aria-controls', slot.id);
    const to = [comment.name || '匿名访客', comment.name || 'Anonymous'];
    let editor: HTMLFormElement | undefined;

    const setOpen = (open: boolean) => {
      editor!.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      if (open) editor!.querySelector('textarea')!.focus();
      else button.focus();
    };

    button.addEventListener('click', () => {
      if (!editor) {
        editor = form.cloneNode(true) as HTMLFormElement;
        editor.reset();
        const textarea = editor.querySelector('textarea')!;
        textarea.rows = 3;
        showText(textarea.closest('label')!.querySelector('span')!, [`回复 ${to[0]}`, `Reply to ${to[1]}`]);
        const send = editor.querySelector<HTMLButtonElement>('[type="submit"]')!;
        showText(send, ['提交回复', 'Submit reply']);
        const cancel = button.cloneNode(false) as HTMLButtonElement;
        cancel.removeAttribute('data-reply-button');
        cancel.removeAttribute('aria-controls');
        cancel.removeAttribute('aria-expanded');
        showText(cancel, ['收起', 'Close']);
        cancel.addEventListener('click', () => setOpen(false));
        send.after(cancel);
        attachForm(editor, { comment, thread });
        slot.append(editor);
        setOpen(true);
      } else {
        setOpen(editor.hidden);
      }
    });
  }

  function renderReply(comment: Comment, thread: Thread) {
    if (displayed.has(comment.id)) return;
    displayed.add(comment.id);
    const entry = makeEntry(comment);
    entry.querySelector('[data-replies]')!.remove();
    entry.querySelector('[data-thread-button]')!.remove();
    if (comment.parent_name != null) {
      const context = entry.querySelector<HTMLElement>('[data-reply-context]')!;
      context.hidden = false;
      showText(context, [`回复 ${comment.parent_name || '匿名访客'}`, `Reply to ${comment.parent_name || 'Anonymous'}`]);
    }
    attachReply(entry, comment, thread);
    const next = Array.from(thread.list.children).find((child) => Number((child as HTMLElement).dataset.commentId) > comment.id);
    thread.list.insertBefore(entry, next ?? null);
  }

  async function loadReplies(thread: Thread) {
    if (thread.more.disabled) return;
    thread.more.disabled = true;
    showStatus(thread.status, 'loading');
    const url = new URL(endpoint);
    url.searchParams.set('thread', String(thread.id));
    if (thread.next !== null) url.searchParams.set('after', String(thread.next));

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Unable to load replies');
      const data: { comments: Comment[]; next: number | null } = await response.json();
      data.comments.forEach((comment) => renderReply(comment, thread));
      thread.next = data.next;
      thread.loaded = true;
      thread.more.hidden = thread.next === null;
      showText(thread.more, ['更多回复', 'More replies']);
      showStatus(thread.status, thread.list.childElementCount ? undefined : 'empty');
    } catch {
      showStatus(thread.status, 'load_error');
      thread.more.hidden = false;
      showText(thread.more, ['重试', 'Retry']);
    } finally {
      thread.more.disabled = false;
    }
  }

  function openReplies(thread: Thread, open: boolean) {
    thread.region.hidden = !open;
    thread.button.hidden = false;
    thread.button.setAttribute('aria-expanded', String(open));
    showText(thread.button, open ? ['收起回复', 'Hide replies'] : ['查看回复', 'View replies']);
    if (open && !thread.loaded) void loadReplies(thread);
  }

  function render(comment: Comment, prepend = false) {
    if (displayed.has(comment.id)) return;
    displayed.add(comment.id);
    const entry = makeEntry(comment);
    if (threadsEnabled) {
      const region = entry.querySelector<HTMLElement>('[data-replies]')!;
      const thread: Thread = {
        id: comment.id,
        button: entry.querySelector<HTMLButtonElement>('[data-thread-button]')!,
        region,
        list: region.querySelector('ol')!,
        status: region.querySelector('[data-replies-status]')!,
        more: region.querySelector('[data-replies-more]')!,
        next: null,
        loaded: false,
      };
      region.id = `comment-thread-${root.dataset.page}-${comment.id}`;
      thread.button.setAttribute('aria-controls', region.id);
      if (comment.reply_count) openReplies(thread, false);
      thread.button.addEventListener('click', () => openReplies(thread, region.hidden));
      thread.more.addEventListener('click', () => loadReplies(thread));
      attachReply(entry, comment, thread);
    }
    if (prepend) list.prepend(entry);
    else list.append(entry);
  }

  async function load() {
    more.disabled = true;
    showStatus(listStatus, 'loading');
    const url = new URL(endpoint);
    if (before !== null) url.searchParams.set('before', String(before));

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Unable to load comments');
      const data: { comments: Comment[]; next: number | null; threads?: true } = await response.json();
      threadsEnabled = data.threads === true;
      data.comments.forEach((comment) => render(comment));
      before = data.next;
      more.hidden = before === null;
      moreLabel.hidden = false;
      retryLabel.hidden = true;
      showStatus(listStatus, displayed.size ? undefined : 'empty');
    } catch {
      showStatus(listStatus, 'load_error');
      more.hidden = false;
      moreLabel.hidden = true;
      retryLabel.hidden = false;
    } finally {
      more.disabled = false;
    }
  }

  more.addEventListener('click', load);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void load();
    }, { rootMargin: '300px 0px' });
    observer.observe(root);
  } else {
    void load();
  }

  function attachForm(editor: HTMLFormElement, reply?: { comment: Comment; thread: Thread }) {
    const submit = editor.querySelector<HTMLButtonElement>('[type="submit"]')!;
    const submitStatus = editor.querySelector<HTMLElement>('[data-submit-status]')!;
    let submission: { id: string; name: string; body: string } | undefined;
    showStatus(submitStatus);
    submit.disabled = false;
    editor.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled) return;

      const fields = new FormData(editor);
      const name = String(fields.get('nickname') ?? '').trim();
      const body = String(fields.get('body') ?? '').trim();
      if (!body) {
        showStatus(submitStatus, 'invalid');
        return;
      }
      if (!submission || submission.name !== name || submission.body !== body) {
        submission = { id: crypto.randomUUID(), name, body };
      }

      const textFields = Array.from(editor.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'));
      textFields.forEach((field) => { field.readOnly = true; });
      submit.disabled = true;
      showStatus(submitStatus, 'reviewing');

      try {
        const response = await fetch(reply ? replyEndpoint : endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: submission.id, name, body, website: fields.get('website'), parentId: reply?.comment.id ?? null }),
        });
        const data = await response.json();
        if (response.ok) {
          if (reply) {
            const comment = { ...data.comment, parent_name: data.comment.parent_name === undefined ? reply.comment.name : data.comment.parent_name };
            renderReply(comment, reply.thread);
            openReplies(reply.thread, true);
          } else {
            threadsEnabled ||= data.threads === true;
            render(data.comment, true);
          }
          editor.reset();
          submission = undefined;
          if (listStatus.dataset.state === 'empty') showStatus(listStatus);
          showStatus(submitStatus, 'published');
        } else {
          const error = Object.hasOwn(copy, data.error) ? data.error as keyof typeof copy : 'unavailable';
          showStatus(submitStatus, error);
        }
      } catch {
        showStatus(submitStatus, 'unavailable');
      } finally {
        textFields.forEach((field) => { field.readOnly = false; });
        submit.disabled = false;
      }
    });
  }
  attachForm(form);
}
