const DB_KEY = 'merge_links_dashboard_v1';
const MAX_LINKS_PER_GROUP = 500;

const dashboard = document.getElementById('dashboard');
const goView = document.getElementById('goView');

const newBtn = document.getElementById('newBtn');
const sampleBtn = document.getElementById('sampleBtn');
const exportBtn = document.getElementById('exportBtn');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

const editorPanel = document.getElementById('editorPanel');
const editorTitle = document.getElementById('editorTitle');
const titleInput = document.getElementById('titleInput');
const linksInput = document.getElementById('linksInput');
const generatedLink = document.getElementById('generatedLink');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const copyGeneratedBtn = document.getElementById('copyGeneratedBtn');
const statusEl = document.getElementById('status');

const metricGroups = document.getElementById('metricGroups');
const metricLinks = document.getElementById('metricLinks');
const metricClicks = document.getElementById('metricClicks');
const listMeta = document.getElementById('listMeta');
const tableBody = document.getElementById('tableBody');

const goTitle = document.getElementById('goTitle');
const goStatus = document.getElementById('goStatus');
const goList = document.getElementById('goList');
const openAllBtn = document.getElementById('openAllBtn');
const copyGoBtn = document.getElementById('copyGoBtn');

let records = [];
let editingId = null;

function nowIso() {
  return new Date().toISOString();
}

function shortCode() {
  return Math.random().toString(36).slice(2, 8);
}

function displayTime(iso) {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return '-';
  }
}

function setStatus(text, isWarn = false) {
  if (!statusEl) return;
  statusEl.style.color = isWarn ? '#b26c16' : '#52708c';
  statusEl.textContent = text;
}

function setGoStatus(text, isWarn = false) {
  if (!goStatus) return;
  goStatus.style.color = isWarn ? '#b26c16' : '#52708c';
  goStatus.textContent = text;
}

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDb() {
  localStorage.setItem(DB_KEY, JSON.stringify(records));
}

function normalizeUrl(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const withProtocol = /^(https?:)?\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const u = new URL(withProtocol);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return u.toString();
  } catch {
    return '';
  }
}

function parseLinks(rawText) {
  const rows = String(rawText || '')
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);

  const valid = rows.map(normalizeUrl).filter(Boolean);
  return [...new Set(valid)].slice(0, MAX_LINKS_PER_GROUP);
}

function createRecord(title, links) {
  const code = shortCode();
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    code,
    title: String(title || '').trim() || '未命名链接合集',
    links,
    clicks: 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function toShortUrl(code) {
  return `${location.origin}${location.pathname}#go=${code}`;
}

function filteredSortedRecords() {
  const q = String(searchInput?.value || '').toLowerCase().trim();
  const sortBy = String(sortSelect?.value || 'new');

  let out = records.filter((item) => {
    if (!q) return true;
    if (item.title.toLowerCase().includes(q)) return true;
    if (item.code.toLowerCase().includes(q)) return true;
    return item.links.some((u) => u.toLowerCase().includes(q));
  });

  if (sortBy === 'click') {
    out = out.sort((a, b) => b.clicks - a.clicks);
  } else if (sortBy === 'count') {
    out = out.sort((a, b) => b.links.length - a.links.length);
  } else {
    out = out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return out;
}

function refreshMetrics() {
  const groups = records.length;
  const links = records.reduce((sum, r) => sum + r.links.length, 0);
  const clicks = records.reduce((sum, r) => sum + Number(r.clicks || 0), 0);

  metricGroups.textContent = String(groups);
  metricLinks.textContent = String(links);
  metricClicks.textContent = String(clicks);
}

function renderTable() {
  const list = filteredSortedRecords();
  tableBody.innerHTML = '';
  listMeta.textContent = `${list.length} 笔`;

  if (!list.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="7">暂无数据，请点击「新增短网址」。</td>';
    tableBody.appendChild(tr);
    return;
  }

  const frag = document.createDocumentFragment();

  list.forEach((item, idx) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="url-cell mono">${toShortUrl(item.code)}</td>
      <td>${item.title}</td>
      <td>${item.links.length}</td>
      <td>${item.clicks}</td>
      <td>${displayTime(item.createdAt)}</td>
      <td>
        <button class="btn btn-primary" data-action="open" data-id="${item.id}">打开</button>
        <button class="btn btn-light" data-action="copy" data-id="${item.id}">复制</button>
        <button class="btn btn-warn" data-action="edit" data-id="${item.id}">修改</button>
        <button class="btn btn-danger" data-action="delete" data-id="${item.id}">删除</button>
      </td>
    `;

    frag.appendChild(tr);
  });

  tableBody.appendChild(frag);
}

function openEditor(record = null) {
  editorPanel.classList.remove('hide');

  if (record) {
    editingId = record.id;
    editorTitle.textContent = '修改短网址';
    titleInput.value = record.title;
    linksInput.value = record.links.join('\n');
    generatedLink.value = toShortUrl(record.code);
    setStatus('已载入数据，可直接修改后保存。');
  } else {
    editingId = null;
    editorTitle.textContent = '新增短网址';
    titleInput.value = '';
    linksInput.value = '';
    generatedLink.value = '';
    setStatus('请输入标题和链接，每行一个。');
  }
}

function closeEditor() {
  editorPanel.classList.add('hide');
  editingId = null;
  setStatus('');
}

async function copyText(value, okMsg, failMsg) {
  try {
    await navigator.clipboard.writeText(value);
    setStatus(okMsg);
    setGoStatus(okMsg);
  } catch {
    setStatus(failMsg, true);
    setGoStatus(failMsg, true);
  }
}

function saveRecord() {
  const title = titleInput.value;
  const links = parseLinks(linksInput.value);

  if (!links.length) {
    setStatus('没有可用链接，无法保存。', true);
    return;
  }

  if (editingId) {
    const target = records.find((r) => r.id === editingId);
    if (!target) {
      setStatus('目标记录不存在，请重试。', true);
      return;
    }

    target.title = String(title || '').trim() || '未命名链接合集';
    target.links = links;
    target.updatedAt = nowIso();
    generatedLink.value = toShortUrl(target.code);
    setStatus(`更新成功，共 ${links.length} 条链接。`);
  } else {
    const rec = createRecord(title, links);
    records.push(rec);
    generatedLink.value = toShortUrl(rec.code);
    setStatus(`新增成功，共 ${links.length} 条链接。`);
    editingId = rec.id;
  }

  saveDb();
  refreshMetrics();
  renderTable();
}

function removeRecord(id) {
  const target = records.find((r) => r.id === id);
  if (!target) return;

  if (!confirm(`确定要删除「${target.title}」吗？`)) return;
  records = records.filter((r) => r.id !== id);
  saveDb();
  refreshMetrics();
  renderTable();
  setStatus('已删除。');
}

function bindTableActions() {
  tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const item = records.find((r) => r.id === id);
    if (!item) return;

    if (action === 'open') {
      window.open(toShortUrl(item.code), '_blank', 'noopener,noreferrer');
      return;
    }

    if (action === 'copy') {
      copyText(toShortUrl(item.code), '短网址已复制。', '复制失败，请手动复制。');
      return;
    }

    if (action === 'edit') {
      openEditor(item);
      return;
    }

    if (action === 'delete') {
      removeRecord(item.id);
    }
  });
}

function addSample() {
  const sample = createRecord('WhatsApp 验证合集', [
    'https://wa.me/14407668557?text=Startverification',
    'https://wa.me/17165277977?text=Startverification',
    'https://wa.me/15307218015?text=Startverification',
    'https://wa.me/17693278419?text=Startverification',
    'https://wa.me/14028288095?text=Startverification'
  ]);

  sample.clicks = 108;
  records.push(sample);
  saveDb();
  refreshMetrics();
  renderTable();
  setStatus('已添加示例数据。');
}

function exportJson() {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `merge_links_export_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function initDashboard() {
  records = loadDb();
  refreshMetrics();
  renderTable();
  bindTableActions();

  newBtn.addEventListener('click', () => openEditor());
  sampleBtn.addEventListener('click', addSample);
  exportBtn.addEventListener('click', exportJson);
  saveBtn.addEventListener('click', saveRecord);
  cancelBtn.addEventListener('click', closeEditor);

  copyGeneratedBtn.addEventListener('click', () => {
    if (!generatedLink.value) {
      setStatus('暂无可复制短网址，请先保存。', true);
      return;
    }
    copyText(generatedLink.value, '短网址已复制。', '复制失败，请手动复制。');
  });

  searchInput.addEventListener('input', renderTable);
  sortSelect.addEventListener('change', renderTable);
}

function findByCode(code) {
  records = loadDb();
  return records.find((r) => String(r.code) === String(code));
}

function renderGoRows(links) {
  goList.innerHTML = '';

  if (!links.length) {
    const row = document.createElement('div');
    row.className = 'go-row';
    row.innerHTML = '<div>-</div><div>暂无可用链接</div><div></div>';
    goList.appendChild(row);
    return;
  }

  const frag = document.createDocumentFragment();

  links.forEach((url, i) => {
    const row = document.createElement('div');
    row.className = 'go-row';

    const idx = document.createElement('div');
    idx.textContent = String(i + 1);

    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = url;

    const btn = document.createElement('button');
    btn.className = 'btn btn-light';
    btn.textContent = '打开';
    btn.addEventListener('click', () => {
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    row.appendChild(idx);
    row.appendChild(a);
    row.appendChild(btn);
    frag.appendChild(row);
  });

  goList.appendChild(frag);
}

function openAllLinks(links) {
  links.forEach((url, i) => {
    setTimeout(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    }, i * 240);
  });
}

function initGoMode(code) {
  const target = findByCode(code);

  dashboard.style.display = 'none';
  goView.style.display = 'block';

  if (!target) {
    goTitle.textContent = '链接不存在';
    setGoStatus('未找到此短网址，可能已被删除。', true);
    renderGoRows([]);
    return;
  }

  target.clicks = Number(target.clicks || 0) + 1;
  target.updatedAt = nowIso();

  const idx = records.findIndex((r) => r.id === target.id);
  if (idx !== -1) records[idx] = target;
  saveDb();

  goTitle.textContent = target.title;
  setGoStatus(`已载入，共 ${target.links.length} 条链接。`);
  renderGoRows(target.links);

  openAllBtn.addEventListener('click', () => {
    if (!target.links.length) return;
    openAllLinks(target.links);
    setGoStatus('正在尝试连续打开全部链接（浏览器可能拦截部分弹窗）。');
  });

  copyGoBtn.addEventListener('click', () => {
    copyText(location.href, '本页地址已复制。', '复制失败，请手动复制。');
  });
}

function boot() {
  const hash = location.hash || '';
  const matched = hash.match(/^#go=([a-z0-9]{4,10})$/i);

  if (matched && matched[1]) {
    initGoMode(matched[1]);
    return;
  }

  dashboard.style.display = 'block';
  goView.style.display = 'none';
  initDashboard();
}

boot();
