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

/* ---------- copy email on "let's talk" ---------- */
$('#copy-email').addEventListener('click', async (e) => {
    e.preventDefault();
    await navigator.clipboard.writeText('taufeeq.mustafa@gmail.com');
    const el = e.currentTarget;
    el.innerHTML = '<strong>email copied ✓</strong>';
    setTimeout(() => { el.innerHTML = '<strong>let\'s talk</strong>'; }, 1500);
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
        document.title = `${meta.title} | Taufeeq Mustafa`;
        el.innerHTML = `<h1>${meta.title}</h1><div class="post-meta">${meta.date}</div>` + html;
    } catch {
        el.innerHTML = '<p class="muted">Could not load post.</p>';
    }
}

/* ---------- sudoku ---------- */
(function sudoku() {
    const gridEl = $('#sudoku-grid');
    if (!gridEl) return;
    const statusEl = $('#sudoku-status');
    const diffEl = $('#sudoku-diff');

    let solution = [], vals = [], given = [], sel = -1;
    let startTime = 0, timerId = null, done = false;

    const shuffle = (a) => a.sort(() => Math.random() - 0.5);

    /* valid solved grid via band/row/digit shuffling of the canonical pattern */
    function generateSolution() {
        const digits = shuffle([1,2,3,4,5,6,7,8,9]);
        const order = () => shuffle([0,1,2]).flatMap(b => shuffle([0,1,2]).map(i => b * 3 + i));
        const rows = order(), cols = order();
        const g = [];
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++)
                g[r * 9 + c] = digits[(3 * (rows[r] % 3) + Math.floor(rows[r] / 3) + cols[c]) % 9];
        return g;
    }

    /* ponytail: removal doesn't guarantee a unique solution; any conflict-free
       fill counts as a win, so that's fair. Add a uniqueness solver if it matters. */
    function newGame() {
        solution = generateSolution();
        vals = solution.slice();
        given = new Array(81).fill(true);
        const holes = Number(diffEl.value);
        shuffle([...Array(81).keys()]).slice(0, holes).forEach(i => {
            vals[i] = 0;
            given[i] = false;
        });
        sel = -1;
        done = false;
        startTime = Date.now();
        clearInterval(timerId);
        timerId = setInterval(updateStatus, 1000);
        render();
        updateStatus();
    }

    const fmt = (ms) => {
        const s = Math.floor(ms / 1000);
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };

    function updateStatus(msg) {
        const best = localStorage.getItem('sudoku-best-' + diffEl.value);
        statusEl.textContent = (msg || fmt(Date.now() - startTime)) + (best ? ` · best ${fmt(+best)}` : '');
    }

    function conflicts() {
        const bad = new Set();
        const units = [];
        for (let i = 0; i < 9; i++) {
            units.push([...Array(9).keys()].map(c => i * 9 + c));                       // row
            units.push([...Array(9).keys()].map(r => r * 9 + i));                       // col
            const br = Math.floor(i / 3) * 3, bc = (i % 3) * 3;                         // box
            units.push([...Array(9).keys()].map(k => (br + Math.floor(k / 3)) * 9 + bc + k % 3));
        }
        for (const u of units) {
            const seen = {};
            for (const i of u) {
                if (!vals[i]) continue;
                if (seen[vals[i]] !== undefined) { bad.add(i); bad.add(seen[vals[i]]); }
                else seen[vals[i]] = i;
            }
        }
        return bad;
    }

    /* build cells once */
    for (let i = 0; i < 81; i++) {
        const d = document.createElement('div');
        d.className = 'cell';
        if (i % 9 % 3 === 0 && i % 9 !== 0) d.classList.add('bl');
        if (Math.floor(i / 9) % 3 === 0 && i >= 9) d.classList.add('bt');
        d.addEventListener('click', () => {
            if (!given[i]) { sel = i; render(); }
            gridEl.focus();
        });
        gridEl.appendChild(d);
    }
    const cells = gridEl.children;

    function render() {
        const bad = conflicts();
        for (let i = 0; i < 81; i++) {
            const c = cells[i];
            c.textContent = vals[i] || '';
            c.classList.toggle('given', given[i]);
            c.classList.toggle('sel', i === sel);
            c.classList.toggle('conflict', bad.has(i));
        }
        if (!done && vals.every(Boolean) && bad.size === 0) {
            done = true;
            clearInterval(timerId);
            const time = Date.now() - startTime;
            const key = 'sudoku-best-' + diffEl.value;
            const best = localStorage.getItem(key);
            if (!best || time < +best) localStorage.setItem(key, time);
            updateStatus(`Solved in ${fmt(time)} 🎉`);
        }
    }

    function setCell(n) {
        if (done || sel < 0 || given[sel]) return;
        vals[sel] = n;
        render();
    }

    gridEl.addEventListener('keydown', (e) => {
        if (e.key >= '1' && e.key <= '9') { setCell(+e.key); e.preventDefault(); }
        else if (['Backspace', 'Delete', '0'].includes(e.key)) { setCell(0); e.preventDefault(); }
        else if (e.key.startsWith('Arrow') && sel >= 0) {
            const move = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
            const next = sel + move;
            if (next >= 0 && next < 81) { sel = next; render(); }
            e.preventDefault();
        }
    });

    $('#sudoku-pad').addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        setCell(e.target.textContent === '✕' ? 0 : +e.target.textContent);
        gridEl.focus();
    });

    $('#sudoku-new').addEventListener('click', newGame);
    diffEl.addEventListener('change', newGame);

    /* start the first game (and its timer) only when the tab is opened */
    let started = false;
    function maybeStart() {
        if (!started && location.hash.startsWith('#/game')) { started = true; newGame(); }
    }
    window.addEventListener('hashchange', maybeStart);
    maybeStart();
})();

function route() {
    const hash = location.hash.replace(/^#\/?/, ''); // '' | 'about' | 'blog' | 'blog/slug'
    const [page, slug] = hash.split('/');
    document.title = 'Syed Taufeeq Mustafa | AI/ML Engineer';
    if (!page) { showView('home'); return; }
    if (page === 'blog' && slug) { showView('post'); renderPost(slug); return; }
    if (page === 'blog') { showView('blog'); renderBlogList(); return; }
    showView(page);
}
window.addEventListener('hashchange', route);
route();
