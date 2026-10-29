const COUNTRY_IMAGES = { CD:'drc.jpg', GH:'ghana.jpg', EG:'egypt.jpg', AO:'angola.jpg', NG:'nigeria.jpg', ZA:'south-africa.jpg', MG:'madagascar.jpg', KE:'kenya.jpg', TZ:'tanzania.jpg', CI:'cote-divoire.jpg', ZM:'zambia.jpg' };
const state = {
  countries: [], country: localStorage.getItem('afrigo-country') || 'CI',
  token: sessionStorage.getItem('afrigo-token') || '', user: null,
  guideTab: 'visa', exploreTab: 'attractions', chat: [], login: null, loginTimer: null,
  routeVersion: 0, loginAttempt: 0
};
const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const icon = (name) => `<svg aria-hidden="true"><use href="#icon-${name}"/></svg>`;
const safeUrl = (value) => { try { const u = new URL(value, location.origin); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const countryName = (code = state.country) => state.countries.find((item) => item.countryCode === code)?.countryZh || code;
const cover = (code) => `/assets/images/covers/${COUNTRY_IMAGES[code] || 'kenya.jpg'}`;
const countryPicker = () => `<div class="chip-row">${state.countries.map((c) => `<button class="chip ${c.countryCode === state.country ? 'active' : ''}" data-country="${esc(c.countryCode)}">${esc(c.countryZh)}</button>`).join('')}</div>`;
const empty = (title, detail = '') => `<div class="empty">${icon('compass')}<h3>${esc(title)}</h3><p>${esc(detail)}</p></div>`;
const note = () => `<div class="data-note">资料由项目团队整理，信息可能变化。签证、安全与医疗事项请以相关官方渠道的最新发布为准。</div>`;

async function api(path, options = {}) {
  const headers = { ...(options.body && !(options.body instanceof FormData) ? {'Content-Type':'application/json'} : {}), ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    if (response.status === 401 && state.token) logout(false, false);
    throw new Error(data.message || `请求失败 (${response.status})`);
  }
  return data;
}

function toast(message, isError = false) {
  const el = $('#toast'); el.textContent = message; el.classList.toggle('error', isError); el.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.hidden = true; }, 4200);
}
function updateAccount() { $('#accountBtn').textContent = state.user ? `${state.user.nickName || '微信用户'} · 退出` : '微信扫码登录'; }
function logout(refresh = true, revoke = true) {
  const token = state.token;
  state.token = ''; state.user = null; sessionStorage.removeItem('afrigo-token'); updateAccount();
  if (revoke && token) fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  if (refresh) render();
}
function requireLogin() { if (state.user) return true; openLogin(); return false; }

function renderHome() {
  const featured = state.countries.filter((c) => ['CI','KE','ZA','EG'].includes(c.countryCode));
  $('#main').innerHTML = `<section class="hero"><div class="shell hero-inner"><div class="hero-copy"><span class="eyebrow">AFRIGO · YOUR JOURNEY, INFORMED</span><h1>从出发到抵达，<br><em>每一步都有方向。</em></h1><p>面向赴非学习、工作与旅行，汇集国别指南、安全提醒、在地信息和真实经验，让行前准备更有条理。</p><div class="hero-actions"><a class="primary-btn" href="#guide">查看国别指南 ${icon('arrow')}</a><a class="secondary-btn" href="#community">走进互助社区</a></div></div><div class="hero-stat"><span class="tag">当前资料覆盖</span><h3>探索你的下一站</h3><p>按国家查找签证、健康、安全和在地生活信息。</p><div class="numbers"><div><strong>${state.countries.length || '—'}</strong><span>国别资料</span></div><div><strong>6</strong><span>信息主题</span></div><div><strong>1</strong><span>行程入口</span></div></div></div></div></section>
  <section class="section"><div class="shell"><div class="section-head"><div><span class="eyebrow">WHAT WE OFFER</span><h2>赴非准备，从这里开始</h2><p>围绕实际出行场景组织信息与工具。</p></div></div><div class="service-grid"><a href="#guide" class="service-card"><span class="icon-wrap">${icon('compass')}</span><h3>国别指南</h3><p>签证、健康、安全、风俗与生活资料集中查询。</p></a><a href="#explore" class="service-card"><span class="icon-wrap">${icon('map')}</span><h3>探索目的地</h3><p>查看景点和当地实用推荐，提前认识目的地。</p></a><a href="#community" class="service-card"><span class="icon-wrap">${icon('users')}</span><h3>互助社区</h3><p>阅读经验、参与评论，把自己的经历分享给同行者。</p></a><a href="#trips" class="service-card"><span class="icon-wrap">${icon('route')}</span><h3>行程计划</h3><p>把日期、目的地与准备事项收进同一份行程。</p></a></div></div></section>
  <section class="section section-muted"><div class="shell"><div class="section-head"><div><span class="eyebrow">DESTINATIONS</span><h2>从一个目的地开始</h2><p>选择国家，查看对应资料与实用建议。</p></div><a href="#guide" class="text-button">查看全部国家 ${icon('arrow')}</a></div><div class="country-grid">${featured.map((c) => `<a href="#guide" class="country-card" data-country-link="${esc(c.countryCode)}"><img src="${cover(c.countryCode)}" alt="${esc(c.countryZh)}风景" loading="lazy"/><span class="country-card-info"><span><strong>${esc(c.countryZh)}</strong><small>国别指南 · 安全信息</small></span>${icon('arrow')}</span></a>`).join('')}</div></div></section>
  <section class="section"><div class="shell"><div class="section-head"><div><span class="eyebrow">SAFETY FIRST</span><h2>出发前，先看安全提醒</h2><p>风险信息来自有出处的公开资料，并标注发布时间。</p></div></div><div id="homeAlerts" class="surface alert-card"><span class="icon-wrap">${icon('shield')}</span><div><h3>正在读取最新提醒</h3><p>请稍候…</p></div></div></div></section>`;
  const alertCountry = state.country;
  api(`/api/risk-alerts?countryCode=${encodeURIComponent(alertCountry)}`).then((r) => { const el=$('#homeAlerts'); if (!el) return; const items=r.data || []; el.innerHTML = `<span class="icon-wrap">${icon('shield')}</span><div><h3>${items.length ? esc(items[0].title) : `${esc(countryName(alertCountry))}暂无公开风险提醒`}</h3><p>${items.length ? esc(items[0].summary) : '出行前仍建议查看相关使领馆和目的地官方公告。'}</p>${items.length ? `<div class="meta">${esc(items[0].countryZh || '')} · ${esc(items[0].sourceName || '公开资料')}</div>` : ''}</div>`; }).catch(() => {});
}

function renderValue(value, key = '') {
  if (value == null || value === '') return '';
  if (Array.isArray(value)) return `<ul>${value.map((item) => `<li>${renderValue(item)}</li>`).join('')}</ul>`;
  if (typeof value === 'object') return `<div>${Object.entries(value).filter(([k,v]) => v != null && v !== '' && !['gaugeSweep','overallCrimeIndex','countryNameZh'].includes(k)).map(([k,v]) => `<div><strong>${esc(label(k))}：</strong>${renderValue(v,k)}</div>`).join('')}</div>`;
  if (typeof value === 'string' && /^https?:\/\//.test(value)) return `<a href="${esc(safeUrl(value))}" target="_blank" rel="noopener noreferrer">${esc(value)}</a>`;
  return esc(value);
}
const labels = {visa:'签证与入境',health:'健康与医疗',security:'安全与求助',customs:'风俗与文化',localInfo:'在地生活',laborList:'劳务与居留',phrasesList:'实用语',types:'签证类型',docs:'所需材料',mode:'办理方式',fee:'费用',time:'办理时间',policy:'政策',validity:'有效期',url:'官方入口',travelTips:'出行建议',emergencyChecklist:'应急准备',policePhone:'报警电话',medicalPhone:'医疗电话',embassyPhone:'使馆电话',highRiskAreas:'高风险地区',embassyWarning:'使馆提醒',specialRisk:'特别风险',crimeTypes:'常见风险'};
function label(key) { return labels[key] || key.replace(/([A-Z])/g,' $1'); }
function guideContent(guide, tab) {
  const value = guide[tab];
  if (tab === 'phrasesList') return Array.isArray(value) && value.length ? `<div class="item-grid">${value.slice(0,80).map((p) => `<div class="surface item-body"><div class="meta">${esc(p.type || '实用语')}</div><h3>${esc(p.cn)}</h3><p>${esc(p.foreign)}</p>${p.konger ? `<p>${esc(p.konger)}</p>` : ''}<button class="text-button" data-save="phrase" data-id="${esc(p.id)}" data-title="${esc(p.cn)}">收藏</button></div>`).join('')}</div>` : empty('暂无实用语');
  if (tab === 'laborList') return Array.isArray(value) && value.length ? value.map((v) => `<div class="surface content-panel" style="margin-bottom:12px">${renderValue(v)}</div>`).join('') : empty('暂无劳务资料');
  return value ? `<div class="surface content-panel"><h2>${labels[tab]}</h2>${renderValue(value)}${tab === 'visa' ? `<button class="secondary-btn" data-save="visa" data-id="${esc(guide.countryCode)}" data-title="${esc(guide.countryZh)}签证资料">收藏这份资料</button>` : ''}${note()}</div>` : empty('该主题暂时没有资料');
}
async function renderGuide(version) {
  $('#main').innerHTML = `<div class="shell page"><div class="page-heading"><span class="eyebrow">COUNTRY GUIDE</span><h1>国别指南</h1><p>选择目的地，按主题查看行前与在地信息。</p></div>${countryPicker()}<div id="guideArea" class="loading">正在读取国别资料…</div></div>`;
  try {
    const result = await api(`/api/guide?countryCode=${encodeURIComponent(state.country)}`);
    if (version !== state.routeVersion) return;
    const tabs = ['visa','health','security','customs','localInfo','laborList','phrasesList'];
    $('#guideArea').outerHTML = `<div id="guideArea" class="content-layout"><aside class="surface sidebar"><strong>${esc(countryName())} · 资料主题</strong>${tabs.map((t) => `<button data-guide-tab="${t}" class="${state.guideTab === t ? 'active' : ''}">${labels[t]}</button>`).join('')}</aside><div id="guideContent">${guideContent(result.data,state.guideTab)}</div></div>`;
    state.guide = result.data;
  } catch (error) { if (version === state.routeVersion) $('#guideArea').outerHTML = `<div class="notice">${esc(error.message)}</div>`; }
}

async function renderExplore(version) {
  $('#main').innerHTML = `<div class="shell page"><div class="page-heading"><span class="eyebrow">EXPLORE</span><h1>探索非洲</h1><p>景点与实用推荐，按照目的地整理。</p></div>${countryPicker()}<div class="chip-row"><button class="chip ${state.exploreTab==='attractions'?'active':''}" data-explore-tab="attractions">景点</button><button class="chip ${state.exploreTab==='recommend'?'active':''}" data-explore-tab="recommend">在地推荐</button></div><div id="exploreList" class="loading">正在读取资料…</div></div>`;
  try {
    const type=state.exploreTab; const result=await api(`/api/${type}?countryCode=${encodeURIComponent(state.country)}`);
    if (version !== state.routeVersion) return;
    const items=result.data || [];
    $('#exploreList').outerHTML = `<div id="exploreList">${items.length ? `<div class="item-grid">${items.map((v) => `<article class="surface item-card">${type==='attractions' ? `<img src="${esc(safeUrl(v.image) || cover(state.country))}" alt="${esc(v.name)}" loading="lazy"/>` : ''}<div class="item-body"><span class="meta">${esc(v.category || v.countryZh || countryName())}</span><h3>${esc(v.name)}</h3><p>${esc(v.desc || v.description || v.address || '')}</p>${v.safetyTip ? `<p><strong>出行提示：</strong>${esc(v.safetyTip)}</p>`:''}<button class="text-button" data-save="${type==='attractions'?'attraction':'recommend'}" data-id="${esc(v.id)}" data-title="${esc(v.name)}">收藏资料</button></div></article>`).join('')}</div>` : empty('暂无对应资料','可以切换国家或浏览其他主题。')}</div>`;
  } catch(error) { if (version===state.routeVersion) $('#exploreList').outerHTML=`<div class="notice">${esc(error.message)}</div>`; }
}

async function renderCommunity(version) {
  $('#main').innerHTML = `<div class="shell page"><div class="page-heading"><span class="eyebrow">COMMUNITY</span><h1>互助社区</h1><p>来自真实出行者的经历和提问。</p></div><div class="feed-layout"><div><form id="postForm" class="surface compose"><textarea name="content" maxlength="2000" placeholder="分享你的赴非经历或提问…" required></textarea><div class="actions"><button class="primary-btn" type="submit">发布动态</button></div></form><div id="postList" class="loading">正在读取社区动态…</div></div><aside class="surface side-panel"><h3>分享有用的经验</h3><p>讨论当地生活、行前准备和目的地体验。发布与互动需要微信扫码登录。</p><a class="secondary-btn" href="#guide">查看国别资料</a></aside></div></div>`;
  try {
    const result=await api('/api/posts'); if (version!==state.routeVersion) return;
    const posts=result.data || [];
    $('#postList').outerHTML=`<div id="postList">${posts.length ? posts.map((p)=>`<article class="surface post"><div class="post-head"><div class="avatar">${esc((p.authorName||'微').slice(0,1))}</div><div><strong>${esc(p.authorName||'微信用户')}</strong><small>${esc(p.destinationLabel||'社区动态')} · ${p.createTime ? new Date(p.createTime).toLocaleDateString('zh-CN'):''}</small></div></div><p class="post-content">${esc(p.content||'')}</p><div class="post-actions"><button data-like="${esc(p.id)}">${icon('heart')} <span>${esc(p.likeCount||0)}</span></button><button data-comments="${esc(p.id)}">${icon('message')} <span>${esc(p.commentCount||0)}</span></button><button data-save="post" data-id="${esc(p.id)}" data-title="${esc((p.content||'社区动态').slice(0,40))}">${icon('bookmark')} 收藏</button></div><div class="comments" id="comments-${esc(p.id)}" hidden></div></article>`).join('') : empty('暂无社区动态','登录后可以发布第一条分享。')}</div>`;
  } catch(error) { if(version===state.routeVersion) $('#postList').outerHTML=`<div class="notice">${esc(error.message)}</div>`; }
}

async function renderTrips(version) {
  $('#main').innerHTML=`<div class="shell page"><div class="page-heading"><span class="eyebrow">MY JOURNEYS</span><h1>我的行程</h1><p>集中记录日期、目的地与行前准备。</p></div>${!state.user ? `<div class="notice">登录后可以创建并同步行程。</div>` : ''}<div class="content-layout"><div class="surface content-panel"><h2>新建行程</h2><form id="tripForm" class="form-grid"><div class="field wide"><label>行程名称</label><input name="name" maxlength="80" placeholder="例如：阿比让学习之旅" required/></div><div class="field"><label>目的地</label><select name="countryCode">${state.countries.map((c)=>`<option value="${esc(c.countryCode)}" ${c.countryCode===state.country?'selected':''}>${esc(c.countryZh)}</option>`).join('')}</select></div><div class="field"><label>出行目的</label><select name="purpose"><option value="travel">旅行</option><option value="work">工作</option><option value="business">商务</option></select></div><div class="field"><label>出发日期</label><input type="date" name="startDate"/></div><div class="field"><label>返回日期</label><input type="date" name="endDate"/></div><div class="field wide"><label>行程备注</label><textarea name="itineraryText" placeholder="记下行程安排与待办事项"></textarea></div><div class="field wide"><button class="primary-btn" type="submit">保存行程</button></div></form></div><div><div class="surface content-panel"><h2>已保存的行程</h2><div id="tripList">${state.user?'正在读取…':'微信扫码登录后显示'}</div></div></div></div></div>`;
  if(!state.user) return;
  try{const result=await api('/api/trips');if(version!==state.routeVersion)return;const trips=result.data||[];$('#tripList').innerHTML=trips.length?`<div class="trip-list">${trips.map((t)=>`<div class="surface trip-card"><div><strong>${esc(t.name)}</strong><small>${esc(t.countryZh)} · ${esc(t.startDate||'日期待定')} ${t.endDate?'— '+esc(t.endDate):''}</small></div><button class="text-button" data-delete-trip="${esc(t.id)}">删除</button></div>`).join('')}</div>`:empty('还没有行程','创建一份行程，开始整理准备事项。');}catch(error){if(version===state.routeVersion)$('#tripList').textContent=error.message;}
}

function renderChat(){
  $('#main').innerHTML=`<div class="shell page"><div class="page-heading"><span class="eyebrow">AI ASSISTANT</span><h1>小象助手</h1><p>结合当前国别资料回答行前问题。请核对签证、安全等时效性信息。</p></div>${countryPicker()}<div class="surface chat-shell"><div class="chat-intro">${icon('spark')}<h2>先问问小象</h2><p>当前目的地：${esc(countryName())}。可询问签证准备、在地生活和安全注意事项。</p><p>AI 回答仅供整理思路，重要决定请查阅官方渠道。</p></div><div class="chat-main"><div id="chatMessages" class="chat-messages">${state.chat.length?state.chat.map((m)=>`<div class="bubble ${m.role==='user'?'user':'assistant'}">${esc(m.content)}</div>`).join(''):empty('从一个问题开始','例如：去这个国家前需要准备哪些材料？')}</div><form id="chatForm" class="chat-compose"><textarea name="message" maxlength="2000" placeholder="输入你的问题…" required></textarea><button class="primary-btn" type="submit">发送</button></form></div></div></div>`;
}

async function renderSaved(version){
  $('#main').innerHTML=`<div class="shell page"><div class="page-heading"><span class="eyebrow">MY SAVED ITEMS</span><h1>我的收藏</h1><p>保存想再次查阅的资料与动态。</p></div><div id="savedList" class="loading">正在读取收藏…</div></div>`;
  if(!state.user){$('#savedList').outerHTML=`<div class="notice">登录后可以查看你的收藏。</div>`;return;}
  try{const r=await api('/api/bookmarks');if(version!==state.routeVersion)return;const items=r.data||[];$('#savedList').outerHTML=`<div id="savedList" class="item-grid">${items.length?items.map((v)=>`<div class="surface item-body"><span class="meta">${esc(v.countryCode||'AfriGo')} · ${esc(v.resourceType)}</span><h3>${esc(v.title)}</h3><button class="text-button" data-remove-bookmark="${esc(v.id)}">取消收藏</button></div>`).join(''):empty('暂无收藏','在指南、探索或社区中收藏内容。')}</div>`;}catch(error){if(version===state.routeVersion)$('#savedList').textContent=error.message;}
}

function render(){
  const route=(location.hash||'#home').slice(1).split('?')[0]||'home';
  state.routeVersion += 1; const version=state.routeVersion;
  document.querySelectorAll('[data-nav]').forEach((a)=>a.classList.toggle('active',a.dataset.nav===route));
  if(route==='home')renderHome();else if(route==='guide')renderGuide(version);else if(route==='explore')renderExplore(version);else if(route==='community')renderCommunity(version);else if(route==='trips')renderTrips(version);else if(route==='chat')renderChat();else if(route==='saved')renderSaved(version);else{location.hash='#home';return;}
  window.scrollTo({top:0,behavior:'instant'});
}

function closeLogin(){state.loginAttempt+=1;clearInterval(state.loginTimer);state.loginTimer=null;if(state.login?.imageUrl)URL.revokeObjectURL(state.login.imageUrl);state.login=null;$('#loginModal').hidden=true;}
async function openLogin(){
  closeLogin();const attempt=state.loginAttempt;$('#loginModal').hidden=false;$('#loginQr').innerHTML='<span class="spinner"></span>';$('#loginStatus').textContent='正在获取二维码…';$('#retryLogin').hidden=true;
  try{
    const data=await api('/api/web-login/start',{method:'POST',body:'{}'});
    if(attempt!==state.loginAttempt)return;
    state.login={id:data.id,secret:data.secret,imageUrl:null};
    const response=await fetch(`/api/web-login/qr/${encodeURIComponent(data.id)}`,{cache:'no-store'});
    if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.message||'二维码暂时不可用');}
    const imageUrl=URL.createObjectURL(await response.blob());
    if(attempt!==state.loginAttempt){URL.revokeObjectURL(imageUrl);return;}
    state.login.imageUrl=imageUrl;
    $('#loginQr').innerHTML=`<img src="${imageUrl}" alt="微信小程序扫码登录二维码"/>`;
    $('#loginStatus').textContent='请用微信扫码，并在小程序中确认登录';
    let polling=false;
    state.loginTimer=setInterval(async()=>{
      if(attempt!==state.loginAttempt||polling)return;
      polling=true;
      try{const r=await api(`/api/web-login/status/${encodeURIComponent(data.id)}`,{headers:{'X-Web-Login-Secret':data.secret}});
        if(attempt!==state.loginAttempt)return;
        if(r.status==='approved'){state.token=r.token;state.user=r.user;sessionStorage.setItem('afrigo-token',r.token);updateAccount();closeLogin();toast('登录成功');render();}
      }catch(error){if(attempt===state.loginAttempt){closeLogin();toast(error.message,true);}}
      finally{polling=false;}
    },2200);
  }catch(error){if(attempt===state.loginAttempt){$('#loginQr').innerHTML=`<div class="empty">${icon('shield')}<p>二维码暂时不可用</p></div>`;$('#loginStatus').textContent=error.message;$('#retryLogin').hidden=false;}}
}

document.addEventListener('click',async(event)=>{
  const country=event.target.closest('[data-country],[data-country-link]');
  if(country){state.country=country.dataset.country||country.dataset.countryLink;localStorage.setItem('afrigo-country',state.country);state.chat=[];if(country.dataset.country)render();}
  const tab=event.target.closest('[data-guide-tab]');if(tab&&state.guide){state.guideTab=tab.dataset.guideTab;document.querySelectorAll('[data-guide-tab]').forEach((b)=>b.classList.toggle('active',b===tab));$('#guideContent').innerHTML=guideContent(state.guide,state.guideTab);}
  const explore=event.target.closest('[data-explore-tab]');if(explore){state.exploreTab=explore.dataset.exploreTab;render();}
  const save=event.target.closest('[data-save]');if(save){if(!requireLogin())return;try{await api('/api/bookmarks',{method:'POST',body:JSON.stringify({resourceType:save.dataset.save,resourceId:save.dataset.id,title:save.dataset.title,countryCode:state.country})});toast('已收藏');}catch(error){toast(error.message,true);}}
  const like=event.target.closest('[data-like]');if(like){if(!requireLogin())return;try{const r=await api(`/api/posts/${like.dataset.like}/like`,{method:'POST',body:'{}'});like.querySelector('span').textContent=r.likeCount;toast(r.isLiked?'已点赞':'已取消点赞');}catch(error){toast(error.message,true);}}
  const comments=event.target.closest('[data-comments]');if(comments){const el=$(`#comments-${CSS.escape(comments.dataset.comments)}`);if(!el.hidden){el.hidden=true;return;}el.hidden=false;el.innerHTML='正在读取评论…';try{const r=await api(`/api/posts/${comments.dataset.comments}/comments`);el.innerHTML=`${(r.data||[]).map((c)=>`<p class="comment"><strong>${esc(c.authorName)}：</strong>${esc(c.content)}</p>`).join('')||'<p class="comment">暂无评论</p>'}<form class="comment-form" data-post-id="${esc(comments.dataset.comments)}"><input name="content" maxlength="500" placeholder="写下你的评论" required/><button type="submit">发送</button></form>`;}catch(error){el.textContent=error.message;}}
  const del=event.target.closest('[data-delete-trip]');if(del){if(!confirm('确定删除这份行程吗？'))return;try{await api(`/api/trips/${del.dataset.deleteTrip}`,{method:'DELETE'});toast('行程已删除');render();}catch(error){toast(error.message,true);}}
  const remove=event.target.closest('[data-remove-bookmark]');if(remove){try{await api(`/api/bookmarks/${remove.dataset.removeBookmark}`,{method:'DELETE'});toast('已取消收藏');render();}catch(error){toast(error.message,true);}}
});
document.addEventListener('submit',async(event)=>{
  const form=event.target;if(!['postForm','tripForm','chatForm'].includes(form.id)&&!form.matches('.comment-form'))return;event.preventDefault();if(!requireLogin())return;
  const button=form.querySelector('button[type=submit]');button.disabled=true;
  try{
    if(form.id==='postForm'){await api('/api/posts',{method:'POST',body:JSON.stringify({content:form.elements.namedItem('content').value,destinationLabel:countryName()})});toast('发布成功');render();}
    else if(form.id==='tripForm'){const field=(key)=>form.elements.namedItem(key).value;const c=state.countries.find((v)=>v.countryCode===field('countryCode'));await api('/api/trips',{method:'POST',body:JSON.stringify({name:field('name'),countryCode:c.countryCode,countryZh:c.countryZh,purpose:field('purpose'),startDate:field('startDate'),endDate:field('endDate'),itineraryText:field('itineraryText'),travelers:1,currency:'CNY'})});toast('行程已保存');render();}
    else if(form.id==='chatForm'){const text=form.elements.namedItem('message').value.trim();if(!text)return;state.chat.push({role:'user',content:text});renderChat();const r=await api('/api/chat',{method:'POST',body:JSON.stringify({messages:state.chat,countryCode:state.country})});state.chat.push({role:'assistant',content:r.data?.reply||'暂时没有回答'});renderChat();}
    else{const content=form.elements.namedItem('content').value.trim();await api(`/api/posts/${form.dataset.postId}/comments`,{method:'POST',body:JSON.stringify({content})});toast('评论已发布');render();}
  }catch(error){toast(error.message,true);if(form.id==='chatForm'){state.chat.pop();renderChat();}}
  finally{button.disabled=false;}
});
$('#accountBtn').addEventListener('click',()=>state.user?logout():openLogin());
$('#closeLogin').addEventListener('click',closeLogin);
$('#retryLogin').addEventListener('click',openLogin);
$('#loginModal').addEventListener('click',(event)=>{if(event.target===$('#loginModal'))closeLogin();});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape')closeLogin();});
window.addEventListener('hashchange',render);

async function init(){
  try{const r=await api('/api/guide');state.countries=r.data||[];if(!state.countries.some((c)=>c.countryCode===state.country))state.country=state.countries[0]?.countryCode||'CI';}
  catch(error){toast(`国别资料读取失败：${error.message}`,true);}
  if(state.token){try{const r=await api('/api/auth/me');state.user=r.user;}catch{state.token='';sessionStorage.removeItem('afrigo-token');}}
  updateAccount();render();
}
init();
