// ...existing code...
/* Módulo principal: navegación SPA, fetch repos, tema y SW */
const state = {
  theme: localStorage.getItem('theme') || (matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  currentUser: localStorage.getItem('gh_user') || 'octocat',
  repos: []
};

const views = ['home','repos','about','contact'];
const el = id => document.getElementById(id);

// Inicialización
function init(){
  applyTheme(state.theme);
  bindUI();
  router(); // render initial view
  window.addEventListener('hashchange', router);
  // cargar repos iniciales
  loadRepos(state.currentUser);
  // registrar service worker
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('js/sw.js').catch(()=>{/* silent */});
  }
}

function bindUI(){
  // nav toggle
  const nav = document.querySelector('.nav');
  const navToggle = el('navToggle');
  navToggle.addEventListener('click', ()=> nav.classList.toggle('show'));

  // theme toggle
  const themeToggle = el('themeToggle');
  themeToggle.addEventListener('click', ()=>{
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    applyTheme(state.theme);
  });

  // repos controls
  el('fetchBtn').addEventListener('click', ()=>{
    const user = el('username').value.trim() || state.currentUser;
    state.currentUser = user;
    localStorage.setItem('gh_user', user);
    loadRepos(user);
  });
  el('repoFilter').addEventListener('input', e => renderRepos(filterRepos(e.target.value)));

  // contact form
  const form = el('contactForm');
  form.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const name = el('cname').value.trim();
    const email = el('cemail').value.trim();
    const msg = el('cmessage').value.trim();
    if(!name || !email || !msg){ el('contactStatus').textContent = 'Completa todos los campos.'; return; }
    // Simular envío: guardar en localStorage
    const subs = JSON.parse(localStorage.getItem('contact_subs') || '[]');
    subs.push({name,email,msg,at:new Date().toISOString()});
    localStorage.setItem('contact_subs', JSON.stringify(subs));
    el('contactStatus').textContent = 'Mensaje guardado (simulado).';
    form.reset();
  });

  // SPA link smooth
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', ()=> {
      if(nav.classList && nav.classList.contains('show')) nav.classList.remove('show');
    });
  });
}

function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  el('themeToggle').textContent = t === 'dark' ? '☀️' : '🌙';
}

function router(){
  const hash = location.hash.replace(/^#\/?/, '') || 'home';
  views.forEach(v => {
    const node = el(v);
    if(!node) return;
    node.hidden = v !== hash;
  });
}

// Fetch repos from GitHub
async function loadRepos(user){
  const status = el('repoStatus');
  const list = el('repoList');
  status.textContent = 'Cargando...';
  list.innerHTML = '';
  try{
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100`);
    if(!res.ok) throw new Error('Usuario no encontrado o límite API');
    const data = await res.json();
    state.repos = data.sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at));
    renderRepos(state.repos);
    status.textContent = `Resultados para ${user}: ${state.repos.length} repos.`;
  }catch(err){
    status.textContent = `Error: ${err.message}`;
  }
}

function renderRepos(items){
  const list = el('repoList');
  if(!items || items.length === 0){
    list.innerHTML = '<p class="muted">No hay repos para mostrar.</p>';
    return;
  }
  list.innerHTML = items.map(r=> `
    <article class="card" aria-labelledby="r-${r.id}">
      <h3 id="r-${r.id}">${escapeHtml(r.name)}</h3>
      <p class="muted">${escapeHtml(r.description || 'Sin descripción')}</p>
      <div class="muted">★ ${r.stargazers_count} • ${r.language || '—'}</div>
      <a href="${r.html_url}" target="_blank" rel="noopener">Ver en GitHub</a>
    </article>
  `).join('');
  return items;
}

function filterRepos(term){
  if(!term) return state.repos;
  const q = term.toLowerCase();
  return state.repos.filter(r => (r.name||'').toLowerCase().includes(q) || (r.description||'').toLowerCase().includes(q));
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

document.addEventListener('DOMContentLoaded', init);