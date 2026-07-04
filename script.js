/* ============================================
   Router + theme + Markdown blog
   ============================================ */

const $ = (sel) => document.querySelector(sel);
const views = document.querySelectorAll('.view');

/* ---------- theme ---------- */
const root = document.documentElement;
root.dataset.theme = localStorage.getItem('theme') || 'light';

$('#theme-toggle').addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', root.dataset.theme);
});

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
        a.classList.toggle('active', a.getAttribute('href') === (name === 'home' ? '#/' : `#/${name}`)));
    window.scrollTo(0, 0);
}

async function renderBlogList() {
    const el = $('#blog-list');
    try {
        const list = await loadPosts();
        if (!list.length) { el.innerHTML = '<p class="muted">No posts yet.</p>'; return; }
        el.innerHTML = list.map(p => `
            <a class="card blog-item" href="#/blog/${p.slug}">
                ${p.cover ? `<img class="blog-cover" src="${p.cover}" alt="" loading="lazy">` : ''}
                <h3>${p.title}</h3>
                <div class="post-meta">${p.date}</div>
                <p>${p.summary || ''}</p>
            </a>`).join('');
    } catch {
        el.innerHTML = '<p class="muted">Could not load posts (serve the site over http, not file://).</p>';
    }
}

async function renderPost(slug) {
    const el = $('#post-content');
    el.innerHTML = '<p class="muted">Loading…</p>';
    try {
        const list = await loadPosts();
        const meta = list.find(p => p.slug === slug);
        if (!meta) { showView('404'); return; }
        const md = await (await fetch(`posts/${slug}.md`)).text();
        document.title = `${meta.title} — Taufeeq Mustafa`;
        el.innerHTML = `<h1>${meta.title}</h1><div class="post-meta">${meta.date}</div>` + renderMarkdown(md);
    } catch {
        el.innerHTML = '<p class="muted">Could not load post.</p>';
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
