'use strict';

const DATA_FILES = [
  'site_meta',
  'indicators',
  'topics',
  'trend_current',
  'trend_archive',
  'papers',
  'sources',
  'policy_links',
  'discussion_archive',
  'evidence_records',
  'polls',
  'social_hot_topics',
  'hotspot_analysis',
  'hotspot_timeseries',
  'insight_digest',
  'editorial_watchlist',
  'live_config',
  'reports',
  'theme_media'
];
const TOPIC_NAMES = {
  all: '全部议题',
  education: '教育',
  healthcare: '医疗',
  housing: '住房',
  technology: '科技',
  elderly: '养老',
  food: '食品',
  employment: '就业',
  livelihood: '民生'
};
const TYPE_NAMES = {
  all: '全部类型',
  trend: '热点快照',
  evidence: '证据库',
  paper: '论文卡片',
  discussion: '讨论摘录',
  social: '社媒热榜',
  report: '报告库',
  investigating: '调查中',
  context: '背景说明',
  exposed: '问题暴露'
};
const REPORT_CATEGORY_NAMES = {
  'official-data': '官方统计',
  'official-yearbook': '统计年鉴',
  'official-report': '官方报告',
  'academic-survey': '学术调查',
  'research-report': '研究项目'
};
const VOTE_STORAGE_KEY = 'minsheng_observer_votes_v1';
const SUGGESTION_STORAGE_KEY = 'minsheng_observer_suggestions_v1';
const THEME_STORAGE_KEY = 'minsheng_observer_theme_v1';
let systemThemeWatcherBound = false;

const html = String.raw;
const CHART_THEME_PALETTES = {
  cyber: {
    cyan: '#9bffe4',
    pink: '#63f3c8',
    amber: '#d8ff7a',
    green: '#76ffd5',
    violet: '#4bd6ae',
    orange: '#bfff86',
    red: '#8cffb1',
    cyanSoft: 'rgba(155,255,228,0.18)',
    pinkSoft: 'rgba(99,243,200,0.18)',
    greenSoft: 'rgba(118,255,213,0.16)',
    redSoft: 'rgba(140,255,177,0.14)',
    violetSoft: 'rgba(75,214,174,0.16)',
    light: '#ebfff6',
    text: '#dafef1',
    legend: '#edfff8',
    grid: 'rgba(118,255,213,0.12)',
    border: 'rgba(118,255,213,0.16)',
    ticks: '#b8f6e3',
    tooltipBg: 'rgba(3, 16, 17, 0.94)',
    tooltipBorder: 'rgba(118,255,213,0.2)',
    tooltipBody: '#eafff7'
  },
  ancient: {
    cyan: '#8fdfff',
    pink: '#ffc6df',
    amber: '#ffd89c',
    green: '#b7f0d1',
    violet: '#d6b8ff',
    orange: '#ffb990',
    red: '#ffadbc',
    cyanSoft: 'rgba(143,223,255,0.18)',
    pinkSoft: 'rgba(255,198,223,0.18)',
    greenSoft: 'rgba(183,240,209,0.16)',
    redSoft: 'rgba(255,173,188,0.14)',
    violetSoft: 'rgba(214,184,255,0.14)',
    light: '#fff7ef',
    text: '#f4e8e0',
    legend: '#fff4eb',
    grid: 'rgba(255,221,200,0.12)',
    border: 'rgba(255,221,200,0.16)',
    ticks: '#f3ddd0',
    tooltipBg: 'rgba(26, 19, 30, 0.94)',
    tooltipBorder: 'rgba(255,210,190,0.18)',
    tooltipBody: '#fff3ea'
  },
  future: {
    cyan: '#8ffff0',
    pink: '#87b8ff',
    amber: '#afffff',
    green: '#5bffbe',
    violet: '#4ca8ff',
    orange: '#79fff2',
    red: '#84ffd8',
    cyanSoft: 'rgba(143,255,240,0.18)',
    pinkSoft: 'rgba(135,184,255,0.18)',
    greenSoft: 'rgba(91,255,190,0.16)',
    redSoft: 'rgba(132,255,216,0.14)',
    violetSoft: 'rgba(76,168,255,0.16)',
    light: '#ecffff',
    text: '#dffbff',
    legend: '#efffff',
    grid: 'rgba(91,255,190,0.12)',
    border: 'rgba(91,255,190,0.16)',
    ticks: '#bfeeed',
    tooltipBg: 'rgba(2, 10, 22, 0.94)',
    tooltipBorder: 'rgba(91,255,190,0.18)',
    tooltipBody: '#eaffff'
  }
};
const THEME_LABELS = {
  system: '跟随系统',
  cyber: '赛博朋克',
  ancient: '完全古风',
  future: '未来世界'
};
const THEME_ICONS = {
  system: 'assets/theme/icons/system-sparkles.svg',
  cyber: 'assets/theme/icons/cyber-cpu.svg',
  ancient: 'assets/theme/icons/ancient-flower.svg',
  future: 'assets/theme/icons/future-orbit.svg'
};
const THEME_PRESENTATIONS = {
  cyber: {
    eyebrow: '数据新闻与公共议题研究实验站',
    headline: '把热点、数据、政策与研究<br>放进同一条证据链',
    copy: '民声 2.0 以静态站的稳定性承载动态公共议题：一边接权威统计、部委政策与论文 DOI，一边把网络热议、讨论摘录和历史快照做成可追溯的归档。',
    loreTitle: '本站说明',
    loreBody: '首页把热点追踪、证据整理、讨论摘录、报告入口和历史归档放在同一处，方便对照查看。',
    loreTags: ['热点追踪', '证据整理', '历史归档'],
    modeCode: 'DATA DESK'
  },
  ancient: {
    eyebrow: '数据新闻与公共议题研究实验站',
    headline: '把热点、数据、政策与研究<br>放进同一条证据链',
    copy: '民声 2.0 以静态站的稳定性承载动态公共议题：一边接权威统计、部委政策与论文 DOI，一边把网络热议、讨论摘录和历史快照做成可追溯的归档。',
    loreTitle: '本站说明',
    loreBody: '首页把热点追踪、证据整理、讨论摘录、报告入口和历史归档放在同一处，方便对照查看。',
    loreTags: ['热点追踪', '证据整理', '历史归档'],
    modeCode: 'DATA DESK'
  },
  future: {
    eyebrow: '数据新闻与公共议题研究实验站',
    headline: '把热点、数据、政策与研究<br>放进同一条证据链',
    copy: '民声 2.0 以静态站的稳定性承载动态公共议题：一边接权威统计、部委政策与论文 DOI，一边把网络热议、讨论摘录和历史快照做成可追溯的归档。',
    loreTitle: '本站说明',
    loreBody: '首页把热点追踪、证据整理、讨论摘录、报告入口和历史归档放在同一处，方便对照查看。',
    loreTags: ['热点追踪', '证据整理', '历史归档'],
    modeCode: 'DATA DESK'
  }
};

function getChartThemePalette() {
  const theme = document.body?.dataset.theme || 'ancient';
  return CHART_THEME_PALETTES[theme] || CHART_THEME_PALETTES.ancient;
}

function getThemeLabel(theme) {
  return THEME_LABELS[theme] || theme;
}

function getThemeIcon(theme) {
  return THEME_ICONS[theme] || THEME_ICONS.system;
}

function getThemePresentation(theme) {
  return THEME_PRESENTATIONS[theme] || THEME_PRESENTATIONS.ancient;
}

const CHART_PALETTE = new Proxy({}, {
  get(_, prop) {
    const palette = getChartThemePalette();
    return palette[prop] ?? CHART_THEME_PALETTES.ancient[prop];
  }
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value) {
  if (!value) return '未标注时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTopicName(id) {
  return TOPIC_NAMES[id] || id;
}

function getTypeName(id) {
  return TYPE_NAMES[id] || id;
}

function getReportCategoryName(id) {
  return REPORT_CATEGORY_NAMES[id] || id;
}

function formatSignedNumber(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value ?? '');
  return `${numeric > 0 ? '+' : ''}${numeric}`;
}

function byId(id) {
  return document.getElementById(id);
}

function getCurrentPage() {
  return document.body?.dataset.page || '';
}

function getStoredThemeMode() {
  try {
    const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (theme === 'poetic') return 'ancient';
    return theme === 'cyber' || theme === 'ancient' || theme === 'future' || theme === 'system' ? theme : 'system';
  } catch {
    return 'system';
  }
}

function getSystemPreferredTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'cyber' : 'ancient';
}

function resolveThemeMode(mode) {
  if (mode === 'cyber' || mode === 'ancient' || mode === 'future') return mode;
  return getSystemPreferredTheme();
}

function syncThemeButtons(mode) {
  document.querySelectorAll('[data-theme-target]').forEach((button) => {
    const active = button.dataset.themeTarget === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function applyThemeMode(mode, persist = true) {
  const nextMode = mode === 'cyber' || mode === 'ancient' || mode === 'future' ? mode : 'system';
  const effectiveTheme = resolveThemeMode(nextMode);
  const previousTheme = document.body?.dataset.theme;
  document.body.dataset.themeMode = nextMode;
  document.body.dataset.theme = effectiveTheme;
  document.body.dataset.themeTransition = effectiveTheme;
  syncThemeButtons(nextMode);
  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch {
      // ignore storage failures
    }
  }
  if (previousTheme && previousTheme !== effectiveTheme) {
    triggerThemeTransition(effectiveTheme);
    applyChartDefaults();
    rerenderThemeAwarePage();
  }
}

function ensureThemeTransitionOverlay() {
  if (!document.body || document.querySelector('.theme-transition-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'theme-transition-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);
}

function triggerThemeTransition(theme) {
  ensureThemeTransitionOverlay();
  const overlay = document.querySelector('.theme-transition-overlay');
  if (!overlay) return;
  overlay.dataset.theme = theme;
  overlay.classList.remove('is-animating');
  void overlay.offsetWidth;
  overlay.classList.add('is-animating');
  window.clearTimeout(window.__themeTransitionTimer);
  window.__themeTransitionTimer = window.setTimeout(() => {
    overlay.classList.remove('is-animating');
  }, 900);
}

function rerenderThemeAwarePage() {
  const data = window.__appData;
  if (!data) return;
  switch (getCurrentPage()) {
    case 'home': renderHome(data); break;
    case 'analysis': renderAnalysis(data); break;
    case 'trends': renderTrends(data); break;
    case 'exposure': renderExposure(data); break;
    case 'guide': renderGuide(data); break;
    case 'polls': renderPolls(data); break;
    default: return;
  }
  animateAuroraValues();
}

function bindSystemThemeWatcher() {
  if (systemThemeWatcherBound || !window.matchMedia) return;
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    if ((document.body.dataset.themeMode || getStoredThemeMode()) === 'system') {
      applyThemeMode('system', false);
    }
  };

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handleChange);
  } else if (typeof query.addListener === 'function') {
    query.addListener(handleChange);
  }
  systemThemeWatcherBound = true;
}

function ensureThemeSwitcher() {
  const navShell = document.querySelector('.nav-shell');
  if (!navShell || navShell.querySelector('.theme-switcher')) return;

  const toggle = document.createElement('div');
  toggle.className = 'theme-switcher';
  toggle.setAttribute('role', 'group');
  toggle.setAttribute('aria-label', '站点主题切换');
  toggle.innerHTML = html`
    <button class="theme-pill" type="button" data-theme-target="system" aria-pressed="false"><img class="theme-pill-icon" src="${getThemeIcon('system')}" alt=""><span>跟随系统</span></button>
    <button class="theme-pill" type="button" data-theme-target="cyber" aria-pressed="false"><img class="theme-pill-icon" src="${getThemeIcon('cyber')}" alt=""><span>赛博朋克</span></button>
    <button class="theme-pill" type="button" data-theme-target="ancient" aria-pressed="false"><img class="theme-pill-icon" src="${getThemeIcon('ancient')}" alt=""><span>完全古风</span></button>
    <button class="theme-pill" type="button" data-theme-target="future" aria-pressed="false"><img class="theme-pill-icon" src="${getThemeIcon('future')}" alt=""><span>未来世界</span></button>
  `;

  const navToggle = byId('navToggle');
  if (navToggle) {
    navShell.insertBefore(toggle, navToggle);
  } else {
    navShell.appendChild(toggle);
  }

  toggle.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-target]');
    if (!button) return;
    applyThemeMode(button.dataset.themeTarget);
  });

  syncThemeButtons(document.body.dataset.themeMode || getStoredThemeMode());
}

function renderDiagnosticChips(containerId, items) {
  const container = byId(containerId);
  if (!container) return;
  container.innerHTML = items.map((item) => html`
    <div class="diag-chip">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </div>
  `).join('');
}

function renderSignalMeters(items) {
  return items.map((item) => {
    const rawValue = Number(item.value ?? 0);
    const percent = Math.max(6, Math.min(100, rawValue));
    return html`
      <div class="signal-meter">
        <div class="signal-meter-top">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.display ?? rawValue)}</strong>
        </div>
        <div class="signal-meter-bar"><div class="signal-meter-fill" style="width:${percent}%"></div></div>
        ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}
      </div>
    `;
  }).join('');
}

function renderCommandDeck(containerId, panels) {
  const container = byId(containerId);
  if (!container) return;
  container.innerHTML = panels.map((panel) => html`
    <article class="command-panel">
      <small>${escapeHtml(panel.eyebrow)}</small>
      <h3>${escapeHtml(panel.title)}</h3>
      <p>${escapeHtml(panel.body)}</p>
      ${panel.html || ''}
    </article>
  `).join('');
}

function renderCenterNavGrid(containerId, cards) {
  const container = byId(containerId);
  if (!container) return;
  container.innerHTML = cards.map((card) => html`
    <a class="nav-hub-card ${card.core ? 'is-core' : ''}" href="${escapeHtml(card.href)}">
      <small>${escapeHtml(card.eyebrow)}</small>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.body)}</p>
      <div class="nav-hub-stats">
        ${(card.stats || []).map((item) => html`
          <div class="nav-hub-stat">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
          </div>
        `).join('')}
      </div>
      <div class="nav-hub-footer">
        <span>${escapeHtml(card.cta)}</span>
        <strong>${escapeHtml(card.signal)}</strong>
      </div>
    </a>
  `).join('');
}

function renderAuroraBoard(containerId, panels) {
  const container = byId(containerId);
  if (!container) return;
  container.innerHTML = panels.map((panel) => html`
    <article class="aurora-panel ${panel.wide ? 'is-wide' : ''}">
      <small>${escapeHtml(panel.eyebrow)}</small>
      <strong class="aurora-value" data-count-value="${escapeHtml(panel.value)}">${escapeHtml(panel.value)}</strong>
      <h3>${escapeHtml(panel.title)}</h3>
      <p>${escapeHtml(panel.body)}</p>
      ${panel.note ? `<div class="aurora-note">${escapeHtml(panel.note)}</div>` : ''}
    </article>
  `).join('');
}

function animateAuroraValues() {
  const values = document.querySelectorAll('.aurora-value[data-count-value]');
  values.forEach((node) => {
    if (node.dataset.animated === 'true') return;
    const raw = node.dataset.countValue || '';
    if (!/\d/.test(raw)) {
      node.dataset.animated = 'true';
      return;
    }
    const numeric = Number(raw.replace(/[^\d.-]/g, ''));
    if (Number.isNaN(numeric)) {
      node.dataset.animated = 'true';
      return;
    }
    const isInteger = Number.isInteger(numeric);
    const duration = 1200;
    const start = performance.now();
    node.dataset.animated = 'true';

    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numeric * eased;
      node.textContent = isInteger ? `${Math.round(current)}` : current.toFixed(1);
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        node.textContent = raw;
      }
    }

    requestAnimationFrame(frame);
  });
}

function buildPoeticPetals() {
  return Array.from({ length: 18 }, (_, index) => {
    const left = ((index * 11) + (index % 4) * 7) % 100;
    const drift = (index % 2 === 0 ? 24 : -28) + (index % 5) * 7;
    const duration = 11 + (index % 6) * 1.6;
    const delay = index * -0.85;
    const scale = (0.72 + (index % 5) * 0.12).toFixed(2);
    const opacity = (0.38 + (index % 4) * 0.12).toFixed(2);
    const rotate = `${12 + index * 17}deg`;
    return html`<span class="poetic-petal" style="--petal-left:${left}%;--petal-drift:${drift}px;--petal-duration:${duration.toFixed(2)}s;--petal-delay:${delay.toFixed(2)}s;--petal-scale:${scale};--petal-opacity:${opacity};--petal-rotate:${rotate};"></span>`;
  }).join('');
}

function initPoeticScene() {
  if (!document.body || document.body.classList.contains('redirect-body')) return;
  if (document.querySelector('.poetic-scene')) return;

  const layer = document.createElement('div');
  layer.className = 'poetic-scene';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = html`
    <div class="poetic-wallpaper-motion"></div>
    <div class="poetic-scroll-illustration"></div>
    <div class="poetic-mist poetic-mist-back"></div>
    <div class="poetic-sun-glow"></div>
    <div class="poetic-mountains poetic-mountains-back"></div>
    <div class="poetic-terraces terrace-back"></div>
    <div class="poetic-waterline"></div>
    <div class="poetic-river"></div>
    <div class="poetic-lotus-field"><span class="lotus lotus-a"></span><span class="lotus lotus-b"></span><span class="lotus lotus-c"></span><span class="lotus lotus-d"></span></div>
    <div class="poetic-mountains poetic-mountains-front"></div>
    <div class="poetic-terraces terrace-front"></div>
    <div class="poetic-mist poetic-mist-front"></div>
    <div class="poetic-pavilion"></div>
    <div class="poetic-bridge"></div>
    <div class="poetic-boat"></div>
    <div class="poetic-egrets"><span class="poetic-egret egret-a"></span><span class="poetic-egret egret-b"></span></div>
    <div class="poetic-willow willow-left"></div>
    <div class="poetic-willow willow-right"></div>
    <div class="poetic-branch poetic-branch-left"></div>
    <div class="poetic-branch poetic-branch-right"></div>
    <div class="poetic-petals">${buildPoeticPetals()}</div>
    <div class="poetic-butterflies"><span class="poetic-butterfly butterfly-a"></span><span class="poetic-butterfly butterfly-b"></span><span class="poetic-butterfly butterfly-c"></span></div>
  `;
  document.body.prepend(layer);
}

function buildFireflies() {
  return Array.from({ length: 12 }, (_, index) => {
    const left = 42 + (index % 5) * 10 + (index % 2 === 0 ? 0 : 3);
    const top = 18 + (index % 4) * 12;
    const size = (4 + (index % 3) * 1.6).toFixed(1);
    const delay = (index * -0.9).toFixed(2);
    const duration = (6.8 + (index % 4) * 1.4).toFixed(2);
    return html`<span class="firefly-dot" style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;--firefly-delay:${delay}s;--firefly-duration:${duration}s;"></span>`;
  }).join('');
}

function buildCranes() {
  return Array.from({ length: 3 }, (_, index) => {
    const top = 18 + index * 18;
    const left = index * 38;
    const delay = (index * -1.6).toFixed(2);
    const scale = (1 - index * 0.12).toFixed(2);
    return html`<span class="crane" style="left:${left}px;top:${top}px;--bird-delay:${delay}s;--bird-scale:${scale};"></span>`;
  }).join('');
}

function initHomeHeroScene() {
  if (document.body?.dataset.page !== 'home') return;
  const hero = document.querySelector('.news-hero');
  if (!hero || hero.querySelector('.hero-romantic-scene')) return;

  const layer = document.createElement('div');
  layer.className = 'hero-romantic-scene';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = html`
    <div class="hero-ancient-scroll"></div>
    <div class="moon-halo"></div>
    <div class="romantic-cloud cloud-a"></div>
    <div class="romantic-cloud cloud-b"></div>
    <div class="silk-lantern lantern-a"></div>
    <div class="silk-lantern lantern-b"></div>
    <div class="fan-silhouette fan-a"></div>
    <div class="fan-silhouette fan-b"></div>
    <div class="hero-boat-silhouette"></div>
    <div class="hero-petal-haze"></div>
    <div class="crane-flight">${buildCranes()}</div>
    <div class="firefly-field">${buildFireflies()}</div>
  `;
  hero.appendChild(layer);
}

function buildCyberRain() {
  return Array.from({ length: 20 }, (_, index) => {
    const left = (index * 5 + (index % 4) * 6) % 100;
    const delay = (index * -0.45).toFixed(2);
    const duration = (3.8 + (index % 5) * 0.5).toFixed(2);
    const opacity = (0.12 + (index % 4) * 0.05).toFixed(2);
    return html`<span class="cyber-rain-drop" style="left:${left}%;--rain-delay:${delay}s;--rain-duration:${duration}s;--rain-opacity:${opacity};"></span>`;
  }).join('');
}

function buildCyberWindows() {
  return Array.from({ length: 36 }, (_, index) => {
    const x = (index % 6) * 12 + 6;
    const y = Math.floor(index / 6) * 12 + 10;
    return html`<span class="city-window" style="left:${x}%;top:${y}%;"></span>`;
  }).join('');
}

function initCyberScene() {
  if (!document.body || document.body.classList.contains('redirect-body')) return;
  if (document.querySelector('.cyber-scene')) return;

  const layer = document.createElement('div');
  layer.className = 'cyber-scene';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = html`
    <div class="cyber-photo-backdrop"></div>
    <div class="cyber-grid-floor"></div>
    <div class="cyber-halo-sun"></div>
    <div class="cyber-cityline city-a">${buildCyberWindows()}</div>
    <div class="cyber-cityline city-b">${buildCyberWindows()}</div>
    <div class="cyber-billboard board-a"></div>
    <div class="cyber-billboard board-b"></div>
    <div class="cyber-rain">${buildCyberRain()}</div>
    <div class="cyber-scan-beam"></div>
  `;
  document.body.prepend(layer);
}

function initHomeCyberScene() {
  if (document.body?.dataset.page !== 'home') return;
  const hero = document.querySelector('.news-hero');
  if (!hero || hero.querySelector('.hero-cyber-scene')) return;

  const layer = document.createElement('div');
  layer.className = 'hero-cyber-scene';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = html`
    <div class="hero-cyber-poster"></div>
    <div class="hero-cyber-orbit"></div>
    <div class="hero-cyber-panel panel-a"></div>
    <div class="hero-cyber-panel panel-b"></div>
    <div class="hero-cyber-drone"></div>
  `;
  hero.appendChild(layer);
}

function buildFutureStars() {
  return Array.from({ length: 24 }, (_, index) => {
    const left = (index * 17 + (index % 3) * 9) % 100;
    const top = (index * 13 + (index % 4) * 7) % 100;
    const size = (1.8 + (index % 4) * 1.1).toFixed(1);
    const delay = (index * -0.45).toFixed(2);
    const duration = (4.8 + (index % 5) * 1.1).toFixed(2);
    return html`<span class="future-star" style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;--star-delay:${delay}s;--star-duration:${duration}s;"></span>`;
  }).join('');
}

function buildFutureSignals() {
  return Array.from({ length: 5 }, (_, index) => {
    const rotate = -18 + index * 10;
    const delay = (index * -0.8).toFixed(2);
    return html`<span class="future-signal signal-${index + 1}" style="--signal-rotate:${rotate}deg;--signal-delay:${delay}s;"></span>`;
  }).join('');
}

function initFutureScene() {
  if (!document.body || document.body.classList.contains('redirect-body')) return;
  if (document.querySelector('.future-scene')) return;

  const layer = document.createElement('div');
  layer.className = 'future-scene';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = html`
    <div class="future-wallpaper-motion"></div>
    <div class="future-starfield">${buildFutureStars()}</div>
    <div class="future-deepfield-art"></div>
    <div class="future-nebula nebula-a"></div>
    <div class="future-nebula nebula-b"></div>
    <div class="future-planet-haze"></div>
    <div class="future-blackhole"><span class="blackhole-core"></span><span class="blackhole-ring ring-a"></span><span class="blackhole-ring ring-b"></span></div>
    <div class="future-orbit orbit-a"></div>
    <div class="future-orbit orbit-b"></div>
    <div class="future-alien-sigil"></div>
    <div class="future-robot-eye"></div>
    <div class="future-monolith monolith-a"></div>
    <div class="future-monolith monolith-b"></div>
    <div class="future-signal-grid">${buildFutureSignals()}</div>
  `;
  document.body.prepend(layer);
}

function initHomeFutureScene() {
  if (document.body?.dataset.page !== 'home') return;
  const hero = document.querySelector('.news-hero');
  if (!hero || hero.querySelector('.hero-future-scene')) return;

  const layer = document.createElement('div');
  layer.className = 'hero-future-scene';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = html`
    <div class="hero-future-vortex"></div>
    <div class="future-planet"></div>
    <div class="future-ufo"></div>
    <div class="future-portal"></div>
    <div class="robot-sentinel">
      <span class="robot-head"></span>
      <span class="robot-eye left"></span>
      <span class="robot-eye right"></span>
      <span class="robot-neck"></span>
    </div>
    <div class="alien-glyph glyph-a"></div>
    <div class="alien-glyph glyph-b"></div>
  `;
  hero.appendChild(layer);
}

function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;
  const palette = getChartThemePalette();
  Chart.defaults.color = palette.text;
  Chart.defaults.font.family = '"Rajdhani", "Noto Sans SC", sans-serif';
  Chart.defaults.font.size = 13;
  Chart.defaults.plugins.legend.labels.color = palette.legend;
  Chart.defaults.plugins.legend.labels.boxWidth = 14;
  Chart.defaults.plugins.tooltip.backgroundColor = palette.tooltipBg;
  Chart.defaults.plugins.tooltip.borderColor = palette.tooltipBorder;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
  Chart.defaults.plugins.tooltip.bodyColor = palette.tooltipBody;
  Chart.defaults.scale.grid.color = palette.grid;
  Chart.defaults.scale.border.color = palette.border;
  Chart.defaults.scale.ticks.color = palette.ticks;
  Chart.defaults.elements.line.borderWidth = 2.5;
  Chart.defaults.elements.point.radius = 3;
  Chart.defaults.elements.point.hoverRadius = 5;
}

function configureChartDefaults() {
  if (typeof Chart === 'undefined' || window.__cyberChartsConfigured) {
    applyChartDefaults();
    return;
  }

  const neonPlugin = {
    id: 'cyberGlow',
    beforeDatasetDraw(chart, args) {
      const { ctx } = chart;
      const dataset = chart.data.datasets[args.index] || {};
      const color = dataset.borderColor || dataset.backgroundColor || CHART_PALETTE.cyan;
      ctx.save();
      ctx.shadowColor = Array.isArray(color) ? color[0] : color;
      ctx.shadowBlur = chart.config.type === 'doughnut' ? 0 : 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    },
    afterDatasetDraw(chart) {
      chart.ctx.restore();
    },
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const { left, right, top, bottom } = chartArea;
      const corner = 14;
      ctx.save();
      ctx.strokeStyle = 'rgba(109, 244, 255, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, top + corner);
      ctx.lineTo(left, top);
      ctx.lineTo(left + corner, top);
      ctx.moveTo(right - corner, top);
      ctx.lineTo(right, top);
      ctx.lineTo(right, top + corner);
      ctx.moveTo(left, bottom - corner);
      ctx.lineTo(left, bottom);
      ctx.lineTo(left + corner, bottom);
      ctx.moveTo(right - corner, bottom);
      ctx.lineTo(right, bottom);
      ctx.lineTo(right, bottom - corner);
      ctx.stroke();
      ctx.restore();
    }
  };

  const peakPlugin = {
    id: 'signalPeaks',
    afterDatasetsDraw(chart) {
      if (chart.config.type !== 'line') return;
      const { ctx } = chart;
      const pulse = 4 + ((Date.now() / 260) % 4);
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        if (dataset.peakMarker === false) return;
        const values = (dataset.data || []).map((value) => Number(value)).filter((value) => !Number.isNaN(value));
        if (!values.length) return;
        const maxValue = Math.max(...values);
        const peakIndex = dataset.data.findIndex((value) => Number(value) === maxValue);
        const meta = chart.getDatasetMeta(datasetIndex);
        const point = meta?.data?.[peakIndex];
        if (!point) return;
        const color = Array.isArray(dataset.borderColor) ? dataset.borderColor[0] : (dataset.borderColor || CHART_PALETTE.cyan);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '11px Rajdhani, sans-serif';
        ctx.fillStyle = '#f4fcff';
        ctx.textAlign = 'left';
        ctx.fillText('PEAK', point.x + 8, point.y - 8);
        ctx.restore();
      });
    }
  };

  Chart.register(neonPlugin, peakPlugin);
  applyChartDefaults();
  window.__cyberChartsConfigured = true;
}

async function fetchJson(name) {
  const response = await fetch(`data/${name}.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Failed to load ${name}.json`);
  return response.json();
}

async function loadData() {
  const entries = await Promise.all(DATA_FILES.map(async (name) => [name, await fetchJson(name)]));
  const data = Object.fromEntries(entries);
  data.topicsById = Object.fromEntries(data.topics.map((item) => [item.id, item]));
  data.papersById = Object.fromEntries(data.papers.map((item) => [item.id, item]));
  data.policiesById = Object.fromEntries(data.policy_links.map((item) => [item.id, item]));
  data.sourcesById = Object.fromEntries(data.sources.map((item) => [item.id, item]));
  data.discussionsById = Object.fromEntries(data.discussion_archive.map((item) => [item.id, item]));
  data.currentTrendById = Object.fromEntries(data.trend_current.map((item) => [item.id, item]));
  data.timeseriesByTopic = Object.fromEntries(((data.hotspot_timeseries || {}).topics || []).map((item) => [item.topic, item]));
  data.liveRuntime = await fetchLiveRuntime(data.live_config);
  return data;
}

async function fetchLiveRuntime(config) {
  const runtime = {
    voteTotals: {},
    comments: [],
    bullets: [],
    user: null,
    status: 'demo',
    error: ''
  };
  const backend = (config || {}).vote_backend || {};
  if (!backend.enabled || !backend.read_url) return runtime;
  try {
    const response = await fetch(backend.read_url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`live read failed: ${response.status}`);
    const payload = await response.json();
    runtime.voteTotals = payload.poll_totals || {};
    runtime.comments = payload.comments || [];
    runtime.bullets = payload.bullets || [];
    runtime.user = payload.user || null;
    runtime.status = 'live';
  } catch (error) {
    runtime.status = 'error';
    runtime.error = error.message;
  }
  return runtime;
}

function ensureLiveInfoBar() {
  let bar = byId('liveInfoBar');
  if (bar) return bar;
  const header = document.querySelector('.site-header');
  if (!header || !header.parentNode) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'live-info-bar';
  wrapper.innerHTML = '<div class="shell live-info-shell" id="liveInfoBar"></div>';
  header.insertAdjacentElement('afterend', wrapper);
  return byId('liveInfoBar');
}

function formatClock(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function weatherText(code) {
  const mapping = {
    0: '晴',
    1: '大部晴朗',
    2: '多云',
    3: '阴',
    45: '雾',
    48: '冻雾',
    51: '毛毛雨',
    53: '小雨',
    55: '中雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    80: '阵雨',
    81: '较强阵雨',
    82: '强阵雨',
    95: '雷暴'
  };
  return mapping[code] || '天气更新中';
}

async function initLiveInfoBar() {
  const bar = ensureLiveInfoBar();
  if (!bar) return;
  const state = {
    time: formatClock(),
    weather: '天气加载中',
    location: '本地时间',
    source: '浏览器时钟'
  };

  function draw() {
    bar.innerHTML = html`
      <div class="live-info-badge"><strong>实时日期时间</strong><span>${escapeHtml(state.time)}</span></div>
      <div class="live-info-badge"><strong>天气</strong><span>${escapeHtml(state.weather)}</span></div>
      <div class="live-info-badge"><strong>定位</strong><span>${escapeHtml(state.location)}</span></div>
      <div class="live-info-badge"><strong>说明</strong><span>${escapeHtml(state.source)}</span></div>
    `;
  }

  draw();
  window.setInterval(() => {
    state.time = formatClock();
    draw();
  }, 1000);

  const fallback = { latitude: 39.9042, longitude: 116.4074, label: '北京（默认）' };
  const coords = await new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(fallback);
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        label: '本地定位'
      }),
      () => resolve(fallback),
      { timeout: 6000, maximumAge: 600000 }
    );
  });

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
    const response = await fetch(weatherUrl);
    if (!response.ok) throw new Error('weather request failed');
    const payload = await response.json();
    const current = payload.current || {};
    state.weather = `${weatherText(current.weather_code)} ${Math.round(current.temperature_2m)}°C / 风速 ${Math.round(current.wind_speed_10m || 0)} km/h`;
    state.location = coords.label;
    state.source = 'Open-Meteo 实时天气';
    draw();
  } catch {
    state.weather = '天气暂不可用';
    state.location = coords.label;
    state.source = '天气接口未返回';
    draw();
  }
}

function initChrome() {
  ensureThemeSwitcher();
  const toggle = byId('navToggle');
  const nav = byId('siteNav');
  const backTop = byId('backTop');

  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  if (backTop) {
    window.addEventListener('scroll', () => {
      backTop.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}

function renderFooter(data) {
  const footer = byId('siteFooter');
  if (!footer) return;
  footer.innerHTML = html`
    <div class="shell footer-shell">
      <div class="footer-meta">
        <strong>${escapeHtml(data.site_meta.site_name)}</strong> · ${escapeHtml(data.site_meta.description)}<br>
        最近更新：${escapeHtml(data.site_meta.last_updated_label)}。站点内容用于公共议题整理与研究参考，不代表官方立场。
      </div>
      <div class="footer-links">
        <a class="button ghost" href="https://www.12315.cn/" target="_blank" rel="noreferrer">全国 12315</a>
        <a class="button ghost" href="https://www.stats.gov.cn/" target="_blank" rel="noreferrer">国家统计局</a>
        <a class="button ghost" href="${escapeHtml(data.site_meta.repository.discussions_url)}" target="_blank" rel="noreferrer">GitHub Discussions</a>
      </div>
    </div>
  `;
}

function renderDanmu(containerId, discussions, large = false) {
  const container = byId(containerId);
  if (!container) return;
  container.innerHTML = '';
  const rows = large ? 3 : 2;
  for (let i = 0; i < rows; i += 1) {
    const track = document.createElement('div');
    track.className = 'danmu-track';
    track.style.top = `${24 + i * 64}px`;
    track.style.animationDuration = `${26 + i * 8}s`;
    track.innerHTML = discussions.map((item) => html`
      <span class="danmu-chip"><span>#${escapeHtml(getTopicName(item.topic))}</span>${escapeHtml(item.excerpt)}</span>
    `).join('');
    container.appendChild(track);
  }
}

function summaryCardMarkup(item) {
  return html`
    <article class="source-card">
      <small>${escapeHtml(item.label)}</small>
      <h3>${escapeHtml(item.value)}</h3>
      <p>${escapeHtml(item.note)}</p>
    </article>
  `;
}

function renderSummaryGrid(containerId, items) {
  const container = byId(containerId);
  if (!container) return;
  container.innerHTML = items.map(summaryCardMarkup).join('');
}

function reportStackMarkup(report) {
  return html`
    <article class="stack-card">
      <small>${escapeHtml(getTopicName(report.topic))} · ${escapeHtml(getReportCategoryName(report.category))}</small>
      <h3>${escapeHtml(report.title)}</h3>
      <div class="meta-line"><span>${escapeHtml(report.publisher)}</span><span>${escapeHtml(report.year)}</span></div>
      <p>${escapeHtml(report.summary)}</p>
      <div class="topic-actions">
        <a class="topic-link" href="${escapeHtml(report.url)}" target="_blank" rel="noreferrer">打开报告</a>
        <a class="topic-link" href="archive.html?type=report&topic=${escapeHtml(report.topic)}">归档检索</a>
      </div>
    </article>
  `;
}

function reportCardMarkup(report) {
  return html`
    <article class="source-card report-card" data-report-kind="${escapeHtml(report.category)}">
      <small>${escapeHtml(getTopicName(report.topic))} · ${escapeHtml(getReportCategoryName(report.category))}</small>
      <h3>${escapeHtml(report.title)}</h3>
      <div class="meta-line"><span>${escapeHtml(report.publisher)}</span><span>${escapeHtml(report.year)}</span></div>
      <p>${escapeHtml(report.summary)}</p>
      <div class="topic-actions">
        <a class="topic-link" href="${escapeHtml(report.url)}" target="_blank" rel="noreferrer">打开报告</a>
        <a class="topic-link" href="analysis.html#${escapeHtml(report.topic)}">关联议题</a>
      </div>
    </article>
  `;
}

function pickFeaturedReports(data, topicIds = [], limit = 6) {
  const preferredTopics = topicIds.length ? topicIds : data.topics.map((topic) => topic.id);
  const featured = [];
  const seen = new Set();

  preferredTopics.forEach((topicId) => {
    const report = data.reports.find((item) => item.topic === topicId && !seen.has(item.id));
    if (report) {
      featured.push(report);
      seen.add(report.id);
    }
  });

  data.reports.forEach((report) => {
    if (featured.length >= limit || seen.has(report.id)) return;
    featured.push(report);
    seen.add(report.id);
  });

  return featured.slice(0, limit);
}

function renderHome(data) {
  const heroBriefGrid = byId('heroBriefGrid');
  const topSignal = (((data || {}).hotspot_analysis || {}).topic_rankings || [])[0];
  const weeklyReport = ((data || {}).hotspot_analysis || {}).weekly_report || {};
  const activeWindows = getActiveWatchWindows(data.editorial_watchlist || { windows: [] });
  const digest = data.insight_digest || {};
  const pollPayload = getPollPayload(data);
  const pollSurveys = pollPayload.surveys || [];
  const pollBaseVotes = pollSurveys.reduce((sum, poll) => sum + poll.options.reduce((acc, option) => acc + option.votes, 0), 0);
  const exposureLead = ((digest.case_library || [])[0] || (digest.exposure_timeline || [])[0] || {});
  const currentTheme = document.body?.dataset.theme || 'ancient';
  const themePresentation = getThemePresentation(currentTheme);

  const heroEyebrow = byId('heroEyebrow');
  if (heroEyebrow) heroEyebrow.textContent = themePresentation.eyebrow;
  const heroHeadline = byId('heroHeadline');
  if (heroHeadline) heroHeadline.innerHTML = themePresentation.headline;
  const heroCopy = byId('heroCopy');
  if (heroCopy) heroCopy.textContent = themePresentation.copy;
  const themeLoreCard = byId('themeLoreCard');
  if (themeLoreCard) {
    themeLoreCard.innerHTML = html`
      <div class="theme-lore-head">
        <div>
          <small>首页说明</small>
          <strong>${escapeHtml(themePresentation.loreTitle)}</strong>
        </div>
      </div>
      <p>${escapeHtml(themePresentation.loreBody)}</p>
      <div class="theme-lore-tags">
        ${themePresentation.loreTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
      </div>
    `;
  }

  byId('heroStats').innerHTML = data.site_meta.hero_stats.map((item) => html`
    <div class="stat-row">
      <div class="stat-value">${escapeHtml(item.value)}</div>
      <div class="stat-label">${escapeHtml(item.label)}</div>
      <div class="stat-note">${escapeHtml(item.note)}</div>
    </div>
  `).join('');

  byId('weeklyChanges').innerHTML = data.site_meta.weekly_changes.map((item) => `<div class="bullet-item">${escapeHtml(item)}</div>`).join('');
  renderWeeklyReport('homeWeeklyBrief', weeklyReport, 2);
  const homeWeeklyList = byId('homeWeeklyList');
  if (homeWeeklyList) {
    homeWeeklyList.innerHTML = (weeklyReport.editor_notes || []).map((item) => `<article class="stack-card"><p>${escapeHtml(item)}</p></article>`).join('');
  }
  renderWatchlistCards('homeWatchlistGrid', activeWindows.length ? activeWindows : (data.editorial_watchlist.windows || []).slice(0, 2), true);
  const homeWatchlistNotes = byId('homeWatchlistNotes');
  if (homeWatchlistNotes) {
    homeWatchlistNotes.innerHTML = [
      activeWindows.length ? `当前处于激活状态的时令监测窗口有 ${activeWindows.length} 个。` : '当前没有命中时令监测窗口，页面展示的是全年长期议题。',
      '时令窗口的作用是：即使平台接口受限，像两会、3·15、高考、毕业季这样的全国性热点也不会漏掉。',
      '热点排序仍然会综合历史档案、证据库、讨论摘录和报告入口，不会只靠白名单本身。'
    ].map((item) => `<article class="stack-card"><p>${escapeHtml(item)}</p></article>`).join('');
  }

  if (heroBriefGrid) {
    heroBriefGrid.innerHTML = [
      { title: '最新更新时间', body: data.site_meta.last_updated_label },
      { title: '当前归档规模', body: `${data.trend_archive.length + data.evidence_records.length + data.papers.length + data.discussion_archive.length + data.reports.length} 条可检索记录` },
      { title: '报告与调查入口', body: `${data.reports.length} 个官方/学术报告入口` },
      { title: '综合强信号', body: topSignal ? `${topSignal.label} · 综合分 ${topSignal.combined_score}` : '热点分析生成中' }
    ].map((item) => html`
      <div class="hero-brief-card">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.body)}</span>
      </div>
    `).join('');
  }

  renderDiagnosticChips('heroDiagnostics', [
    { label: 'SYNC', value: data.site_meta.last_updated_label || '更新中' },
    { label: 'TRACK', value: `${data.trend_current.length} HOT` },
    { label: 'ARCHIVE', value: `${data.trend_archive.length} LOGS` },
    { label: 'MODE', value: themePresentation.modeCode }
  ]);

  const topSignals = ((data.hotspot_analysis || {}).topic_rankings || []).slice(0, 4);
  const platformStatusEntries = Object.entries((data.social_hot_topics || {}).platform_status || {});
  renderCommandDeck('homeCommandDeck', [
    {
      eyebrow: 'Signal Queue',
      title: '高优先信号通道',
      body: '把综合分最高的议题压缩成一组重点指标，方便一眼判断今天站点最该先看什么。',
      html: renderSignalMeters(topSignals.map((item) => ({
        label: item.label,
        value: item.combined_score / 3,
        display: `${item.combined_score}`,
        note: `${item.signal_label} · ${item.current_heat} 热度`
      })))
    },
    {
      eyebrow: 'Platform Gate',
      title: '平台入口状态',
      body: '公开入口的限制情况会直接影响热榜解释方式，所以这里单独显示。',
      html: renderSignalMeters(platformStatusEntries.map(([platform, status]) => ({
        label: platform.toUpperCase(),
        value: status.status === 'ok' ? 100 : status.status === 'rsshub' ? 72 : 34,
        display: status.label,
        note: status.note
      })))
    },
    {
      eyebrow: 'Archive Pulse',
      title: '站内归档脉冲',
      body: '把热点、证据、讨论和报告的体量放到一组摘要里，快速看站点的信息厚度。',
      html: renderSignalMeters([
        { label: 'Trend', value: data.trend_archive.length * 4, display: `${data.trend_archive.length}`, note: '历史热点快照' },
        { label: 'Evidence', value: data.evidence_records.length * 8, display: `${data.evidence_records.length}`, note: '证据库条目' },
        { label: 'Discussion', value: data.discussion_archive.length * 9, display: `${data.discussion_archive.length}`, note: '讨论摘录' },
        { label: 'Reports', value: data.reports.length * 7, display: `${data.reports.length}`, note: '报告与调查入口' }
      ])
    }
  ]);

  renderAuroraBoard('homeAuroraBoard', [
    {
      eyebrow: 'Live Archive',
      value: `${data.trend_archive.length + data.evidence_records.length + data.papers.length + data.discussion_archive.length + data.reports.length}`,
      title: '站内记录总量',
      body: '把热点、证据、讨论、论文和报告放到一个统一索引里看，首页先给你总盘子。',
      note: `当前已覆盖 ${data.topics.length} 个议题`
    },
    {
      eyebrow: 'Signal Focus',
      value: topSignal ? `${topSignal.combined_score}` : '--',
      title: topSignal ? `${topSignal.label} 是当前最强信号` : '热点分析生成中',
      body: '综合分结合热度、证据、讨论和报告入口，不只看单个平台的瞬时热词。'
    },
    {
      eyebrow: 'Pulse Survey',
      value: `${pollSurveys.length}`,
      title: '轻投票题组',
      body: '首页直接告诉你可投题组规模，方便快速进入民意面板。',
      note: `基础样本 ${pollBaseVotes}`
    },
    {
      eyebrow: 'Season Watch',
      value: `${activeWindows.length || (data.editorial_watchlist.windows || []).length}`,
      title: '时令监测窗口',
      body: '两会、3·15、高考、毕业季等固定窗口会自动抬升为重点监测。',
      note: activeWindows.length ? '当前存在激活窗口' : '当前展示全年日历'
    }
  ]);

  renderCenterNavGrid('centerNavGrid', [
    {
      eyebrow: 'Signal Lane',
      title: '热点追踪',
      body: '按综合分、平台状态和历史均值查看今天最需要盯住的公共议题。',
      href: 'trends.html',
      cta: '进入信号面板',
      signal: topSignal ? `TOP ${topSignal.label}` : '等待生成',
      stats: [
        { label: '热点条目', value: `${data.trend_current.length}` },
        { label: '监测窗口', value: `${activeWindows.length || (data.editorial_watchlist.windows || []).length}` }
      ]
    },
    {
      eyebrow: 'Pulse Core',
      title: '轻投票',
      body: '这里作为中央主卡，集中进入民意脉冲面板，查看多议题投票、建议和样本变化。',
      href: 'polls.html',
      cta: '进入轻投票',
      signal: `${pollSurveys.length} 题可投`,
      core: true,
      stats: [
        { label: '题目总数', value: `${pollSurveys.length}` },
        { label: '基础样本', value: `${pollBaseVotes}` },
        { label: '建议板', value: `${(pollPayload.suggestion_boards || []).length}` },
        { label: '联动议题', value: `${new Set(pollSurveys.map((item) => item.topic)).size}` }
      ]
    },
    {
      eyebrow: 'Public Feed',
      title: '讨论与弹幕',
      body: '从讨论摘录、精选观点和公开弹幕里看公众怎么表达分歧与建议。',
      href: 'discuss.html',
      cta: '进入讨论区',
      signal: `${data.discussion_archive.length} 条归档`,
      stats: [
        { label: '精选评论', value: `${data.discussion_archive.filter((item) => item.featured).length}` },
        { label: '最新评论', value: `${Math.min(8, data.discussion_archive.length)}` }
      ]
    },
    {
      eyebrow: 'Risk Route',
      title: '问题曝光',
      body: '把高风险个案、典型问题和处理路径单独拎出来，方便快速判断风险等级。',
      href: 'exposure.html',
      cta: '查看风险专题',
      signal: exposureLead.title || '案例更新中',
      stats: [
        { label: '高风险案例', value: `${(digest.case_library || []).length}` },
        { label: '问题线索', value: `${(digest.exposure_timeline || []).length}` }
      ]
    },
    {
      eyebrow: 'Archive Node',
      title: '归档检索',
      body: '按关键词、议题和时间回看旧热点、旧证据、旧讨论与报告入口。',
      href: 'archive.html',
      cta: '进入归档检索',
      signal: `${data.trend_archive.length + data.evidence_records.length + data.papers.length + data.discussion_archive.length + data.reports.length} 条记录`,
      stats: [
        { label: '热点归档', value: `${data.trend_archive.length}` },
        { label: '证据与论文', value: `${data.evidence_records.length + data.papers.length}` }
      ]
    }
  ]);

  byId('trendTape').innerHTML = data.trend_current.map((item) => html`
    <article class="heat-item">
      <div class="heat-topline">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="heat-score">${item.heat_score}</span>
      </div>
      <p>${escapeHtml(item.summary)}</p>
      <div class="heat-bar"><div class="heat-fill" style="width:${item.heat_score}%"></div></div>
    </article>
  `).join('');

  byId('updateTimeline').innerHTML = data.indicators.timeline.map((item) => html`
    <article class="timeline-item">
      <div class="timeline-date">${escapeHtml(item.date)}</div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
    </article>
  `).join('');

  const socialGrid = byId('socialSnapshotGrid');
  const socialStatus = byId('socialStatusCards');
  if (socialGrid && socialStatus) {
    socialGrid.innerHTML = data.social_hot_topics.items.slice(0, 6).map((item) => html`
      <article class="trend-card">
        <div class="meta-line"><span>${escapeHtml(item.platform)}</span><span>${escapeHtml(getTopicName(item.topic))}</span><span>热度 ${item.heat}</span></div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <div class="topic-actions"><a class="topic-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开平台入口</a></div>
      </article>
    `).join('');
    socialStatus.innerHTML = Object.entries(data.social_hot_topics.platform_status).map(([platform, status]) => html`
      <article class="stack-card">
        <small>${escapeHtml(platform)}</small>
        <h3>${escapeHtml(status.label)}</h3>
        <p>${escapeHtml(status.note)}</p>
        <div class="meta-line"><span>最近尝试：${formatDate(status.last_attempt)}</span><span>${status.last_success ? `最近成功：${formatDate(status.last_success)}` : '暂无成功抓取'}</span></div>
      </article>
    `).join('');
  }

  const homeExposureHighlights = byId('homeExposureHighlights');
  if (homeExposureHighlights && digest.exposure_timeline) {
    homeExposureHighlights.innerHTML = digest.exposure_timeline
      .filter((item) => ['exposed', 'investigating'].includes(item.type))
      .slice(0, 4)
      .map((item) => html`
        <article class="stack-card">
          <small>${escapeHtml(getTopicName(item.topic))} · ${escapeHtml(getTypeName(item.type))}</small>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.verdict)}</p>
        </article>
      `).join('');
  }

  const homeGuideHighlights = byId('homeGuideHighlights');
  if (homeGuideHighlights && digest.guide_priority_actions) {
    homeGuideHighlights.innerHTML = digest.guide_priority_actions.slice(0, 4).map((item) => html`
      <article class="stack-card">
        <small>${escapeHtml(item.label)} · 最高票 ${escapeHtml(item.priority_votes)}</small>
        <h3>${escapeHtml(item.priority_label || '优先建议整理中')}</h3>
        <p>${escapeHtml(item.summary)}</p>
      </article>
    `).join('');
  }

  byId('topicGrid').innerHTML = data.topics.map((topic) => html`
    <article class="topic-card" data-accent="${escapeHtml(topic.accent)}">
      <div class="topic-meta">${escapeHtml(topic.emoji)} <span>${escapeHtml(topic.label)}</span></div>
      <div class="topic-title"><strong>${escapeHtml(topic.summary)}</strong></div>
      <p class="topic-summary">${escapeHtml(topic.hot_summary)}</p>
      <div class="topic-actions">
        <a class="topic-link" href="analysis.html#${escapeHtml(topic.id)}">进入议题页</a>
        <a class="topic-link" href="archive.html?topic=${escapeHtml(topic.id)}">查看归档</a>
      </div>
    </article>
  `).join('');

  byId('sourceGrid').innerHTML = data.sources.slice(0, 6).map((source) => html`
    <article class="source-card">
      <small>${escapeHtml(source.category)} · 级别 ${escapeHtml(source.authority_level)}</small>
      <h3>${escapeHtml(source.name)}</h3>
      <p>${escapeHtml(source.note)}</p>
      <div class="topic-actions"><a class="topic-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">打开入口</a></div>
    </article>
  `).join('');

  const paperCards = [
    ...data.papers.slice(0, 4).map((paper) => ({
      kind: 'paper',
      title: paper.title,
      meta: `${paper.year} · ${getTopicName(paper.topic)}`,
      body: paper.abstract,
      href: paper.url,
      linkText: '查看 DOI'
    })),
    ...data.policy_links.slice(0, 3).map((policy) => ({
      kind: 'policy',
      title: policy.title,
      meta: `${getTopicName(policy.topic)} · ${policy.source_name}`,
      body: `${policy.label}，适合从议题页或证据库直接跳转到官方入口。`,
      href: policy.url,
      linkText: policy.label
    }))
  ].slice(0, 6);

  byId('paperPolicyCards').innerHTML = paperCards.map((item) => html`
    <article class="stack-card">
      <small>${escapeHtml(item.kind === 'paper' ? '论文卡片' : '政策入口')}</small>
      <h3>${escapeHtml(item.title)}</h3>
      <div class="meta-line"><span>${escapeHtml(item.meta)}</span></div>
      <p>${escapeHtml(item.body)}</p>
      <div class="topic-actions"><a class="topic-link" href="${escapeHtml(item.href)}" target="_blank" rel="noreferrer">${escapeHtml(item.linkText)}</a></div>
    </article>
  `).join('');

  const reportGrid = byId('reportGrid');
  const reportTips = byId('reportTips');
  if (reportGrid && reportTips) {
    reportGrid.innerHTML = data.reports.slice(0, 8).map((report) => html`
      <article class="source-card report-card" data-report-kind="${escapeHtml(report.category)}">
        <small>${escapeHtml(report.publisher)} · ${escapeHtml(report.year)} · ${escapeHtml(report.category)}</small>
        <h3>${escapeHtml(report.title)}</h3>
        <p>${escapeHtml(report.summary)}</p>
        <div class="topic-actions">
          <a class="topic-link" href="${escapeHtml(report.url)}" target="_blank" rel="noreferrer">打开报告</a>
          <a class="topic-link" href="archive.html?type=report&topic=${escapeHtml(report.topic)}">关联归档</a>
        </div>
      </article>
    `).join('');

    reportTips.innerHTML = [
      '先看统计公报和年鉴，建立总量与趋势的底图，再看调查和研究解释差异。',
      '长期追踪调查更适合回答“哪些群体差异更大”，官方公报更适合回答“整体变化到哪里了”。',
      '把报告入口和议题页、证据库、讨论区联动使用，能避免只看单一热词做判断。',
      '如果某个议题争议很大，优先回到原始报告和项目主页，而不是二手转述。'
    ].map((item) => `<article class="stack-card"><p>${escapeHtml(item)}</p></article>`).join('');
  }

  renderHomeCharts(data);

  byId('methodHighlights').innerHTML = `<div class="stack-list">${data.site_meta.methodology_highlights.map((item) => `<div class="stack-card"><p>${escapeHtml(item)}</p></div>`).join('')}</div>`;
  renderDanmu('danmuStage', data.discussion_archive.slice(0, 5));
}

function renderHomeCharts(data) {
  if (typeof Chart === 'undefined') return;
  window.__homeCharts = window.__homeCharts || {};

  const trendCanvas = byId('homeTrendChart');
  const pollCanvas = byId('homePollChart');
  const sourceCanvas = byId('homeSourceChart');
  const notes = byId('dashboardNotes');

  const trendLabels = data.trend_current.map((item) => getTopicName(item.topic));
  const trendValues = data.trend_current.map((item) => item.heat_score);

  const pollPayload = getPollPayload(data);
  const topicTotals = Object.values((pollPayload.surveys || []).reduce((acc, poll) => {
    if (!acc[poll.topic]) acc[poll.topic] = { topic: poll.topic, total: 0 };
    acc[poll.topic].total += poll.options.reduce((sum, option) => sum + option.votes, 0);
    return acc;
  }, {}));

  const sourceGroups = Object.entries(data.sources.reduce((acc, source) => {
    acc[source.category] = (acc[source.category] || 0) + 1;
    return acc;
  }, {}));

  if (trendCanvas) {
    if (window.__homeCharts.trend) window.__homeCharts.trend.destroy();
    window.__homeCharts.trend = new Chart(trendCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: trendLabels,
        datasets: [{
          label: '热度分值',
          data: trendValues,
          backgroundColor: [CHART_PALETTE.cyan, CHART_PALETTE.pink, CHART_PALETTE.amber, CHART_PALETTE.green, CHART_PALETTE.orange, CHART_PALETTE.violet]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  if (pollCanvas) {
    if (window.__homeCharts.poll) window.__homeCharts.poll.destroy();
    window.__homeCharts.poll = new Chart(pollCanvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels: topicTotals.map((item) => getTopicName(item.topic)),
        datasets: [{
          label: '基础样本量',
          data: topicTotals.map((item) => item.total),
          backgroundColor: 'rgba(180, 35, 24, 0.14)',
          borderColor: CHART_PALETTE.pink,
          pointBackgroundColor: CHART_PALETTE.cyan
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  if (sourceCanvas) {
    if (window.__homeCharts.source) window.__homeCharts.source.destroy();
    window.__homeCharts.source = new Chart(sourceCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: sourceGroups.map(([label]) => label),
        datasets: [{
          data: sourceGroups.map(([, value]) => value),
          backgroundColor: [CHART_PALETTE.cyan, CHART_PALETTE.pink, CHART_PALETTE.green, CHART_PALETTE.amber, CHART_PALETTE.violet]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  if (notes) {
    const highestTrend = data.trend_current[0];
    const largestPoll = topicTotals.slice().sort((a, b) => b.total - a.total)[0];
    const largestSource = sourceGroups.slice().sort((a, b) => b[1] - a[1])[0];
    const analysisNotes = (((data || {}).hotspot_analysis || {}).lead_brief || []).slice(0, 2);
    notes.innerHTML = [
      ...analysisNotes,
      `当前热点强度最高的是“${highestTrend ? highestTrend.title : '暂无'}”。`,
      `基础样本量最高的调查议题是“${largestPoll ? getTopicName(largestPoll.topic) : '暂无'}”。`,
      `站内来源类型中占比最高的是“${largestSource ? largestSource[0] : '暂无'}”。`,
      `报告库已经把官方统计、年鉴和长期追踪调查放到同一层入口。`
    ].slice(0, 4).map((item) => `<article class="stack-card"><p>${escapeHtml(item)}</p></article>`).join('');
  }
}

function renderTrendCharts(analysis) {
  if (typeof Chart === 'undefined' || !analysis) return;
  window.__trendCharts = window.__trendCharts || {};
  const topicCanvas = byId('trendTopicChart');
  const platformCanvas = byId('trendPlatformChart');
  const deltaCanvas = byId('trendDeltaChart');
  const supportCanvas = byId('trendSupportChart');
  const signalCanvas = byId('trendSignalChart');
  const ranking = (analysis.topic_rankings || []).slice(0, 6);
  const platforms = analysis.platform_breakdown || [];

  if (topicCanvas) {
    if (window.__trendCharts.topic) window.__trendCharts.topic.destroy();
    window.__trendCharts.topic = new Chart(topicCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ranking.map((item) => item.label),
        datasets: [{
          label: '综合分值',
          data: ranking.map((item) => item.combined_score),
          backgroundColor: [CHART_PALETTE.cyan, CHART_PALETTE.pink, CHART_PALETTE.amber, CHART_PALETTE.green, CHART_PALETTE.orange, CHART_PALETTE.violet]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  if (platformCanvas) {
    if (window.__trendCharts.platform) window.__trendCharts.platform.destroy();
    window.__trendCharts.platform = new Chart(platformCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: platforms.map((item) => item.label),
        datasets: [{
          data: platforms.map((item) => item.item_count),
          backgroundColor: [CHART_PALETTE.cyan, CHART_PALETTE.pink, CHART_PALETTE.green, CHART_PALETTE.amber]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  if (deltaCanvas) {
    if (window.__trendCharts.delta) window.__trendCharts.delta.destroy();
    window.__trendCharts.delta = new Chart(deltaCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ranking.map((item) => item.label),
        datasets: [
          {
            label: '当前热度',
            data: ranking.map((item) => item.current_heat),
            backgroundColor: CHART_PALETTE.cyan
          },
          {
            label: '历史均值',
            data: ranking.map((item) => item.archive_average_heat),
            backgroundColor: CHART_PALETTE.light
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } }
      }
    });
  }

  if (supportCanvas) {
    if (window.__trendCharts.support) window.__trendCharts.support.destroy();
    window.__trendCharts.support = new Chart(supportCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ranking.map((item) => item.label),
        datasets: [
          {
            label: '证据条目',
            data: ranking.map((item) => item.evidence_count),
            backgroundColor: CHART_PALETTE.pink
          },
          {
            label: '讨论条目',
            data: ranking.map((item) => item.discussion_count),
            backgroundColor: CHART_PALETTE.green
          },
          {
            label: '报告入口',
            data: ranking.map((item) => item.report_count),
            backgroundColor: CHART_PALETTE.amber
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } }
      }
    });
  }

  if (signalCanvas) {
    if (window.__trendCharts.signal) window.__trendCharts.signal.destroy();
    const items = analysis.signal_distribution || [];
    window.__trendCharts.signal = new Chart(signalCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: items.map((item) => item.label),
        datasets: [{
          data: items.map((item) => item.count),
          backgroundColor: [CHART_PALETTE.pink, CHART_PALETTE.cyan, CHART_PALETTE.amber]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function renderWeeklyReport(containerId, weeklyReport, limit = 4) {
  const container = byId(containerId);
  if (!container || !weeklyReport) return;
  const sections = (weeklyReport.sections || []).slice(0, limit);
  container.innerHTML = [
    weeklyReport.headline ? html`
      <article class="stack-card">
        <small>本周主标题</small>
        <h3>${escapeHtml(weeklyReport.headline)}</h3>
        <p>${escapeHtml(weeklyReport.summary || '')}</p>
      </article>
    ` : '',
    ...sections.map((item) => html`
      <article class="stack-card">
        <small>${escapeHtml(item.label)}</small>
        <h3>${escapeHtml(item.headline)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <div class="meta-line"><span>${escapeHtml(item.action)}</span></div>
      </article>
    `)
  ].join('');
}

function renderAnalysisSignalChart(analysis) {
  if (typeof Chart === 'undefined' || !analysis) return;
  const canvas = byId('analysisSignalChart');
  if (!canvas) return;
  window.__analysisCharts = window.__analysisCharts || {};
  if (window.__analysisCharts.signal) window.__analysisCharts.signal.destroy();
  const ranking = (analysis.topic_rankings || []).slice(0, 6);
  window.__analysisCharts.signal = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ranking.map((item) => item.label),
      datasets: [
        {
          label: '综合分',
          data: ranking.map((item) => item.combined_score),
          backgroundColor: CHART_PALETTE.cyan
        },
        {
          label: '证据+报告+讨论',
          data: ranking.map((item) => item.evidence_count + item.report_count + item.discussion_count),
          backgroundColor: CHART_PALETTE.pink
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } }
    }
  });
}

function renderPollAttentionChart(topicSummary, analysis) {
  if (typeof Chart === 'undefined' || !analysis) return;
  const canvas = byId('pollAttentionChart');
  if (!canvas) return;
  const sampleByTopic = Object.fromEntries(topicSummary.map((item) => [item.topic, item.sample]));
  const ranking = (analysis.topic_rankings || []).filter((item) => sampleByTopic[item.topic]).slice(0, 8);
  window.__pollCharts = window.__pollCharts || {};
  if (window.__pollCharts.attention) window.__pollCharts.attention.destroy();
  window.__pollCharts.attention = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ranking.map((item) => item.label),
      datasets: [
        {
          label: '热点综合分',
          data: ranking.map((item) => item.combined_score),
          backgroundColor: CHART_PALETTE.cyan
        },
        {
          label: '投票样本量',
          data: ranking.map((item) => sampleByTopic[item.topic] || 0),
          backgroundColor: CHART_PALETTE.pink
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } }
    }
  });
}

function renderExposureCharts(digest) {
  if (typeof Chart === 'undefined' || !digest) return;
  const typeCanvas = byId('exposureTypeChart');
  const topicCanvas = byId('exposureTopicChart');
  const timelineCanvas = byId('exposureTimelineChart');
  const themeCanvas = byId('exposureThemeChart');
  window.__exposureCharts = window.__exposureCharts || {};

  if (typeCanvas) {
    if (window.__exposureCharts.type) window.__exposureCharts.type.destroy();
    window.__exposureCharts.type = new Chart(typeCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['问题暴露', '调查中', '背景说明'],
        datasets: [{
          data: [digest.exposure_summary.exposed, digest.exposure_summary.investigating, digest.exposure_topics.reduce((sum, item) => sum + item.context_count, 0)],
          backgroundColor: [CHART_PALETTE.pink, CHART_PALETTE.amber, CHART_PALETTE.cyan]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  if (topicCanvas) {
    if (window.__exposureCharts.topic) window.__exposureCharts.topic.destroy();
    window.__exposureCharts.topic = new Chart(topicCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: digest.exposure_topics.map((item) => item.label),
        datasets: [
          {
            label: '问题暴露',
            data: digest.exposure_topics.map((item) => item.exposed_count),
            backgroundColor: CHART_PALETTE.pink
          },
          {
            label: '调查中',
            data: digest.exposure_topics.map((item) => item.investigating_count),
            backgroundColor: CHART_PALETTE.amber
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  if (timelineCanvas) {
    if (window.__exposureCharts.timeline) window.__exposureCharts.timeline.destroy();
    const recent = (digest.exposure_timeline || []).slice(0, 8).reverse();
    window.__exposureCharts.timeline = new Chart(timelineCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: recent.map((item) => item.published_at),
        datasets: [{
          label: '近期曝光强度',
          data: recent.map((item) => (item.type === 'exposed' ? 3 : item.type === 'investigating' ? 2 : 1)),
          borderColor: CHART_PALETTE.pink,
          backgroundColor: CHART_PALETTE.redSoft,
          tension: 0.3,
          fill: true
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  if (themeCanvas) {
    if (window.__exposureCharts.theme) window.__exposureCharts.theme.destroy();
    const items = (digest.exposure_theme_breakdown || []).slice(0, 6);
    window.__exposureCharts.theme = new Chart(themeCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: items.map((item) => item.label),
        datasets: [{
          label: '条目数',
          data: items.map((item) => item.count),
          backgroundColor: CHART_PALETTE.amber
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }
}

function renderGuideCharts(digest) {
  if (typeof Chart === 'undefined' || !digest) return;
  const priorityCanvas = byId('guidePriorityChart');
  const topicCanvas = byId('guideTopicChart');
  const actionCanvas = byId('guideActionCategoryChart');
  const riskActionCanvas = byId('guideRiskActionChart');
  window.__guideCharts = window.__guideCharts || {};

  if (priorityCanvas) {
    if (window.__guideCharts.priority) window.__guideCharts.priority.destroy();
    const topTopics = digest.guide_topics.slice().sort((a, b) => b.priority_votes - a.priority_votes).slice(0, 6);
    window.__guideCharts.priority = new Chart(priorityCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: topTopics.map((item) => getTopicName(item.topic)),
        datasets: [{
          label: '最高票优先建议',
          data: topTopics.map((item) => item.priority_votes),
          backgroundColor: CHART_PALETTE.cyan
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  if (topicCanvas) {
    if (window.__guideCharts.topic) window.__guideCharts.topic.destroy();
    window.__guideCharts.topic = new Chart(topicCanvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels: digest.guide_topics.map((item) => getTopicName(item.topic)),
        datasets: [{
          label: '建议条数',
          data: digest.guide_topics.map((item) => item.safe_steps.length),
          backgroundColor: CHART_PALETTE.greenSoft,
          borderColor: CHART_PALETTE.green,
          pointBackgroundColor: CHART_PALETTE.pink
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  if (actionCanvas) {
    if (window.__guideCharts.action) window.__guideCharts.action.destroy();
    const items = (digest.guide_action_breakdown || []).slice(0, 6);
    window.__guideCharts.action = new Chart(actionCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: items.map((item) => item.label),
        datasets: [{
          data: items.map((item) => item.count),
          backgroundColor: [CHART_PALETTE.cyan, CHART_PALETTE.green, CHART_PALETTE.red, CHART_PALETTE.amber, CHART_PALETTE.violet, CHART_PALETTE.orange]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  if (riskActionCanvas) {
    if (window.__guideCharts.riskAction) window.__guideCharts.riskAction.destroy();
    const items = (digest.guide_topics || []).slice(0, 8);
    window.__guideCharts.riskAction = new Chart(riskActionCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: items.map((item) => getTopicName(item.topic)),
        datasets: [
          {
            label: '坑点数',
            data: items.map((item) => item.risk_points.length),
            backgroundColor: CHART_PALETTE.pink
          },
          {
            label: '动作数',
            data: items.map((item) => item.safe_steps.length),
            backgroundColor: CHART_PALETTE.green
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }
    });
  }
}

function getActiveWatchWindows(watchlist) {
  const now = new Date();
  const current = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return (watchlist.windows || []).filter((window) => {
    if (window.start_mmdd <= window.end_mmdd) {
      return window.start_mmdd <= current && current <= window.end_mmdd;
    }
    return current >= window.start_mmdd || current <= window.end_mmdd;
  });
}

function renderWatchlistCards(containerId, windows, includeItems = false) {
  const container = byId(containerId);
  if (!container) return;
  container.innerHTML = windows.map((window) => html`
    <article class="stack-card">
      <small>${escapeHtml(window.label)} · ${escapeHtml(window.start_mmdd)} - ${escapeHtml(window.end_mmdd)}</small>
      <h3>${escapeHtml(window.label)}</h3>
      ${includeItems ? (window.items || []).map((item) => `<p>${escapeHtml(item.title)}</p>`).join('') : `<p>当前窗口会优先把相关公共议题注入热点池，即使平台接口受限也不至于漏掉全国性议程。</p>`}
    </article>
  `).join('');
}

function createTopicHistoryCharts(topicId, data) {
  if (typeof Chart === 'undefined') return;
  const series = (data.timeseriesByTopic || {})[topicId];
  if (!series) return;

  const heatCanvas = byId(`heat_${topicId}`);
  const evidenceCanvas = byId(`evidence_${topicId}`);
  window.__topicHistoryCharts = window.__topicHistoryCharts || {};

  if (heatCanvas) {
    const key = `heat_${topicId}`;
    if (window.__topicHistoryCharts[key]) window.__topicHistoryCharts[key].destroy();
    window.__topicHistoryCharts[key] = new Chart(heatCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: series.heat_series.labels,
        datasets: [{
          label: '综合热度',
          data: series.heat_series.values,
          borderColor: CHART_PALETTE.cyan,
          backgroundColor: CHART_PALETTE.cyanSoft,
          tension: 0.35,
          fill: true,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  if (evidenceCanvas) {
    const key = `evidence_${topicId}`;
    if (window.__topicHistoryCharts[key]) window.__topicHistoryCharts[key].destroy();
    window.__topicHistoryCharts[key] = new Chart(evidenceCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: series.evidence_series.labels,
        datasets: [
          {
            label: '证据累计',
            data: series.evidence_series.evidence_values,
            borderColor: CHART_PALETTE.pink,
            backgroundColor: CHART_PALETTE.redSoft,
            tension: 0.25,
            pointRadius: 3
          },
          {
            label: '讨论累计',
            data: series.evidence_series.discussion_values,
            borderColor: CHART_PALETTE.green,
            backgroundColor: CHART_PALETTE.greenSoft,
            tension: 0.25,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } }
      }
    });
  }
}

function relatedLinks(ids, lookup) {
  return (ids || []).map((id) => lookup[id]).filter(Boolean);
}

function createTopicChart(canvasId, topic) {
  const canvas = byId(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  const datasets = topic.chart.datasets.map((dataset) => ({
    label: dataset.label,
    data: dataset.data,
    borderColor: dataset.color,
    backgroundColor: `${dataset.color}33`,
    fill: topic.chart.datasets.length === 1,
    tension: 0.35,
    borderWidth: 2.5,
    pointRadius: 3
  }));

  new Chart(canvas.getContext('2d'), {
    type: topic.chart.datasets.length > 1 ? 'line' : 'line',
    data: { labels: topic.chart.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,0.06)' } },
        y: { grid: { color: 'rgba(0,0,0,0.06)' }, title: { display: true, text: topic.chart.unit } }
      }
    }
  });
}

function renderAnalysis(data) {
  const tabs = byId('topicTabs');
  const sections = byId('analysisSections');
  if (!tabs || !sections) return;
  const analysis = data.hotspot_analysis || {};

  renderAuroraBoard('analysisAuroraBoard', [
    {
      eyebrow: 'Topic Matrix',
      value: `${data.topics.length}`,
      title: '核心议题覆盖',
      body: '分析页把教育、医疗、住房、就业、养老、科技、食品和综合民生放进统一分析框架。',
      note: `${data.policy_links.length} 个政策与办事入口`
    },
    {
      eyebrow: 'Evidence Stack',
      value: `${data.papers.length + data.evidence_records.length}`,
      title: '论文与证据储备',
      body: '论文卡片和证据库一起构成分析层的底座，帮助热点讨论回到可核对事实。'
    },
    {
      eyebrow: 'Weekly Lens',
      value: `${((analysis.weekly_report || {}).sections || []).length}`,
      title: '本周周报分节',
      body: '分析页顶部先给一层结构判断，帮助快速了解这周哪些议题在升温。'
    },
    {
      eyebrow: 'Deep Links',
      value: `${data.reports.length}`,
      title: '延伸阅读入口',
      body: '从单一议题往外跳，可以继续追到年鉴、长期调查和研究项目主页。'
    }
  ]);

  renderSummaryGrid('analysisSummaryGrid', [
    {
      label: '议题覆盖',
      value: `${data.topics.length} 个核心议题`,
      note: '教育、医疗、住房、就业、养老、科技、食品与综合民生都在同一套分析框架里。'
    },
    {
      label: '证据储备',
      value: `${data.papers.length} 篇论文卡片`,
      note: '论文卡片与政策、讨论、热点快照一起联动，避免只看单条社媒观点。'
    },
    {
      label: '政策与办事',
      value: `${data.policy_links.length} 个官方入口`,
      note: '把国家统计局、部委、12315 等入口直接放进议题页，便于从讨论跳回办事路径。'
    },
    {
      label: '延伸资料',
      value: `${data.reports.length} 份报告与调查`,
      note: '新增独立报告库后，议题页不只展示摘要，也能继续追到年鉴、调查与项目主页。'
    }
  ]);

  const analysisReportGrid = byId('analysisReportGrid');
  if (analysisReportGrid) {
    analysisReportGrid.innerHTML = pickFeaturedReports(data, data.topics.map((topic) => topic.id), 6).map(reportStackMarkup).join('');
  }
  renderWeeklyReport('analysisBriefList', analysis.weekly_report, 4);
  renderAnalysisSignalChart(analysis);

  tabs.innerHTML = `<div class="tab-row">${data.topics.map((topic, index) => `<button class="tab-button ${index === 0 ? 'active' : ''}" data-target="${escapeHtml(topic.id)}">${escapeHtml(topic.emoji)} ${escapeHtml(topic.label)}</button>`).join('')}</div>`;
  sections.innerHTML = data.topics.map((topic) => {
    const papers = relatedLinks(topic.paper_ids, data.papersById);
    const policies = relatedLinks(topic.policy_link_ids, data.policiesById);
    const discussions = relatedLinks(topic.discussion_ids, data.discussionsById);
    const chartId = `chart_${topic.id}`;
    const heatChartId = `heat_${topic.id}`;
    const evidenceChartId = `evidence_${topic.id}`;
    return html`
      <article class="analysis-section" id="${escapeHtml(topic.id)}">
        <div class="analysis-header">
          <div>
            <span class="eyebrow">${escapeHtml(topic.emoji)} ${escapeHtml(topic.label)}</span>
            <h2>${escapeHtml(topic.summary)}</h2>
          </div>
          <div class="meta-line"><span>热点摘要：${escapeHtml(topic.hot_summary)}</span></div>
        </div>
        <div class="indicator-grid">
          ${topic.indicators.map((item) => html`
            <div class="indicator-card">
              <small>${escapeHtml(item.source)}</small>
              <strong>${escapeHtml(item.value)}</strong>
              <div>${escapeHtml(item.label)}</div>
              <small>${escapeHtml(item.trend)}</small>
            </div>
          `).join('')}
        </div>
        <div class="analysis-layout">
          <div class="stack-list">
            <div class="stack-card">
              <h3>热点摘要</h3>
              <p>${escapeHtml(topic.hot_summary)}</p>
            </div>
            <div class="stack-card">
              <h3>政策进展</h3>
              ${topic.policy_updates.map((item) => html`<div class="timeline-item"><div class="timeline-date">${escapeHtml(item.date)} · ${escapeHtml(item.source_name)}</div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.summary)}</p></div>`).join('')}
            </div>
            <div class="stack-card">
              <h3>论文证据</h3>
              ${papers.map((paper) => html`<div class="timeline-item"><div class="timeline-date">${paper.year} · DOI</div><strong>${escapeHtml(paper.title)}</strong><p>${escapeHtml(paper.abstract)}</p><div class="topic-actions"><a class="topic-link" href="${escapeHtml(paper.url)}" target="_blank" rel="noreferrer">打开论文</a></div></div>`).join('')}
            </div>
            <div class="stack-card">
              <h3>办事与政策入口</h3>
              <div class="link-pills">${policies.map((policy) => `<a class="link-pill" href="${escapeHtml(policy.url)}" target="_blank" rel="noreferrer">${escapeHtml(policy.label)} · ${escapeHtml(policy.source_name)}</a>`).join('')}</div>
            </div>
            <div class="stack-card">
              <h3>相关讨论</h3>
              ${discussions.length ? discussions.map((item) => `<div class="timeline-item"><div class="timeline-date">${formatDate(item.created_at)} · 点赞 ${item.likes}</div><p>${escapeHtml(item.excerpt)}</p></div>`).join('') : '<p>当前没有已归档的精选讨论，后续会从 Discussions 自动导入。</p>'}
            </div>
          </div>
          <div class="chart-wrap">
            <h3>${escapeHtml(topic.chart.title)}</h3>
            <div style="height:320px"><canvas id="${chartId}"></canvas></div>
            <div class="stack-list" style="margin-top:16px;">
              ${topic.takeaways.map((item) => `<div class="stack-card"><p>${escapeHtml(item)}</p></div>`).join('')}
            </div>
          </div>
          <div class="feature-grid" style="margin-top:18px;">
            <article class="chart-wrap">
              <h3>热度变化趋势线</h3>
              <div style="height:220px"><canvas id="${heatChartId}"></canvas></div>
            </article>
            <article class="chart-wrap">
              <h3>证据积累曲线</h3>
              <div style="height:220px"><canvas id="${evidenceChartId}"></canvas></div>
            </article>
          </div>
        </div>
      </article>
    `;
  }).join('');

  data.topics.forEach((topic) => createTopicChart(`chart_${topic.id}`, topic));
  data.topics.forEach((topic) => createTopicHistoryCharts(topic.id, data));

  tabs.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      tabs.querySelectorAll('.tab-button').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      const target = byId(button.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderTrends(data) {
  const analysis = data.hotspot_analysis || {};
  const rankingByTopic = Object.fromEntries((analysis.topic_rankings || []).map((item) => [item.topic, item]));
  const activeWindows = getActiveWatchWindows(data.editorial_watchlist || { windows: [] });

  renderDiagnosticChips('trendHeroDiagnostics', [
    { label: 'EDITION', value: ((analysis.express_brief || {}).edition_date_label || '更新中').replace('2026年', '26年') },
    { label: 'SOCIAL', value: `${(analysis.capture_overview || {}).social_item_count || 0} SNAP` },
    { label: 'SIGNAL', value: `${(analysis.signal_distribution || [])[0]?.count || 0} UP` },
    { label: 'WATCH', value: `${activeWindows.length || ((data.editorial_watchlist || {}).windows || []).length} WINDOWS` }
  ]);

  renderAuroraBoard('trendAuroraBoard', [
    {
      eyebrow: 'Edition',
      value: (analysis.express_brief || {}).edition_label || 'AUTO',
      title: (analysis.express_brief || {}).edition_date_label || '自动快报',
      body: '热点页现在按自动快报模式阅读，先看本轮更新版本，再判断信号强弱。',
      note: (analysis.express_brief || {}).headline || '快报标题生成中'
    },
    {
      eyebrow: 'Top Signal',
      value: `${(analysis.topic_rankings || [])[0]?.combined_score || 0}`,
      title: (analysis.topic_rankings || [])[0] ? `${(analysis.topic_rankings || [])[0].label} 当前领跑` : '热点排序生成中',
      body: '综合分领先意味着这个议题同时占住了热度、证据和讨论优势。'
    },
    {
      eyebrow: 'Social Deck',
      value: `${(analysis.capture_overview || {}).social_item_count || 0}`,
      title: '社媒快照总数',
      body: '公开抓取、回退快照和人工审核池会共同组成今天的社媒监测面。'
    },
    {
      eyebrow: 'Watch Windows',
      value: `${activeWindows.length || ((data.editorial_watchlist || {}).windows || []).length}`,
      title: '时令专题窗口',
      body: '全国性节点议题会在这里被固定看见，避免因为接口受限被平台噪声淹没。'
    }
  ]);

  renderCommandDeck('trendSignalMatrix', (analysis.topic_rankings || []).slice(0, 3).map((item, index) => ({
    eyebrow: `Lane 0${index + 1}`,
    title: `${item.label} / ${item.signal_label}`,
    body: item.watch_reason,
    html: renderSignalMeters([
      { label: 'Score', value: item.combined_score / 3, display: `${item.combined_score}`, note: '综合分' },
      { label: 'Current', value: item.current_heat, display: `${item.current_heat}`, note: '当前热度' },
      { label: 'Social', value: item.social_average_heat, display: `${item.social_average_heat}`, note: '社媒均值' },
      { label: 'Support', value: (item.evidence_count + item.discussion_count + item.report_count) * 18, display: `${item.evidence_count + item.discussion_count + item.report_count}`, note: '证据+讨论+报告' }
    ])
  })));

  renderSummaryGrid('hotspotSummaryGrid', analysis.summary_cards || []);
  const trendEditionTitle = byId('trendEditionTitle');
  if (trendEditionTitle && analysis.express_brief) {
    trendEditionTitle.textContent = `${analysis.express_brief.edition_date_label}快报`;
  }
  const trendExpressBoard = byId('trendExpressBoard');
  if (trendExpressBoard) {
    const express = analysis.express_brief || {};
    trendExpressBoard.innerHTML = [
      express.headline ? html`
        <article class="stack-card">
          <small>${escapeHtml(express.edition_timestamp_label || '')}</small>
          <h3>${escapeHtml(express.headline)}</h3>
          <p>${escapeHtml(express.summary || '')}</p>
        </article>
      ` : '',
      ...((express.sections || []).slice(0, 4).map((item) => html`
        <article class="stack-card">
          <small>${escapeHtml(item.label)} · ${escapeHtml(express.edition_label || '')}</small>
          <h3>${escapeHtml(item.headline)}</h3>
          <p>${escapeHtml(item.summary)}</p>
          ${item.opinion_hint ? `<p><strong>当前最强诉求：</strong>${escapeHtml(item.opinion_hint)}</p>` : ''}
        </article>
      `))
    ].join('');
  }
  renderWatchlistCards('watchlistActiveGrid', activeWindows.length ? activeWindows : (data.editorial_watchlist.windows || []).slice(0, 2), true);
  renderWatchlistCards('watchlistCalendarGrid', (data.editorial_watchlist.windows || []), false);

  const trendSignalNotes = byId('trendSignalNotes');
  if (trendSignalNotes) {
    trendSignalNotes.innerHTML = (analysis.lead_brief || []).map((item) => `<article class="stack-card"><p>${escapeHtml(item)}</p></article>`).join('');
  }

  const topicRankList = byId('topicRankList');
  if (topicRankList) {
    topicRankList.innerHTML = (analysis.topic_rankings || []).slice(0, 6).map((item, index) => html`
      <article class="stack-card">
        <small>第 ${index + 1} 位 · ${escapeHtml(item.signal_label)}</small>
        <h3>${escapeHtml(item.label)} · 综合分 ${escapeHtml(item.combined_score)}</h3>
        <div class="meta-line">
          <span>当前热度 ${escapeHtml(item.current_heat)}</span>
          <span>社媒均值 ${escapeHtml(item.social_average_heat)}</span>
          <span>较历史 ${escapeHtml(formatSignedNumber(item.delta_vs_archive))}</span>
        </div>
        <p>${escapeHtml(item.watch_reason)}</p>
      </article>
    `).join('');
  }

  const trendOpinionBoard = byId('trendOpinionBoard');
  if (trendOpinionBoard) {
    trendOpinionBoard.innerHTML = (analysis.opinion_overview || []).slice(0, 6).map((item) => html`
      <article class="stack-card">
        <small>${escapeHtml(item.label)} · ${escapeHtml(item.signal_label)}</small>
        <h3>${escapeHtml(item.leading_option || '主要诉求整理中')}</h3>
        <p>${escapeHtml(item.board_summary || '正在整理站内建议摘要。')}</p>
        <div class="meta-line">
          <span>样本 ${escapeHtml(item.sample_total || 0)}</span>
          <span>最高票 ${escapeHtml(item.leading_votes || 0)}</span>
          <span>综合分 ${escapeHtml(item.combined_score)}</span>
        </div>
        ${item.key_suggestions && item.key_suggestions.length ? `<p>建议重点：${escapeHtml(item.key_suggestions.join('；'))}</p>` : ''}
        ${item.latest_exposure_title ? `<p><strong>关联曝光：</strong>${escapeHtml(item.latest_exposure_title)}</p>` : ''}
      </article>
    `).join('');
  }

  const trendNarrativeBoard = byId('trendNarrativeBoard');
  if (trendNarrativeBoard) {
    const express = analysis.express_brief || {};
    const sections = ((analysis.weekly_report || {}).sections || []).slice(0, 4);
    const distribution = (analysis.signal_distribution || []).map((item) => `${item.label} ${item.count} 个议题`).join('，');
    trendNarrativeBoard.innerHTML = [
      ...((express.chart_takeaways || []).slice(0, 3)),
      ...(sections.map((item) => `${item.label}：${item.summary} ${item.action}`)),
      ...((express.watch_alerts || []).slice(0, 2).map((item) => `${item.label}提醒：${item.title}。${item.detail}`)),
      distribution ? `当前信号结构：${distribution}。` : '',
      '阅读顺序建议：先看综合排序，再对照历史均值，最后核对证据、讨论和报告是否同步增长。'
    ].filter(Boolean).slice(0, 5).map((item) => `<article class="stack-card"><p>${escapeHtml(item)}</p></article>`).join('');
  }

  byId('currentTrendGrid').innerHTML = data.trend_current.map((item) => {
    const ranking = rankingByTopic[item.topic];
    return html`
    <article class="trend-card">
      <div class="meta-line"><span>${escapeHtml(getTopicName(item.topic))}</span><span>热度 ${item.heat_score}</span><span>${escapeHtml(item.snapshot_date)}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      ${ranking ? `<div class="meta-line"><span>综合分 ${escapeHtml(ranking.combined_score)}</span><span>${escapeHtml(ranking.signal_label)}</span><span>较历史 ${escapeHtml(formatSignedNumber(ranking.delta_vs_archive))}</span></div>` : ''}
      <div class="link-pills" style="margin-top:12px;">${item.source_links.map((link) => `<a class="link-pill" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join('')}</div>
    </article>
  `;
  }).join('');

  byId('trendArchiveList').innerHTML = data.trend_archive.map((item) => html`
    <article class="timeline-item">
      <div class="timeline-date">${escapeHtml(item.snapshot_date)} · ${escapeHtml(getTopicName(item.topic))} · 热度 ${item.heat_score}</div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
    </article>
  `).join('');

  const trendSources = data.sources.filter((item) => item.category === 'public-link' || item.category === 'feed-proxy' || item.id === 'gov-cn');
  byId('trendSourceLinks').innerHTML = trendSources.map((source) => html`
    <article class="source-card">
      <small>${escapeHtml(source.category)}</small>
      <h3>${escapeHtml(source.name)}</h3>
      <p>${escapeHtml(source.note)}</p>
      <div class="topic-actions"><a class="topic-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">打开公开入口</a></div>
    </article>
  `).join('');

  const socialTrendGrid = byId('socialTrendGrid');
  const socialPlatformStatus = byId('socialPlatformStatus');
  const socialStrategyCards = byId('socialStrategyCards');
  const socialReviewQueue = byId('socialReviewQueue');
  if (socialTrendGrid && socialPlatformStatus) {
    socialTrendGrid.innerHTML = data.social_hot_topics.items.map((item) => html`
      <article class="trend-card">
        <div class="meta-line"><span>${escapeHtml(item.platform)}</span><span>${escapeHtml(getTopicName(item.topic))}</span><span>${escapeHtml(item.snapshot_date)}</span></div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <div class="meta-line"><span>状态：${escapeHtml(item.fetch_status)}</span><span>热度 ${item.heat}</span></div>
        <div class="topic-actions"><a class="topic-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开来源</a></div>
      </article>
    `).join('');
    socialPlatformStatus.innerHTML = [
      ...Object.entries(data.social_hot_topics.platform_status).map(([platform, status]) => html`
      <article class="stack-card">
        <small>${escapeHtml(platform)}</small>
        <h3>${escapeHtml(status.label)}</h3>
        <p>${escapeHtml(status.note)}</p>
        <div class="meta-line"><span>最近尝试：${formatDate(status.last_attempt)}</span><span>${status.last_success ? `最近成功：${formatDate(status.last_success)}` : '暂无成功抓取'}</span></div>
      </article>
    `),
      ...((analysis.platform_breakdown || []).map((item) => html`
      <article class="stack-card">
        <small>${escapeHtml(item.label)} · 监测结构</small>
        <h3>${escapeHtml(item.status_label)}</h3>
        <p>${escapeHtml(item.note)}</p>
        <div class="meta-line"><span>${item.item_count} 条快照</span><span>均值 ${escapeHtml(item.average_heat)}</span><span>最高议题 ${escapeHtml(getTopicName(item.top_topic))}</span></div>
      </article>
    `))
    ].join('');
  }
  if (socialStrategyCards) {
    socialStrategyCards.innerHTML = data.social_hot_topics.strategy_layers.map((layer) => html`
      <article class="stack-card">
        <small>${escapeHtml(layer.id)}</small>
        <h3>${escapeHtml(layer.title)}</h3>
        <p>${escapeHtml(layer.detail)}</p>
        <div class="meta-line"><span>状态：${escapeHtml(layer.label)}</span></div>
      </article>
    `).join('');
  }
  if (socialReviewQueue) {
    socialReviewQueue.innerHTML = data.social_hot_topics.review_pool.map((item) => html`
      <article class="stack-card">
        <small>${escapeHtml(item.platform)} · ${escapeHtml(getTopicName(item.topic))}</small>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.reason)}</p>
        <div class="meta-line"><span>${escapeHtml(item.status)}</span></div>
        <p>${escapeHtml(item.action)}</p>
      </article>
    `).join('');
  }

  renderTrendCharts(analysis);
}

function renderEvidence(data) {
  const list = byId('evidenceList');
  const filters = byId('evidenceFilters');
  const clarifyList = byId('evidenceClarifyList');
  const rumorTags = byId('evidenceRumorTags');
  if (!list || !filters) return;

  const evidenceTopics = [...new Set(data.evidence_records.map((item) => item.topic))];
  const exposedCount = data.evidence_records.filter((item) => item.type === 'exposed').length;
  const investigatingCount = data.evidence_records.filter((item) => item.type === 'investigating').length;
  renderSummaryGrid('evidenceSummaryGrid', [
    {
      label: '证据条目',
      value: `${data.evidence_records.length} 条`,
      note: '每条记录都带有来源、结论、历史更新和关联政策入口。'
    },
    {
      label: '问题暴露',
      value: `${exposedCount} 条`,
      note: '优先标注公众感知最强、制度体验差异最明显的议题。'
    },
    {
      label: '持续核查',
      value: `${investigatingCount} 条`,
      note: '对仍在演变的争议点保留“调查中”状态，避免过度下结论。'
    },
    {
      label: '覆盖广度',
      value: `${evidenceTopics.length} 个议题`,
      note: '证据库已经把食品、医疗、教育、住房、就业、养老、科技与综合民生串了起来。'
    }
  ]);

  const evidenceReportGrid = byId('evidenceReportGrid');
  if (evidenceReportGrid) {
    evidenceReportGrid.innerHTML = pickFeaturedReports(data, evidenceTopics, 6).map(reportStackMarkup).join('');
  }

  if (clarifyList) {
    clarifyList.innerHTML = ((data.insight_digest || {}).rumor_watchlist || []).slice(0, 6).map((item) => html`
      <article class="stack-card">
        <small>${escapeHtml(item.kind_label)} · ${escapeHtml(item.label)}</small>
        <h3>${escapeHtml(item.title)}</h3>
        <p><strong>常见说法：</strong>${escapeHtml(item.claim)}</p>
        <p><strong>站内澄清：</strong>${escapeHtml(item.verdict)}</p>
        ${item.clarification_points && item.clarification_points.length ? `<p>证据重点：${escapeHtml(item.clarification_points.join('；'))}</p>` : ''}
      </article>
    `).join('');
  }

  if (rumorTags) {
    rumorTags.innerHTML = ((data.insight_digest || {}).rumor_tag_breakdown || []).slice(0, 8).map((item) => html`
      <article class="stack-card">
        <small>高频标签</small>
        <h3>${escapeHtml(item.label)}</h3>
        <p>当前关联 ${escapeHtml(item.count)} 条澄清或避坑记录。</p>
      </article>
    `).join('');
  }

  const topics = ['all', ...new Set(data.evidence_records.map((item) => item.topic))];
  const types = ['all', ...new Set(data.evidence_records.map((item) => item.type))];
  let currentTopic = 'all';
  let currentType = 'all';

  function draw() {
    const items = data.evidence_records.filter((item) => (currentTopic === 'all' || item.topic === currentTopic) && (currentType === 'all' || item.type === currentType));
    list.innerHTML = items.map((item) => {
      const sources = (item.source_ids || []).map((id) => data.sourcesById[id]).filter(Boolean);
      const policies = relatedLinks(item.policy_link_ids, data.policiesById);
      const papers = relatedLinks(item.paper_ids, data.papersById);
      return html`
        <article class="evidence-card">
          <div class="meta-line"><span class="evidence-type">${escapeHtml(item.type)}</span><span>${escapeHtml(getTopicName(item.topic))}</span><span>${escapeHtml(item.published_at)}</span></div>
          <h3>${escapeHtml(item.title)}</h3>
          <p><strong>常见说法：</strong>${escapeHtml(item.claim)}</p>
          <p><strong>站内结论：</strong>${escapeHtml(item.verdict)}</p>
          <p>${escapeHtml(item.summary)}</p>
          ${item.risk_tags && item.risk_tags.length ? `<div class="tag-row" style="margin-top:10px;">${item.risk_tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
          ${item.clarification_points && item.clarification_points.length ? `<ul class="suggest-list">${item.clarification_points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>` : ''}
          ${item.scam_signals && item.scam_signals.length ? `<p><strong>识别信号：</strong>${escapeHtml(item.scam_signals.join('；'))}</p>` : ''}
          <div class="link-pills" style="margin-top:12px;">${sources.map((source) => `<a class="link-pill" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">来源：${escapeHtml(source.name)}</a>`).join('')}${policies.map((policy) => `<a class="link-pill" href="${escapeHtml(policy.url)}" target="_blank" rel="noreferrer">${escapeHtml(policy.label)}</a>`).join('')}${papers.map((paper) => `<a class="link-pill" href="${escapeHtml(paper.url)}" target="_blank" rel="noreferrer">论文 DOI</a>`).join('')}</div>
          <div class="stack-list" style="margin-top:14px;">${item.history.map((entry) => `<div class="timeline-item"><p>${escapeHtml(entry)}</p></div>`).join('')}</div>
        </article>
      `;
    }).join('');
  }

  filters.innerHTML = `<div class="filter-row">${topics.map((topic, index) => `<button type="button" class="filter-pill ${index === 0 ? 'active' : ''}" data-kind="topic" data-value="${topic}">${escapeHtml(getTopicName(topic))}</button>`).join('')}${types.map((type, index) => `<button type="button" class="filter-pill ${index === 0 ? 'active' : ''}" data-kind="type" data-value="${type}">${escapeHtml(getTypeName(type))}</button>`).join('')}</div>`;
  filters.querySelectorAll('.filter-pill').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.kind;
      const value = button.dataset.value;
      filters.querySelectorAll(`.filter-pill[data-kind="${kind}"]`).forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      if (kind === 'topic') currentTopic = value;
      if (kind === 'type') currentType = value;
      draw();
    });
  });
  draw();
}

function renderExposure(data) {
  const digest = data.insight_digest;
  const summaryGrid = byId('exposureSummaryGrid');
  const topicList = byId('exposureTopicList');
  const timeline = byId('exposureTimeline');
  const caseGrid = byId('exposureCaseGrid');
  const focusList = byId('exposureFocusList');
  const adviceGrid = byId('exposureAdviceGrid');
  const caseLibrary = byId('exposureCaseLibrary');
  const routeTree = byId('exposureRouteTree');
  if (!digest || !summaryGrid || !topicList || !timeline || !caseGrid) return;

  renderDiagnosticChips('exposureHeroDiagnostics', [
    { label: 'FOCUS', value: digest.exposure_summary.focus_topic || '监测中' },
    { label: 'CASES', value: `${digest.exposure_summary.exposed + digest.exposure_summary.investigating}` },
    { label: 'ROUTES', value: `${(digest.complaint_routes || []).length}` },
    { label: 'STATUS', value: 'RISK MAP' }
  ]);

  renderAuroraBoard('exposureAuroraBoard', [
    {
      eyebrow: 'Risk Total',
      value: `${digest.exposure_summary.total}`,
      title: '曝光页总条目',
      body: '把问题暴露、调查中和背景说明都放在同一页里，便于一起看风险层次。'
    },
    {
      eyebrow: 'Exposed',
      value: `${digest.exposure_summary.exposed}`,
      title: '明确暴露条目',
      body: '已经具备更清晰证据支撑、值得优先查看的高风险问题。'
    },
    {
      eyebrow: 'Investigating',
      value: `${digest.exposure_summary.investigating}`,
      title: '持续核查中',
      body: '对仍在变化的议题保持开放状态，避免提前把讨论说死。'
    },
    {
      eyebrow: 'Routes',
      value: `${(digest.complaint_routes || []).length}`,
      title: `${digest.exposure_summary.focus_topic || '当前'} 反馈路径`,
      body: '曝光页不只告诉你问题，还会尽量给出可回到官方入口的处理路径。'
    }
  ]);

  renderCommandDeck('exposureRiskBoard', (digest.exposure_case_library || []).slice(0, 3).map((item, index) => ({
    eyebrow: `Risk 0${index + 1}`,
    title: `${item.label} / ${item.risk_level}`,
    body: item.verdict,
    html: renderSignalMeters([
      { label: 'Level', value: item.risk_level === '高风险' ? 92 : 64, display: item.risk_level, note: '风险等级' },
      { label: 'Routes', value: ((item.policy_targets || []).length || 1) * 28, display: `${(item.policy_targets || []).length}`, note: '可用官方入口' },
      { label: 'Status', value: item.risk_level === '高风险' ? 88 : 58, display: item.risk_note, note: '处理提示' }
    ])
  })));

  summaryGrid.innerHTML = [
    { label: '问题条目', value: `${digest.exposure_summary.total}`, note: '当前证据库中的全部记录，包含问题暴露、调查中与背景说明。' },
    { label: '明确暴露', value: `${digest.exposure_summary.exposed}`, note: '站内已判断为高风险、强体验落差或明显制度问题的条目。' },
    { label: '持续核查', value: `${digest.exposure_summary.investigating}`, note: '仍在动态演化、需要继续跟踪官方信息和公开讨论的条目。' },
    { label: '最近更新', value: `${digest.exposure_summary.latest_date || '暂无'}`, note: '曝光页会优先展示最新整理的证据条目。' },
    { label: '覆盖议题', value: `${digest.exposure_summary.covered_topics || 0}`, note: '不仅看单个事件，也看它牵动的是教育、医疗、住房还是消费治理。' },
    { label: '关联入口', value: `${digest.exposure_summary.policy_refs || 0}`, note: `当前曝光页最该优先看的议题是“${digest.exposure_summary.focus_topic || '整理中'}”。` }
  ].map(summaryCardMarkup).join('');

  topicList.innerHTML = digest.exposure_topics.map((item) => html`
    <article class="stack-card">
      <small>${escapeHtml(item.label)}</small>
      <h3>暴露 ${item.exposed_count} / 调查中 ${item.investigating_count}</h3>
      <p>${escapeHtml(item.latest_titles[0] || '当前暂无最新条目。')}</p>
    </article>
  `).join('');

  timeline.innerHTML = digest.exposure_timeline.slice(0, 10).map((item) => html`
    <article class="timeline-item">
      <div class="timeline-date">${escapeHtml(item.published_at)} · ${escapeHtml(getTopicName(item.topic))} · ${escapeHtml(getTypeName(item.type))}</div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.verdict)}</p>
    </article>
  `).join('');

  caseGrid.innerHTML = digest.exposure_timeline.filter((item) => ['exposed', 'investigating'].includes(item.type)).slice(0, 8).map((item) => {
    const policies = relatedLinks(item.policy_link_ids, data.policiesById);
    return html`
      <article class="evidence-card">
        <div class="meta-line"><span>${escapeHtml(getTopicName(item.topic))}</span><span>${escapeHtml(getTypeName(item.type))}</span><span>${escapeHtml(item.published_at)}</span></div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <p><strong>站内判断：</strong>${escapeHtml(item.verdict)}</p>
        <div class="topic-actions">${policies.map((policy) => `<a class="topic-link" href="${escapeHtml(policy.url)}" target="_blank" rel="noreferrer">${escapeHtml(policy.label)}</a>`).join('')}</div>
      </article>
    `;
  }).join('');

  if (focusList) {
    focusList.innerHTML = (digest.exposure_theme_breakdown || []).slice(0, 6).map((item) => html`
      <article class="stack-card">
        <small>问题族群</small>
        <h3>${escapeHtml(item.label)}</h3>
        <p>当前证据库中与这一类问题相关的条目有 ${escapeHtml(item.count)} 条，适合优先补公开口径和办事路径。</p>
      </article>
    `).join('');
  }

  if (adviceGrid) {
    adviceGrid.innerHTML = (data.polls.action_cards || []).slice(0, 4).map((item) => html`
      <article class="stack-card">
        <small>应对动作</small>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.body)}</p>
        <div class="topic-actions"><a class="topic-link" href="${escapeHtml(item.url)}" ${/^https?:/.test(item.url) ? 'target="_blank" rel="noreferrer"' : ''}>${escapeHtml(item.label)}</a></div>
      </article>
    `).join('');
  }

  if (caseLibrary) {
    caseLibrary.innerHTML = (digest.exposure_case_library || []).slice(0, 8).map((item) => html`
      <article class="evidence-card">
        <div class="meta-line">
          <span>${escapeHtml(item.label)}</span>
          <span class="risk-badge ${item.risk_level === '高风险' ? 'is-high' : 'is-watch'}">${escapeHtml(item.risk_level)}</span>
          <span>${escapeHtml(item.published_at)}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <p><strong>站内判断：</strong>${escapeHtml(item.verdict)}</p>
        <p><strong>提醒：</strong>${escapeHtml(item.risk_note)}</p>
        <div class="topic-actions">
          ${(item.policy_targets || []).map((target) => `<a class="topic-link" href="${escapeHtml(target.url)}" target="_blank" rel="noreferrer">${escapeHtml(target.label)}</a>`).join('')}
        </div>
      </article>
    `).join('');
  }

  if (routeTree) {
    routeTree.innerHTML = (digest.complaint_routes || []).map((item) => html`
      <article class="source-card route-card">
        <small>${escapeHtml(item.label)} · ${escapeHtml(item.risk_level)}</small>
        <h3>${escapeHtml(item.priority_action || `${item.label}处理路径`)}</h3>
        <p>${escapeHtml(item.when_to_use)}</p>
        <div class="route-steps">
          ${(item.steps || []).map((step, index) => `<div class="route-step"><span>${index + 1}</span><p>${escapeHtml(step)}</p></div>`).join('')}
        </div>
        <div class="topic-actions">
          ${(item.policy_targets || []).map((target) => `<a class="topic-link" href="${escapeHtml(target.url)}" target="_blank" rel="noreferrer">${escapeHtml(target.label)}</a>`).join('')}
        </div>
      </article>
    `).join('');
  }

  renderExposureCharts(digest);
}

function renderGuide(data) {
  const digest = data.insight_digest;
  const summaryGrid = byId('guideSummaryGrid');
  const highlightList = byId('guideHighlightList');
  const guideGrid = byId('guideTopicGrid');
  const actionGrid = byId('guideActionGrid');
  const priorityList = byId('guidePriorityList');
  const narrativeList = byId('guideNarrativeList');
  const rumorList = byId('guideRumorList');
  const checklistList = byId('guideChecklistList');
  if (!digest || !summaryGrid || !highlightList || !guideGrid || !actionGrid) return;

  renderAuroraBoard('guideAuroraBoard', [
    {
      eyebrow: 'Guide Matrix',
      value: `${digest.guide_summary.topic_count}`,
      title: '覆盖议题数',
      body: '防踩坑页把跨议题建议重组成更容易执行的动作清单。'
    },
    {
      eyebrow: 'Action Stack',
      value: `${digest.guide_summary.advice_count}`,
      title: '建议总量',
      body: '这些建议来自投票建议板、站内讨论摘录和编辑提炼的行动项。'
    },
    {
      eyebrow: 'Priority Focus',
      value: `${digest.guide_summary.priority_count}`,
      title: '优先议题数',
      body: '每个议题都会尽量标出当前最值得优先做的一件事。'
    },
    {
      eyebrow: 'Action Types',
      value: `${digest.guide_summary.action_type_count || 0}`,
      title: '动作类型',
      body: '把建议改写成信息公开、服务优化、权益保障和供给扩容等更具体类别。'
    }
  ]);

  summaryGrid.innerHTML = [
    { label: '议题覆盖', value: `${digest.guide_summary.topic_count}`, note: '每个议题都整理了高频建议、常见坑点和可执行动作。' },
    { label: '建议总数', value: `${digest.guide_summary.advice_count}`, note: '来自投票建议板与站内编辑整理的可执行经验。' },
    { label: '优先议题', value: `${digest.guide_summary.priority_count}`, note: '已根据投票最高票建议为每个议题标出最优先改进项。' },
    { label: '动作类型', value: `${digest.guide_summary.action_type_count || 0}`, note: '建议已按信息公开、服务优化、供给扩容、权益保障等动作类型重组。' },
    { label: '阅读方式', value: '先看坑点，再看动作', note: '先知道最容易踩哪里，再看怎么避坑、去哪投诉、去哪核查。' }
  ].map(summaryCardMarkup).join('');

  if (rumorList) {
    rumorList.innerHTML = (digest.rumor_watchlist || []).slice(0, 6).map((item) => html`
      <article class="stack-card">
        <small>${escapeHtml(item.label)} · ${escapeHtml(item.kind_label)}</small>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.verdict)}</p>
        ${item.scam_signals && item.scam_signals.length ? `<p><strong>识别信号：</strong>${escapeHtml(item.scam_signals.join('；'))}</p>` : ''}
      </article>
    `).join('');
  }

  if (checklistList) {
    checklistList.innerHTML = (digest.rumor_watchlist || []).slice(0, 6).map((item) => html`
      <article class="stack-card">
        <small>${escapeHtml(item.label)} · 避坑清单</small>
        <h3>${escapeHtml(item.kind_label)}先看什么</h3>
        <p>${escapeHtml(item.claim)}</p>
        ${item.clarification_points && item.clarification_points.length ? `<ul class="suggest-list">${item.clarification_points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>` : ''}
      </article>
    `).join('');
  }

  highlightList.innerHTML = digest.guide_topics.slice().sort((a, b) => b.priority_votes - a.priority_votes).slice(0, 6).map((item) => html`
    <article class="stack-card">
      <small>${escapeHtml(getTopicName(item.topic))}</small>
      <h3>${escapeHtml(item.priority_label || item.safe_steps[0] || '优先建议整理中')}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div class="meta-line"><span>最高票 ${item.priority_votes || 0}</span><span>${item.safe_steps.length} 条动作建议</span></div>
    </article>
  `).join('');

  guideGrid.innerHTML = digest.guide_topics.map((item) => {
    const policies = relatedLinks(item.policy_link_ids, data.policiesById);
    const discussions = relatedLinks(item.discussion_ids, data.discussionsById);
    return html`
      <article class="source-card">
        <small>${escapeHtml(getTopicName(item.topic))} · 防踩坑</small>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <p><strong>常见坑点：</strong>${escapeHtml(item.risk_points.join('；') || '正在整理')}</p>
        <ul class="suggest-list">${item.safe_steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ul>
        <div class="topic-actions">
          ${policies.map((policy) => `<a class="topic-link" href="${escapeHtml(policy.url)}" target="_blank" rel="noreferrer">${escapeHtml(policy.label)}</a>`).join('')}
          ${discussions.map((discussion) => `<a class="topic-link" href="${escapeHtml(discussion.url)}" target="_blank" rel="noreferrer">讨论区</a>`).join('')}
        </div>
      </article>
    `;
  }).join('');

  actionGrid.innerHTML = (data.polls.action_cards || []).map((item) => html`
    <article class="stack-card">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
      <div class="topic-actions"><a class="topic-link" href="${escapeHtml(item.url)}" ${/^https?:/.test(item.url) ? 'target="_blank" rel="noreferrer"' : ''}>${escapeHtml(item.label)}</a></div>
    </article>
  `).join('');

  if (priorityList) {
    priorityList.innerHTML = (digest.guide_priority_actions || []).slice(0, 6).map((item) => html`
      <article class="stack-card">
        <small>${escapeHtml(item.label)} · 最高票 ${escapeHtml(item.priority_votes)}</small>
        <h3>${escapeHtml(item.priority_label || '优先建议整理中')}</h3>
        <p>${escapeHtml(item.summary)}</p>
      </article>
    `).join('');
  }

  if (narrativeList) {
    narrativeList.innerHTML = [
      `当前共梳理出 ${(digest.guide_action_breakdown || []).length} 类动作建议，说明站内建议已不只停留在“吐槽”，而是开始转向更具体的治理动作。`,
      '阅读建议：先看最高票建议，再看对应议题的坑点，最后跳转到办事入口或讨论区补充具体案例。',
      '如果一个议题“坑点数”明显高于“动作数”，说明这个方向还需要补更细的流程建议和经验总结。',
      '如果一个议题“动作数”很多但最高票不集中，通常意味着公众对改进方向仍存在分歧，适合继续观察。'
    ].map((item) => `<article class="stack-card"><p>${escapeHtml(item)}</p></article>`).join('');
  }

  renderGuideCharts(digest);
}

function renderDiscussion(data) {
  const wechat = (data.live_config || {}).wechat_login || {};
  const backend = (data.live_config || {}).vote_backend || {};
  byId('discussionIntro').innerHTML = html`
    <h3>为什么改用 GitHub Discussions？</h3>
    <p>因为 GitHub Pages 适合部署静态站，不适合承载匿名后端。将正式留言迁移到 Discussions 后，我们可以保留公开线程、可追溯链接和自动归档能力。</p>
    <div class="stack-list" style="margin-top:16px;">
      <div class="stack-card"><small>实时互动后端</small><p>${escapeHtml(backend.status_label || '未配置')}</p></div>
      <div class="stack-card"><small>微信登录</small><p>${escapeHtml(wechat.status_label || '未配置')}</p></div>
    </div>
    <div class="topic-actions" style="margin-top:16px;">
      <a class="button primary" href="${escapeHtml(data.site_meta.repository.discussions_url)}" target="_blank" rel="noreferrer">打开 Discussions</a>
      ${wechat.enabled && wechat.login_url ? `<a class="button ghost" href="${escapeHtml(wechat.login_url)}">微信登录入口</a>` : ''}
      <a class="button ghost" href="archive.html?type=discussion">查看讨论归档</a>
    </div>
  `;

  byId('discussionCards').innerHTML = data.discussion_archive.map((item) => html`
    <article class="stack-card">
      <small>${escapeHtml(item.source_type)} · ${escapeHtml(getTopicName(item.topic))}</small>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.excerpt)}</p>
      <div class="meta-line"><span>${formatDate(item.created_at)}</span><span>点赞 ${item.likes}</span></div>
      <div class="topic-actions"><a class="topic-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">跳转到仓库讨论</a></div>
    </article>
  `).join('');

  const liveBullets = ((data.liveRuntime || {}).bullets || []).map((item, index) => ({
    id: item.id || `live_bullet_${index}`,
    topic: item.topic || 'livelihood',
    excerpt: item.excerpt || item.content || '',
  })).filter((item) => item.excerpt);
  renderDanmu('discussionDanmu', liveBullets.length ? liveBullets : data.discussion_archive, true);
  mountGiscus(data.site_meta);
}

function mountGiscus(meta) {
  const container = byId('giscusContainer');
  if (!container) return;
  const config = meta.giscus;
  if (!config.enabled || !config.repo_id || !config.category_id) {
    container.innerHTML = html`<div class="note-card"><strong>Giscus 尚未完成仓库级配置。</strong><p>站点已准备好 Discussions 入口和自动导出脚本；当仓库开启 Discussions 并写入 ` + '`repo_id`' + ` / ` + '`category_id`' + ` 后，这里会自动切换为可留言的嵌入组件。</p></div>`;
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://giscus.app/client.js';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.setAttribute('data-repo', config.repo);
  script.setAttribute('data-repo-id', config.repo_id);
  script.setAttribute('data-category', config.category);
  script.setAttribute('data-category-id', config.category_id);
  script.setAttribute('data-mapping', config.mapping);
  script.setAttribute('data-strict', config.strict);
  script.setAttribute('data-reactions-enabled', config.reactions_enabled);
  script.setAttribute('data-emit-metadata', config.emit_metadata);
  script.setAttribute('data-input-position', config.input_position);
  script.setAttribute('data-theme', config.theme);
  script.setAttribute('data-lang', config.lang);
  container.appendChild(script);
}

function buildArchiveIndex(data) {
  const trendDocs = data.trend_archive.map((item) => ({
    id: item.id,
    type: 'trend',
    topic: item.topic,
    title: item.title,
    summary: item.summary,
    date: item.snapshot_date,
    url: `trends.html#${item.id}`,
    keywords: `${item.title} ${item.summary} ${getTopicName(item.topic)}`
  }));
  const evidenceDocs = data.evidence_records.map((item) => ({
    id: item.id,
    type: 'evidence',
    topic: item.topic,
    title: item.title,
    summary: item.summary,
    date: item.published_at,
    url: `evidence.html#${item.id}`,
    keywords: `${item.title} ${item.claim} ${item.verdict}`
  }));
  const paperDocs = data.papers.map((item) => ({
    id: item.id,
    type: 'paper',
    topic: item.topic,
    title: item.title,
    summary: item.abstract,
    date: `${item.year}-01-01`,
    url: item.url,
    keywords: `${item.title} ${item.abstract} ${item.doi}`
  }));
  const discussionDocs = data.discussion_archive.map((item) => ({
    id: item.id,
    type: 'discussion',
    topic: item.topic,
    title: item.title,
    summary: item.excerpt,
    date: item.created_at,
    url: item.url,
    keywords: `${item.title} ${item.excerpt}`
  }));
  const socialDocs = data.social_hot_topics.items.map((item) => ({
    id: item.id,
    type: 'social',
    topic: item.topic,
    title: item.title,
    summary: item.summary,
    date: item.snapshot_date,
    url: item.url,
    keywords: `${item.title} ${item.summary} ${item.platform}`
  }));
  const reportDocs = data.reports.map((item) => ({
    id: item.id,
    type: 'report',
    topic: item.topic,
    title: item.title,
    summary: item.summary,
    date: `${item.year}-01-01`,
    url: item.url,
    keywords: `${item.title} ${item.publisher} ${item.category} ${item.summary}`
  }));
  return [...trendDocs, ...evidenceDocs, ...paperDocs, ...discussionDocs, ...socialDocs, ...reportDocs];
}

function renderArchive(data) {
  const docs = buildArchiveIndex(data);
  const form = byId('archiveSearchForm');
  const topicSelect = byId('searchTopic');
  const typeSelect = byId('searchType');
  const queryInput = byId('searchQuery');
  const fromInput = byId('searchFrom');
  const toInput = byId('searchTo');
  const sortInput = byId('searchSort');
  const results = byId('archiveResults');
  const meta = byId('archiveMeta');
  const latestDoc = docs.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const reportCount = docs.filter((doc) => doc.type === 'report').length;
  const discussionCount = docs.filter((doc) => doc.type === 'discussion').length;
  const topicCount = new Set(docs.map((doc) => doc.topic)).size;

  renderSummaryGrid('archiveSummaryGrid', [
    {
      label: '归档总量',
      value: `${docs.length} 条`,
      note: '热点快照、证据库、论文卡片、报告入口、社媒热榜和讨论摘录都可以一起检索。'
    },
    {
      label: '报告入口',
      value: `${reportCount} 份`,
      note: '报告库已并入统一检索，找议题时不用再单独翻页面。'
    },
    {
      label: '讨论摘录',
      value: `${discussionCount} 条`,
      note: '公开 Discussions 摘录会和议题页、弹幕墙同步，便于回看历史讨论。'
    },
    {
      label: '最近记录',
      value: latestDoc ? formatDate(latestDoc.date) : '暂无',
      note: `当前可覆盖 ${topicCount} 个议题，支持通过 URL 参数直接分享筛选结果。`
    }
  ]);

  const archiveTipCards = byId('archiveTipCards');
  if (archiveTipCards) {
    archiveTipCards.innerHTML = [
      '如果你已经知道议题，但不确定从哪类材料入手，先筛“报告库”或“证据库”，再回看讨论摘录。',
      '想找旧热点时，优先设定日期区间；想找结构性证据时，优先筛论文卡片与官方报告。',
      '归档链接支持 `q`、`topic`、`type`、`from`、`to`、`sort` 参数，便于把固定检索条件直接分享给别人。',
      '遇到结果很多时，可以先按议题缩窄，再改成“关键词优先”，会比全库模糊搜索更稳。'
    ].map((item) => `<article class="stack-card"><p>${escapeHtml(item)}</p></article>`).join('');
  }

  topicSelect.innerHTML = Object.entries(TOPIC_NAMES).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
  typeSelect.innerHTML = Object.entries(TYPE_NAMES).filter(([key]) => ['all', 'trend', 'evidence', 'paper', 'discussion', 'social', 'report'].includes(key)).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');

  const params = new URLSearchParams(window.location.search);
  queryInput.value = params.get('q') || '';
  topicSelect.value = params.get('topic') || 'all';
  typeSelect.value = params.get('type') || 'all';
  fromInput.value = params.get('from') || '';
  toInput.value = params.get('to') || '';
  sortInput.value = params.get('sort') || 'newest';

  function runSearch() {
    const q = queryInput.value.trim().toLowerCase();
    const topic = topicSelect.value;
    const type = typeSelect.value;
    const from = fromInput.value;
    const to = toInput.value;
    const sort = sortInput.value;

    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (topic !== 'all') next.set('topic', topic);
    if (type !== 'all') next.set('type', type);
    if (from) next.set('from', from);
    if (to) next.set('to', to);
    if (sort !== 'newest') next.set('sort', sort);
    history.replaceState({}, '', `${window.location.pathname}${next.toString() ? `?${next}` : ''}`);

    let filtered = docs.filter((doc) => (topic === 'all' || doc.topic === topic) && (type === 'all' || doc.type === type));
    if (from) filtered = filtered.filter((doc) => formatDate(doc.date) >= from);
    if (to) filtered = filtered.filter((doc) => formatDate(doc.date) <= to);
    if (q) filtered = filtered.filter((doc) => `${doc.title} ${doc.summary} ${doc.keywords}`.toLowerCase().includes(q));

    filtered = filtered.map((doc) => ({
      ...doc,
      score: q ? (`${doc.title} ${doc.summary}`.toLowerCase().includes(q) ? 2 : 1) : 0
    }));

    filtered.sort((a, b) => {
      if (sort === 'relevance') return b.score - a.score || new Date(b.date) - new Date(a.date);
      if (sort === 'oldest') return new Date(a.date) - new Date(b.date);
      return new Date(b.date) - new Date(a.date);
    });

    meta.textContent = `共找到 ${filtered.length} 条记录。当前筛选：${getTopicName(topic)} / ${getTypeName(type)}${q ? ` / 关键词“${q}”` : ''}`;
    results.innerHTML = filtered.length ? filtered.map((doc) => html`
      <article class="archive-card">
        <div class="archive-type">${escapeHtml(getTypeName(doc.type))}</div>
        <h3>${escapeHtml(doc.title)}</h3>
        <div class="meta-line"><span>${escapeHtml(getTopicName(doc.topic))}</span><span>${formatDate(doc.date)}</span></div>
        <p>${escapeHtml(doc.summary)}</p>
        <div class="topic-actions"><a class="topic-link" href="${escapeHtml(doc.url)}" ${doc.url.startsWith('http') ? 'target="_blank" rel="noreferrer"' : ''}>打开记录</a></div>
      </article>
    `).join('') : '<div class="note-card">没有匹配结果。可以放宽关键词或改用其他议题筛选。</div>';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    runSearch();
  });
  runSearch();
}

function renderReports(data) {
  const summaryGrid = byId('reportSummaryGrid');
  const filters = byId('reportFilters');
  const list = byId('reportList');
  if (!summaryGrid || !filters || !list) return;

  const officialCount = data.reports.filter((item) => item.category.startsWith('official')).length;
  const surveyCount = data.reports.filter((item) => item.category === 'academic-survey').length;
  const latestYear = Math.max(...data.reports.map((item) => Number(item.year) || 0));
  const topicsCovered = new Set(data.reports.map((item) => item.topic)).size;
  let currentTopic = 'all';
  let currentCategory = 'all';

  renderAuroraBoard('reportsAuroraBoard', [
    {
      eyebrow: 'Shelf Size',
      value: `${data.reports.length}`,
      title: '当前书架规模',
      body: '报告库把统计公报、统计年鉴、学术调查和研究项目集中到一个资料层。'
    },
    {
      eyebrow: 'Official Core',
      value: `${officialCount}`,
      title: '官方资料入口',
      body: '适合先建立总量和趋势底图，再回到细分议题做深入判断。'
    },
    {
      eyebrow: 'Survey Track',
      value: `${surveyCount}`,
      title: '长期调查项目',
      body: '学术调查特别适合观察群体差异、代际变化和长期结构。'
    },
    {
      eyebrow: 'Coverage Year',
      value: `${latestYear}`,
      title: '当前最新年份',
      body: `当前已经覆盖 ${topicsCovered} 个议题，后续还可以继续扩到更多白皮书与专项报告。`
    }
  ]);

  renderSummaryGrid('reportSummaryGrid', [
    {
      label: '报告总量',
      value: `${data.reports.length} 份`,
      note: '把统计公报、统计年鉴、长期追踪调查和项目主页统一收到一个入口。'
    },
    {
      label: '官方资料',
      value: `${officialCount} 份`,
      note: '适合快速建立总量、趋势与政策口径，优先回答“整体变化到哪里了”。'
    },
    {
      label: '学术调查',
      value: `${surveyCount} 个`,
      note: '适合观察群体差异、代际变化与长期追踪结果，补足单年公报看不到的结构性信息。'
    },
    {
      label: '覆盖范围',
      value: `${topicsCovered} 个议题 · 至 ${latestYear} 年`,
      note: '报告库会继续扩充统计报告、白皮书和全国性调查项目。'
    }
  ]);

  function draw() {
    const filtered = data.reports
      .filter((item) => (currentTopic === 'all' || item.topic === currentTopic) && (currentCategory === 'all' || item.category === currentCategory))
      .slice()
      .sort((a, b) => Number(b.year) - Number(a.year) || a.title.localeCompare(b.title, 'zh-CN'));

    list.innerHTML = filtered.length
      ? filtered.map(reportCardMarkup).join('')
      : '<div class="note-card">当前筛选条件下没有匹配的报告。</div>';

    filters.innerHTML = html`
      <div class="filter-row">
        ${['all', ...data.topics.map((topic) => topic.id)].map((topic) => `
          <button type="button" class="filter-pill${currentTopic === topic ? ' active' : ''}" data-kind="topic" data-value="${escapeHtml(topic)}">${escapeHtml(getTopicName(topic))}</button>
        `).join('')}
      </div>
      <div class="filter-row">
        ${['all', ...Object.keys(REPORT_CATEGORY_NAMES)].map((category) => `
          <button type="button" class="filter-pill${currentCategory === category ? ' active' : ''}" data-kind="category" data-value="${escapeHtml(category)}">${escapeHtml(category === 'all' ? '全部类型' : getReportCategoryName(category))}</button>
        `).join('')}
      </div>
    `;

    filters.querySelectorAll('.filter-pill').forEach((button) => {
      button.addEventListener('click', () => {
        const kind = button.dataset.kind;
        const value = button.dataset.value;
        if (kind === 'topic') currentTopic = value;
        if (kind === 'category') currentCategory = value;
        draw();
      });
    });
  }

  draw();
}

function getVoteStore() {
  try {
    return JSON.parse(localStorage.getItem(VOTE_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function setVoteStore(store) {
  localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(store));
}

function getSuggestionStore() {
  try {
    return JSON.parse(localStorage.getItem(SUGGESTION_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function setSuggestionStore(store) {
  localStorage.setItem(SUGGESTION_STORAGE_KEY, JSON.stringify(store));
}

function getLiveVoteCount(data, pollId, optionId) {
  return ((((data || {}).liveRuntime || {}).voteTotals || {})[pollId] || {})[optionId] || 0;
}

async function submitLiveVote(data, poll, optionId) {
  const backend = ((data || {}).live_config || {}).vote_backend || {};
  if (!backend.enabled || !backend.write_url) return { ok: false, fallback: true };
  const response = await fetch(backend.write_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      poll_id: poll.id,
      option_id: optionId,
      topic: poll.topic,
      created_at: new Date().toISOString(),
      identity_provider: (((data || {}).live_config || {}).wechat_login || {}).enabled ? 'wechat' : 'web'
    })
  });
  if (!response.ok) {
    return { ok: false, fallback: true };
  }
  data.liveRuntime.voteTotals[poll.id] = data.liveRuntime.voteTotals[poll.id] || {};
  data.liveRuntime.voteTotals[poll.id][optionId] = (data.liveRuntime.voteTotals[poll.id][optionId] || 0) + 1;
  data.liveRuntime.status = 'live';
  return { ok: true, fallback: false };
}

function upsertPollCharts(radarConfig, sampleConfig) {
  if (typeof Chart === 'undefined') return;
  window.__pollCharts = window.__pollCharts || {};
  const radarCanvas = byId('pollRadarChart');
  const sampleCanvas = byId('pollSampleChart');
  if (radarCanvas) {
    if (window.__pollCharts.radar) window.__pollCharts.radar.destroy();
    window.__pollCharts.radar = new Chart(radarCanvas.getContext('2d'), radarConfig);
  }
  if (sampleCanvas) {
    if (window.__pollCharts.sample) window.__pollCharts.sample.destroy();
    window.__pollCharts.sample = new Chart(sampleCanvas.getContext('2d'), sampleConfig);
  }
}

function getPollPayload(data) {
  if (Array.isArray(data.polls)) {
    return {
      intro_note: '站内轻投票用于观察关注方向，不代表科学抽样意义上的总体民意。',
      surveys: data.polls,
      suggestion_boards: [],
      action_cards: []
    };
  }
  return data.polls;
}

function renderPolls(data) {
  const payload = getPollPayload(data);
  const hotspotAnalysis = data.hotspot_analysis || {};
  const surveys = payload.surveys || [];
  const suggestionBoards = payload.suggestion_boards || [];
  const actionCards = payload.action_cards || [];
  const container = byId('pollGrid');
  const introNote = byId('pollIntroNote');
  const summaryGrid = byId('pollSummaryGrid');
  const insightGrid = byId('pollInsightGrid');
  const suggestionGrid = byId('pollSuggestionGrid');
  const topicFilters = byId('pollTopicFilters');
  const suggestionForm = byId('pollSuggestionForm');
  const suggestionTopic = byId('pollSuggestionTopic');
  const suggestionText = byId('pollSuggestionText');
  const localSuggestionList = byId('localSuggestionList');
  const actionGrid = byId('pollActionCards');
  const pollWeeklyList = byId('pollWeeklyList');
  const resetButton = byId('pollResetButton');
  if (!container || !summaryGrid || !insightGrid || !suggestionGrid || !topicFilters) return;

  let currentTopic = 'all';

  function getPollTotal(poll, store) {
    const pollState = store[poll.id];
    return poll.options.reduce((sum, option) => sum + option.votes + getLiveVoteCount(data, poll.id, option.id) + ((pollState && pollState.counts && pollState.counts[option.id]) || 0), 0);
  }

  function getTopOption(poll, store) {
    const total = getPollTotal(poll, store);
    const ranked = poll.options.map((option) => {
      const count = option.votes + getLiveVoteCount(data, poll.id, option.id) + (((store[poll.id] || {}).counts || {})[option.id] || 0);
      return { ...option, count, percentage: total ? Math.round((count / total) * 100) : 0 };
    }).sort((a, b) => b.count - a.count);
    return { total, ranked, first: ranked[0], second: ranked[1] };
  }

  function draw() {
    const store = getVoteStore();
    const suggestionStore = getSuggestionStore();
    const filteredSurveys = surveys.filter((poll) => currentTopic === 'all' || poll.topic === currentTopic);
    const filteredBoards = suggestionBoards.filter((item) => currentTopic === 'all' || item.topic === currentTopic);
    const localByTopic = suggestionStore.filter((item) => currentTopic === 'all' || item.topic === currentTopic);
    const totalBaseVotes = surveys.reduce((sum, poll) => sum + getPollTotal(poll, store), 0);
    const localVoteCount = Object.values(store).reduce((sum, item) => sum + Object.values((item && item.counts) || {}).reduce((acc, value) => acc + value, 0), 0);
    const topicsCovered = new Set(surveys.map((poll) => poll.topic)).size;
    const liveVoteCount = surveys.reduce((sum, poll) => sum + Object.values((((data.liveRuntime || {}).voteTotals || {})[poll.id] || {})).reduce((acc, value) => acc + value, 0), 0);
    const backend = (data.live_config || {}).vote_backend || {};
    const wechat = (data.live_config || {}).wechat_login || {};

    if (introNote) {
      introNote.innerHTML = html`
        <strong>${escapeHtml(payload.intro_note || '')}</strong>
        <p style="margin-top:10px;">实时后端：${escapeHtml(backend.status_label || '未配置')}。微信登录：${escapeHtml(wechat.status_label || '未配置')}。</p>
      `;
    }

    renderAuroraBoard('pollAuroraBoard', [
      {
        eyebrow: 'Survey Matrix',
        value: `${surveys.length}`,
        title: '可投题组总数',
        body: '投票页先给出题组规模，让你一进来就知道当前民意面板覆盖了多大范围。',
        note: `${topicsCovered} 个议题`
      },
      {
        eyebrow: 'Pulse Sample',
        value: `${totalBaseVotes}`,
        title: '当前基础样本',
        body: '这个样本量来自站内静态基数叠加当前浏览器的本机操作，方便观察偏好分布。'
      },
      {
        eyebrow: 'Live Channel',
        value: backend.enabled ? `${liveVoteCount}` : 'DEMO',
        title: backend.enabled ? '实时写入票数' : '实时写入待接通',
        body: '如果后端接通，这里会首先显示跨用户的实时票数变化。'
      },
      {
        eyebrow: 'Suggestion Flow',
        value: `${suggestionStore.length}`,
        title: '本机建议存量',
        body: '你可以先在本地整理建议，再挑重点发到正式讨论区或办事入口。'
      }
    ]);

    summaryGrid.innerHTML = [
      { label: '覆盖议题', value: `${topicsCovered}`, note: '教育、医疗、住房、就业、养老、食品、科技与综合民生' },
      { label: '调查题数', value: `${surveys.length}`, note: '每个议题至少有一条轻投票，支持快速查看偏好' },
      { label: '基础样本', value: `${totalBaseVotes}`, note: '静态基数与本机投票累计后的站内样本量' },
      { label: '实时写入', value: `${liveVoteCount}`, note: backend.enabled ? '来自外部投票后端的已同步票数' : '当前未接通实时后端，仍为 0' },
      { label: '本机新增', value: `${localVoteCount}`, note: '你当前浏览器追加的投票；若未接通后端，不会写回公共数据' },
      { label: '本机建议', value: `${suggestionStore.length}`, note: '临时记录在当前浏览器，可整理后再发到 Discussions' }
    ].map((item) => html`
      <article class="stack-card">
        <small>${escapeHtml(item.label)}</small>
        <h3>${escapeHtml(item.value)}</h3>
        <p>${escapeHtml(item.note)}</p>
      </article>
    `).join('');

    insightGrid.innerHTML = filteredSurveys.map((poll) => {
      const { total, first, second } = getTopOption(poll, store);
      const gap = first && second ? first.percentage - second.percentage : first ? first.percentage : 0;
      return html`
        <article class="stack-card">
          <small>${escapeHtml(getTopicName(poll.topic))} · ${escapeHtml(poll.tag || '轻投票')}</small>
          <h3>${escapeHtml(first ? first.label : '暂无结果')}</h3>
          <p>${escapeHtml(poll.question)}</p>
          <div class="meta-line"><span>当前领先 ${first ? first.percentage : 0}%</span><span>领先差 ${gap}%</span><span>${total} 份样本</span></div>
        </article>
      `;
    }).join('');

    const topicSummary = Object.values(filteredSurveys.reduce((acc, poll) => {
      const result = getTopOption(poll, store);
      if (!acc[poll.topic]) {
        acc[poll.topic] = { topic: poll.topic, leading: 0, sample: 0, count: 0 };
      }
      acc[poll.topic].leading += result.first ? result.first.percentage : 0;
      acc[poll.topic].sample += result.total;
      acc[poll.topic].count += 1;
      return acc;
    }, {})).map((item) => ({
      ...item,
      leading: item.count ? Math.round(item.leading / item.count) : 0
    }));
    upsertPollCharts(
      {
        type: 'radar',
        data: {
          labels: topicSummary.map((item) => getTopicName(item.topic)),
          datasets: [{
            label: '领先选项占比',
            data: topicSummary.map((item) => item.leading),
            backgroundColor: 'rgba(22, 93, 255, 0.16)',
            borderColor: CHART_PALETTE.cyan,
            pointBackgroundColor: CHART_PALETTE.pink,
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { r: { suggestedMin: 0, suggestedMax: 100 } },
          plugins: { legend: { display: false } }
        }
      },
      {
        type: 'bar',
        data: {
          labels: topicSummary.map((item) => getTopicName(item.topic)),
          datasets: [{
            label: '样本量',
            data: topicSummary.map((item) => item.sample),
            backgroundColor: [CHART_PALETTE.cyan, CHART_PALETTE.red, CHART_PALETTE.amber, CHART_PALETTE.green, CHART_PALETTE.orange, CHART_PALETTE.violet, CHART_PALETTE.pink, CHART_PALETTE.light]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      }
    );
    renderPollAttentionChart(topicSummary, hotspotAnalysis);

    if (pollWeeklyList) {
      const rankingMap = Object.fromEntries((hotspotAnalysis.topic_rankings || []).map((item) => [item.topic, item]));
      pollWeeklyList.innerHTML = topicSummary.map((item) => {
        const ranking = rankingMap[item.topic];
        return html`
          <article class="stack-card">
            <small>${escapeHtml(getTopicName(item.topic))}</small>
            <h3>${escapeHtml(ranking ? `热点分 ${ranking.combined_score} / 样本 ${item.sample}` : `样本 ${item.sample}`)}</h3>
            <p>${escapeHtml(ranking ? ranking.watch_reason : '该议题当前还没有完整的热点周报判断。')}</p>
            <div class="meta-line">
              <span>领先选项 ${item.leading}%</span>
              <span>${escapeHtml(ranking ? ranking.signal_label : '观察中')}</span>
            </div>
          </article>
        `;
      }).join('');
    }

    topicFilters.innerHTML = ['all', ...Object.keys(TOPIC_NAMES).filter((key) => key !== 'all')].map((topic) => `
      <button class="filter-pill${currentTopic === topic ? ' active' : ''}" type="button" data-topic-filter="${escapeHtml(topic)}">${escapeHtml(getTopicName(topic))}</button>
    `).join('');

    container.innerHTML = filteredSurveys.map((poll) => {
      const pollState = store[poll.id];
      const total = getPollTotal(poll, store);
      const voted = Boolean(pollState && pollState.choice);
      const optionsHtml = poll.options.map((option) => {
        const liveCount = getLiveVoteCount(data, poll.id, option.id);
        const count = option.votes + liveCount + ((pollState && pollState.counts && pollState.counts[option.id]) || 0);
        const percentage = total ? Math.round((count / total) * 100) : 0;
        if (!voted) {
          return `<div class="poll-option"><button data-poll="${escapeHtml(poll.id)}" data-option="${escapeHtml(option.id)}">${escapeHtml(option.label)}</button></div>`;
        }
        return html`<div class="poll-result"><div class="poll-result-fill" style="width:${percentage}%"></div><div class="poll-result-body"><span>${escapeHtml(option.label)}</span><span>${percentage}% · ${count}票</span></div></div>`;
      }).join('');
      return html`
        <article class="poll-card">
          <small>${escapeHtml(getTopicName(poll.topic))} · ${escapeHtml(poll.tag || '轻投票')}</small>
          <h3>${escapeHtml(poll.question)}</h3>
          <p>${escapeHtml(poll.note)}</p>
          <div>${optionsHtml}</div>
          <div class="meta-line" style="margin-top:12px;"><span>${total} 份站内样本</span><span>${voted ? '你已投票，正在显示结果' : '匿名本地投票'}</span></div>
        </article>
      `;
    }).join('') || '<div class="note-card">当前筛选下没有对应投票。</div>';

    suggestionGrid.innerHTML = filteredBoards.map((board) => {
      const policies = relatedLinks(board.policy_link_ids, data.policiesById);
      const discussions = relatedLinks(board.discussion_ids, data.discussionsById);
      return html`
        <article class="stack-card">
          <small>${escapeHtml(getTopicName(board.topic))}</small>
          <h3>${escapeHtml(board.title)}</h3>
          <p>${escapeHtml(board.summary)}</p>
          <ul class="suggest-list">${board.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          <div class="topic-actions">
            ${policies.map((policy) => `<a class="topic-link" href="${escapeHtml(policy.url)}" target="_blank" rel="noreferrer">${escapeHtml(policy.label)}</a>`).join('')}
            ${discussions.map((discussion) => `<a class="topic-link" href="${escapeHtml(discussion.url)}" target="_blank" rel="noreferrer">进入讨论</a>`).join('')}
          </div>
        </article>
      `;
    }).join('') || '<div class="note-card">当前筛选下没有建议板。</div>';

    if (suggestionTopic) {
      suggestionTopic.innerHTML = Object.entries(TOPIC_NAMES).filter(([key]) => key !== 'all').map(([value, label]) => `<option value="${escapeHtml(value)}" ${currentTopic === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
    }

    if (localSuggestionList) {
      localSuggestionList.innerHTML = localByTopic.length ? localByTopic.slice().reverse().map((item) => html`
        <article class="stack-card">
          <small>${escapeHtml(getTopicName(item.topic))} · 仅本机可见 · ${escapeHtml(formatDate(item.created_at))}</small>
          <p>${escapeHtml(item.text)}</p>
        </article>
      `).join('') : '<div class="note-card">你还没有在本机保存建议。需要公开展示时，请发到 GitHub Discussions。</div>';
    }

    if (actionGrid) {
      const runtimeCards = [
        {
          title: '实时投票后端状态',
          body: backend.note || '未配置说明。',
          url: backend.read_url || 'methodology.html',
          label: backend.enabled ? '查看后端入口' : '查看方法说明'
        },
        {
          title: '微信登录接入状态',
          body: wechat.note || '未配置说明。',
          url: wechat.login_url || 'methodology.html',
          label: wechat.enabled ? '打开微信登录' : '查看接入说明'
        }
      ];
      actionGrid.innerHTML = [...runtimeCards, ...actionCards].map((item) => html`
        <article class="stack-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.body)}</p>
          <div class="topic-actions"><a class="topic-link" href="${escapeHtml(item.url)}" ${/^https?:/.test(item.url) ? 'target="_blank" rel="noreferrer"' : ''}>${escapeHtml(item.label)}</a></div>
        </article>
      `).join('');
    }

    topicFilters.querySelectorAll('button[data-topic-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        currentTopic = button.dataset.topicFilter;
        draw();
      });
    });

    container.querySelectorAll('button[data-poll]').forEach((button) => {
      button.addEventListener('click', async () => {
        const pollId = button.dataset.poll;
        const optionId = button.dataset.option;
        const nextStore = getVoteStore();
        if (nextStore[pollId] && nextStore[pollId].choice) return;
        const poll = surveys.find((item) => item.id === pollId);
        const result = poll ? await submitLiveVote(data, poll, optionId) : { ok: false, fallback: true };
        if (!nextStore[pollId]) nextStore[pollId] = { choice: optionId, counts: {} };
        nextStore[pollId].choice = optionId;
        if (result.fallback) {
          nextStore[pollId].counts[optionId] = (nextStore[pollId].counts[optionId] || 0) + 1;
        }
        setVoteStore(nextStore);
        draw();
      });
    });
  }

  if (suggestionForm && suggestionTopic && suggestionText) {
    suggestionForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const topic = suggestionTopic.value;
      const text = suggestionText.value.trim();
      if (!topic || !text) return;
      const store = getSuggestionStore();
      store.push({
        id: `local_${Date.now()}`,
        topic,
        text,
        created_at: new Date().toISOString()
      });
      setSuggestionStore(store);
      suggestionText.value = '';
      draw();
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (!window.confirm('确定要清空当前浏览器里的本机投票和本机建议吗？')) return;
      localStorage.removeItem(VOTE_STORAGE_KEY);
      localStorage.removeItem(SUGGESTION_STORAGE_KEY);
      draw();
    });
  }

  draw();
}

function renderMethodology(data) {
  const cards = byId('methodologyCards');
  const sources = byId('methodSourceGrid');
  if (!cards || !sources) return;

  const items = [
    {
      title: '来源层级',
      body: 'A 级为国家统计局、部委、12315 与中国政府网等官方入口；B 级为论文元数据服务；C 级为公开热榜链接，只作为公共讨论入口。'
    },
    {
      title: '热点归档原则',
      body: '热点页展示的是公开热榜入口与站内快照。我们不宣称掌握平台内部热度数据，也不做高频自动抓取。'
    },
    {
      title: '社媒三层策略',
      body: '知乎、微博优先走公开入口直抓；受限时回退到 RSSHub/代理订阅层；仍失败时展示人工审核池和最近一次成功快照。'
    },
    {
      title: '讨论与审核边界',
      body: '正式留言通过 GitHub Discussions 公开保存。站内弹幕只展示公开归档摘录，不提供匿名即时发言。'
    },
    {
      title: '轻投票边界',
      body: '投票和本机意见板只用于观察站内偏好与建议方向。投票写在本地浏览器，本机建议也不会自动公开发布。'
    },
    {
      title: '实时投票与微信登录',
      body: '站点已预留实时投票/评论后端和微信登录配置位，但当前公开 Pages 版本尚未接入外部服务。要启用微信用户登录，仍需要后端与合规回调域名。'
    },
    {
      title: '自动化工作流',
      body: 'refresh-data 负责刷新时间戳和元数据；export-discussions 负责导出公开讨论摘录；deploy-pages 负责 Pages 发布。'
    },
    {
      title: '免责声明',
      body: '本站用于研究型整理、公开信息导航与议题归档，不构成官方答复、法律意见或科学抽样民调。'
    }
  ];

  cards.innerHTML = items.map((item) => html`<article class="stack-card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></article>`).join('');
  sources.innerHTML = data.sources.map((source) => html`
    <article class="source-card">
      <small>${escapeHtml(source.category)} · 级别 ${escapeHtml(source.authority_level)} · 最近检查 ${escapeHtml(source.last_checked)}</small>
      <h3>${escapeHtml(source.name)}</h3>
      <p>${escapeHtml(source.note)}</p>
      <div class="topic-actions"><a class="topic-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">打开入口</a></div>
    </article>
  `).join('');
}

async function init() {
  applyThemeMode(getStoredThemeMode(), false);
  bindSystemThemeWatcher();
  configureChartDefaults();
  initPoeticScene();
  initCyberScene();
  initFutureScene();
  initHomeHeroScene();
  initHomeCyberScene();
  initHomeFutureScene();
  initChrome();
  initLiveInfoBar();
  const data = await loadData();
  window.__appData = data;
  renderFooter(data);
  const page = document.body.dataset.page;
  switch (page) {
    case 'home': renderHome(data); break;
    case 'analysis': renderAnalysis(data); break;
    case 'trends': renderTrends(data); break;
    case 'evidence': renderEvidence(data); break;
    case 'exposure': renderExposure(data); break;
    case 'guide': renderGuide(data); break;
    case 'discuss': renderDiscussion(data); break;
    case 'archive': renderArchive(data); break;
    case 'reports': renderReports(data); break;
    case 'polls': renderPolls(data); break;
    case 'methodology': renderMethodology(data); break;
    default: break;
  }
  animateAuroraValues();
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error(error);
    const footer = byId('siteFooter');
    if (footer) footer.innerHTML = '<div class="shell footer-meta">站点初始化失败，请检查 data/ JSON 结构与相对路径。</div>';
  });
});
