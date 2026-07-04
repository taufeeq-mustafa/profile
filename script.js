/* ============================================
   Router + CLI + Markdown blog
   ============================================ */

const $ = (sel) => document.querySelector(sel);
const views = document.querySelectorAll('.view');

/* ---------- theme ---------- */
const root = document.documentElement;
root.dataset.theme = localStorage.getItem('theme') || 'dark';

function toggleTheme() {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', root.dataset.theme);
}
$('#theme-toggle').addEventListener('click', toggleTheme);

/* ---------- blog data ---------- */
let posts = null; // [{slug, title, date, summary, cover?}]

async function loadPosts() {
    if (posts) return posts;
    const res = await fetch('posts/posts.json');
    posts = await res.json();
    return posts;
}

/* ---------- tiny markdown renderer ----------
   ponytail: covers headings, lists, code, images, links, bold/italic,
   blockquotes. Swap for marked.js if posts outgrow it. */
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMd(s) {
    return s
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderMarkdown(md) {
    const lines = md.split(/\r?\n/);
    const out = [];
    let list = null;   // 'ul' | 'ol'
    let para = [];

    const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
    const closePara = () => {
        if (para.length) { out.push(`<p>${inlineMd(para.join(' '))}</p>`); para = []; }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // fenced code block
        if (line.startsWith('```')) {
            closePara(); closeList();
            const code = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
            out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
            continue;
        }

        const h = line.match(/^(#{1,3})\s+(.*)/);
        if (h) {
            closePara(); closeList();
            out.push(`<h${h[1].length}>${inlineMd(h[2])}</h${h[1].length}>`);
            continue;
        }
        if (/^>\s?/.test(line)) {
            closePara(); closeList();
            out.push(`<blockquote><p>${inlineMd(line.replace(/^>\s?/, ''))}</p></blockquote>`);
            continue;
        }
        const ul = line.match(/^[-*]\s+(.*)/);
        const ol = line.match(/^\d+\.\s+(.*)/);
        if (ul || ol) {
            closePara();
            const type = ul ? 'ul' : 'ol';
            if (list !== type) { closeList(); out.push(`<${type}>`); list = type; }
            out.push(`<li>${inlineMd((ul || ol)[1])}</li>`);
            continue;
        }
        if (line.trim() === '') { closePara(); closeList(); continue; }
        para.push(line.trim());
    }
    closePara(); closeList();
    return out.join('\n');
}

/* ---------- views ---------- */
function showView(name) {
    let found = false;
    views.forEach(v => {
        const match = v.dataset.view === name;
        v.hidden = !match;
        if (match) found = true;
    });
    if (!found) showView('404');
    document.querySelectorAll('.topnav a').forEach(a =>
        a.classList.toggle('active', a.getAttribute('href') === `#/${name}`));
    window.scrollTo(0, 0);
}

async function renderBlogList() {
    const el = $('#blog-list');
    try {
        const list = await loadPosts();
        if (!list.length) { el.innerHTML = '<p class="muted mono">no posts yet.</p>'; return; }
        el.innerHTML = list.map(p => `
            <a class="card blog-item" href="#/blog/${p.slug}">
                ${p.cover ? `<img class="blog-cover" src="${p.cover}" alt="" loading="lazy">` : ''}
                <h3>${p.title}</h3>
                <div class="post-meta">${p.date}</div>
                <p>${p.summary || ''}</p>
            </a>`).join('');
    } catch {
        el.innerHTML = '<p class="muted mono">could not load posts (serve the site over http, not file://).</p>';
    }
}

async function renderPost(slug) {
    const el = $('#post-content');
    el.innerHTML = '<p class="muted mono">loading…</p>';
    try {
        const list = await loadPosts();
        const meta = list.find(p => p.slug === slug);
        if (!meta) { showView('404'); return; }
        const md = await (await fetch(`posts/${slug}.md`)).text();
        document.title = `${meta.title} — Taufeeq Mustafa`;
        el.innerHTML = `<h1>${meta.title}</h1><div class="post-meta">${meta.date}</div>` + renderMarkdown(md);
    } catch {
        el.innerHTML = '<p class="muted mono">could not load post.</p>';
    }
}

function route() {
    const hash = location.hash.replace(/^#\/?/, ''); // '' | 'about' | 'blog' | 'blog/slug'
    const [page, slug] = hash.split('/');
    document.title = 'Syed Taufeeq Mustafa — AI/ML Engineer';
    if (!page) { showView('home'); return; }
    if (page === 'blog' && slug) { showView('post'); renderPost(slug); return; }
    if (page === 'blog') { showView('blog'); renderBlogList(); return; }
    showView(page);
}
window.addEventListener('hashchange', route);
route();

/* ---------- CLI ---------- */
const input = $('#cli-input');
const output = $('#cli-output');
const history = [];
let histIdx = -1;

const commands = {
    help: () => [
        'commands:',
        '  home | about | experience | projects | skills | blog',
        '  open <n|slug>   open blog post by number or slug',
        '  theme           toggle dark/light',
        '  resume          download resume',
        '  github | linkedin | email',
        '  clear           clear output',
    ].join('\n'),
    home:       () => { location.hash = '#/'; return 'cd ~'; },
    about:      () => { location.hash = '#/about'; return 'cd ~/about'; },
    experience: () => { location.hash = '#/experience'; return 'cd ~/experience'; },
    exp:        () => commands.experience(),
    projects:   () => { location.hash = '#/projects'; return 'cd ~/projects'; },
    skills:     () => { location.hash = '#/skills'; return 'cd ~/skills'; },
    blog:       () => { location.hash = '#/blog'; return 'cd ~/blog'; },
    theme:      () => { toggleTheme(); return `theme: ${root.dataset.theme}`; },
    resume:     () => { window.open('Taufeeq Resume.pdf'); return 'opening resume…'; },
    github:     () => { window.open('https://github.com/taufeeq-mustafa'); return 'opening github…'; },
    linkedin:   () => { window.open('https://www.linkedin.com/in/s-taufeeq-mustafa-281a13221/'); return 'opening linkedin…'; },
    email:      () => { location.href = 'mailto:taufeeq.mustafa@gmail.com'; return 'taufeeq.mustafa@gmail.com'; },
    whoami:     () => 'Syed Taufeeq Mustafa — Backend AI Engineer, Karachi',
    clear:      () => { output.hidden = true; output.textContent = ''; return null; },
    ls:         () => 'home  about  experience  projects  skills  blog',
    open: async (arg) => {
        if (!arg) return 'usage: open <number|slug>  (see blog page for posts)';
        const list = await loadPosts().catch(() => []);
        const post = /^\d+$/.test(arg) ? list[Number(arg) - 1] : list.find(p => p.slug === arg);
        if (!post) return `no post: ${arg}`;
        location.hash = `#/blog/${post.slug}`;
        return `opening ${post.slug}…`;
    },
};

function print(text, cls = '') {
    output.hidden = false;
    const span = document.createElement('span');
    if (cls) span.className = cls;
    span.textContent = text + '\n';
    output.appendChild(span);
    output.scrollTop = output.scrollHeight;
}

async function run(raw) {
    const line = raw.trim();
    if (!line) return;
    print(`❯ ${line}`);
    const [cmd, ...args] = line.toLowerCase().split(/\s+/);
    const fn = commands[cmd];
    if (!fn) { print(`command not found: ${cmd} — try 'help'`, 'err'); return; }
    const result = await fn(args.join(' '));
    if (result) print(result, 'ok');
}

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const val = input.value;
        input.value = '';
        if (val.trim()) { history.push(val); histIdx = history.length; }
        run(val);
    } else if (e.key === 'ArrowUp') {
        if (histIdx > 0) input.value = history[--histIdx];
        e.preventDefault();
    } else if (e.key === 'ArrowDown') {
        input.value = histIdx < history.length - 1 ? history[++histIdx] : (histIdx = history.length, '');
        e.preventDefault();
    } else if (e.key === 'Tab') {
        e.preventDefault();
        const partial = input.value.toLowerCase();
        if (!partial) return;
        const match = Object.keys(commands).filter(c => c.startsWith(partial));
        if (match.length === 1) input.value = match[0] + ' ';
        else if (match.length > 1) print(match.join('  '));
    } else if (e.key === 'Escape') {
        input.blur();
    }
});

// '/' or Ctrl+K focuses the CLI from anywhere
document.addEventListener('keydown', (e) => {
    if (e.target === input) return;
    if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        input.focus();
    }
});
