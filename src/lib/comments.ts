type Comment = { id: number; name: string; body: string; created_at: string };

const copy = {
  loading: ['正在载入留言……', 'Loading comments…'],
  empty: ['还没有留言。', 'No comments yet.'],
  load_error: ['留言载入失败。', 'Could not load comments.'],
  reviewing: ['正在审核……', 'Reviewing your comment…'],
  published: ['留言已发布。', 'Comment published.'],
  content_violation: ['内容违规，留言未发布。请修改后重试。', 'Your comment violates the posting rules. Please edit it and try again.'],
  paused: ['留言暂时关闭，已发布的留言仍可阅读。', 'New comments are paused. Published comments are still available.'],
  hidden: ['这条留言已被隐藏。', 'This comment has been hidden.'],
  rate_limit: ['提交太频繁，请稍等一分钟再试。', 'Too many submissions. Please wait a minute and try again.'],
  invalid: ['请检查昵称和留言内容后重试。', 'Please check your display name and comment and try again.'],
  unavailable: ['暂时无法审核，留言尚未发布，请稍后重试。', 'The review service is temporarily unavailable. Please try again later.'],
} as const;

const languages = ['zh', 'en'] as const;
const dateFormats = [new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }), new Intl.DateTimeFormat('en', { dateStyle: 'medium' })];

function showStatus(element: HTMLElement, message?: keyof typeof copy) {
  element.dataset.state = message ?? '';
  element.replaceChildren(...(message ? languages.map((lang, index) => {
    const span = document.createElement('span');
    span.className = `zl-${lang}`;
    span.textContent = copy[message][index];
    return span;
  }) : []));
}

export function initComments(root: HTMLElement) {
  const endpoint = new URL(root.dataset.endpoint!, document.baseURI);
  endpoint.searchParams.set('page', root.dataset.page!);
  const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const form = find<HTMLFormElement>('form');
  const submit = find<HTMLButtonElement>('[type="submit"]');
  const submitStatus = find('[data-submit-status]');
  const listStatus = find('[data-list-status]');
  const list = find<HTMLOListElement>('[data-comment-list]');
  const template = find<HTMLTemplateElement>('[data-comment-template]');
  const more = find<HTMLButtonElement>('[data-more]');
  const moreLabel = find('[data-more-label]');
  const retryLabel = find('[data-retry-label]');
  const displayed = new Set<number>();
  let before: number | null = null;
  let submission: { id: string; name: string; body: string } | undefined;

  function render(comment: Comment, prepend = false) {
    if (displayed.has(comment.id)) return;
    displayed.add(comment.id);
    const node = template.content.cloneNode(true) as DocumentFragment;
    if (comment.name) node.querySelector('[data-author]')!.textContent = comment.name;
    node.querySelector('[data-body]')!.textContent = comment.body;
    languages.forEach((lang, index) => {
      const time = node.querySelector<HTMLTimeElement>(`[data-date-${lang}]`)!;
      time.dateTime = comment.created_at;
      time.textContent = dateFormats[index].format(new Date(comment.created_at));
    });
    if (prepend) list.prepend(node);
    else list.append(node);
  }

  async function load() {
    more.disabled = true;
    showStatus(listStatus, 'loading');
    const url = new URL(endpoint);
    if (before !== null) url.searchParams.set('before', String(before));

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Unable to load comments');
      const data: { comments: Comment[]; next: number | null } = await response.json();
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

  submit.disabled = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    const fields = new FormData(form);
    const name = String(fields.get('nickname') ?? '').trim();
    const body = String(fields.get('body') ?? '').trim();
    if (!body) {
      showStatus(submitStatus, 'invalid');
      return;
    }
    if (!submission || submission.name !== name || submission.body !== body) {
      submission = { id: crypto.randomUUID(), name, body };
    }

    const textFields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'));
    textFields.forEach((field) => { field.readOnly = true; });
    submit.disabled = true;
    showStatus(submitStatus, 'reviewing');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, name, body, website: fields.get('website') }),
      });
      const data = await response.json();
      if (response.ok) {
        render(data.comment, true);
        form.reset();
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
