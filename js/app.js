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
  'live_config'
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
  investigating: '调查中',
  context: '背景说明',
  exposed: '问题暴露'
};
const VOTE_STORAGE_KEY = 'minsheng_observer_votes_v1';
const SUGGESTION_STORAGE_KEY = 'minsheng_observer_suggestions_v1';

const html = String.raw;

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

function byId(id) {
  return document.getElementById(id);
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

function initChrome() {
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

function renderHome(data) {
  byId('heroStats').innerHTML = data.site_meta.hero_stats.map((item) => html`
    <div class="stat-row">
      <div class="stat-value">${escapeHtml(item.value)}</div>
      <div class="stat-label">${escapeHtml(item.label)}</div>
      <div class="stat-note">${escapeHtml(item.note)}</div>
    </div>
  `).join('');

  byId('weeklyChanges').innerHTML = data.site_meta.weekly_changes.map((item) => `<div class="bullet-item">${escapeHtml(item)}</div>`).join('');

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

  byId('methodHighlights').innerHTML = `<div class="stack-list">${data.site_meta.methodology_highlights.map((item) => `<div class="stack-card"><p>${escapeHtml(item)}</p></div>`).join('')}</div>`;
  renderDanmu('danmuStage', data.discussion_archive.slice(0, 5));
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

  tabs.innerHTML = `<div class="tab-row">${data.topics.map((topic, index) => `<button class="tab-button ${index === 0 ? 'active' : ''}" data-target="${escapeHtml(topic.id)}">${escapeHtml(topic.emoji)} ${escapeHtml(topic.label)}</button>`).join('')}</div>`;
  sections.innerHTML = data.topics.map((topic) => {
    const papers = relatedLinks(topic.paper_ids, data.papersById);
    const policies = relatedLinks(topic.policy_link_ids, data.policiesById);
    const discussions = relatedLinks(topic.discussion_ids, data.discussionsById);
    const chartId = `chart_${topic.id}`;
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
        </div>
      </article>
    `;
  }).join('');

  data.topics.forEach((topic) => createTopicChart(`chart_${topic.id}`, topic));

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
  byId('currentTrendGrid').innerHTML = data.trend_current.map((item) => html`
    <article class="trend-card">
      <div class="meta-line"><span>${escapeHtml(getTopicName(item.topic))}</span><span>热度 ${item.heat_score}</span><span>${escapeHtml(item.snapshot_date)}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div class="link-pills" style="margin-top:12px;">${item.source_links.map((link) => `<a class="link-pill" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join('')}</div>
    </article>
  `).join('');

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
    socialPlatformStatus.innerHTML = Object.entries(data.social_hot_topics.platform_status).map(([platform, status]) => html`
      <article class="stack-card">
        <small>${escapeHtml(platform)}</small>
        <h3>${escapeHtml(status.label)}</h3>
        <p>${escapeHtml(status.note)}</p>
        <div class="meta-line"><span>最近尝试：${formatDate(status.last_attempt)}</span><span>${status.last_success ? `最近成功：${formatDate(status.last_success)}` : '暂无成功抓取'}</span></div>
      </article>
    `).join('');
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
}

function renderEvidence(data) {
  const list = byId('evidenceList');
  const filters = byId('evidenceFilters');
  if (!list || !filters) return;

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
  return [...trendDocs, ...evidenceDocs, ...paperDocs, ...discussionDocs, ...socialDocs];
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

  topicSelect.innerHTML = Object.entries(TOPIC_NAMES).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
  typeSelect.innerHTML = Object.entries(TYPE_NAMES).filter(([key]) => ['all', 'trend', 'evidence', 'paper', 'discussion', 'social'].includes(key)).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');

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
            borderColor: '#165dff',
            pointBackgroundColor: '#b42318',
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
            backgroundColor: ['#165dff', '#b42318', '#9a5b16', '#216e39', '#146c94', '#6a31a6', '#c04b00', '#9d174d']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      }
    );

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
  initChrome();
  const data = await loadData();
  renderFooter(data);
  const page = document.body.dataset.page;
  switch (page) {
    case 'home': renderHome(data); break;
    case 'analysis': renderAnalysis(data); break;
    case 'trends': renderTrends(data); break;
    case 'evidence': renderEvidence(data); break;
    case 'discuss': renderDiscussion(data); break;
    case 'archive': renderArchive(data); break;
    case 'polls': renderPolls(data); break;
    case 'methodology': renderMethodology(data); break;
    default: break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error(error);
    const footer = byId('siteFooter');
    if (footer) footer.innerHTML = '<div class="shell footer-meta">站点初始化失败，请检查 data/ JSON 结构与相对路径。</div>';
  });
});
