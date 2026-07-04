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
        const html = await (await fetch(`posts/${slug}.html`)).text();
        document.title = `${meta.title} — Taufeeq Mustafa`;
        el.innerHTML = `<h1>${meta.title}</h1><div class="post-meta">${meta.date}</div>` + html;
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
