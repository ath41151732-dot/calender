
/*! AlarmLite — minimal calendar alarm (standalone) */
(function(){
  const STORE_KEY = 'alarms_v1';

  // ---------- CSS ----------
  const css = `
    .al-bell-btn{
      display:inline-flex; align-items:center; gap:6px;
      margin-left:8px; padding:4px 8px; border:1px solid rgba(0,0,0,.15);
      border-radius:8px; cursor:pointer; font-size:12px; opacity:.9;
      background:#0b1220; color:#e5e7eb;
    }
    [data-theme="light"] .al-bell-btn{ background:#fff; color:#0f172a; border-color:#d6dbe4; }
    .al-bell-btn:hover{ opacity:1; }

    .al-badge{ margin-left:6px; }
    .al-badge::before{ content:"🔔"; }

    .al-modal{ position:fixed; inset:0; display:none; place-items:center; background:rgba(0,0,0,.42); z-index:9999; }
    .al-modal.show{ display:grid; }
    .al-sheet{ width:min(92vw, 420px); background:#111827; color:#e5e7eb; border:1px solid rgba(255,255,255,.12); border-radius:14px; }
    [data-theme="light"] .al-sheet{ background:#fff; color:#0f172a; border:1px solid #e1e5ed; }
    .al-head{ display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.12); }
    [data-theme="light"] .al-head{ border-bottom-color:#e1e5ed; }
    .al-body{ padding:14px; display:grid; gap:12px; }
    .al-row{ display:grid; grid-template-columns: 88px 1fr; gap:10px; align-items:center; }
    .al-row input,.al-row select{
      width:100%; padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,.18); background:#0b1220; color:#e5e7eb;
    }
    [data-theme="light"] .al-row input,[data-theme="light"] .al-row select{ background:#fff; color:#0f172a; border-color:#d6dbe4; }
    .al-actions{ display:flex; gap:8px; justify-content:flex-end; padding:12px 14px; border-top:1px solid rgba(255,255,255,.12); }
    [data-theme="light"] .al-actions{ border-top-color:#e1e5ed; }
    .al-btn{ padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.18); background:#0b1220; color:#e5e7eb; cursor:pointer; }
    [data-theme="light"] .al-btn{ background:#fff; color:#0f172a; border-color:#d6dbe4; }
    .al-btn.primary{ background:linear-gradient(180deg,#6366f1,#4338ca); color:#fff; border-color:transparent; }
    .al-btn.danger{ color:#ef4444; border-color:#ef4444; background:transparent; }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- 상태 ----------
  const store = load();
  function load(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY)||'{}'); }catch(e){ return {}; } }
  function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(store)); }

  // ---------- 유틸 ----------
  function slug(s){ return (s||'').trim().replace(/\s+/g,'_').replace(/[^\w\-_.]/g,'').slice(0,60); }
  function getRowDate(row){
    const d = row.getAttribute('data-date') || row.getAttribute('data-start');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const m = (row.textContent||'').match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : null;
  }
  function getRowTitle(row){
    const t = row.querySelector('.t');
    const txt = (t ? t.textContent : row.textContent)||'';
    return txt.trim();
  }
  function getRowId(row){
    return row.getAttribute('data-id') || (function(){
      const d = getRowDate(row) || 'unknown';
      return `ev_${d}_${slug(getRowTitle(row))}`;
    })();
  }
  function computeAlarmDate(dateStr, dday, hhmm){
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const [y,m,d]=dateStr.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    dt.setDate(dt.getDate() - (parseInt(dday,10)||0));
    const [H,M]=(hhmm||'08:00').split(':').map(Number);
    dt.setHours(H||0, M||0, 0, 0);
    return dt;
  }

  // ---------- 모달 ----------
  let modal=null;
  function ensureModal(){
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-sheet" role="dialog" aria-modal="true">
        <div class="al-head">
          <div style="font-weight:700">알람 설정</div>
          <button class="al-btn" data-al-close>✕</button>
        </div>
        <div class="al-body">
          <div class="al-row"><label>D-day</label>
            <select data-al-dday>${[0,1,2,3,5,7,10,14,30].map(d=>`<option value="${d}">${d}일 전</option>`).join('')}</select>
          </div>
          <div class="al-row"><label>시간</label>
            <input type="time" value="08:00" data-al-time />
          </div>
          <div class="al-row"><label>상태</label>
            <select data-al-enabled><option value="on">켜짐</option><option value="off">꺼짐</option></select>
          </div>
          <div class="al-row"><label>일정</label>
            <div><div data-al-title style="font-weight:700;margin-bottom:4px"></div><div data-al-date style="opacity:.8"></div></div>
          </div>
        </div>
        <div class="al-actions">
          <button class="al-btn danger" data-al-remove>알람 삭제</button>
          <div style="flex:1"></div>
          <button class="al-btn" data-al-cancel>취소</button>
          <button class="al-btn primary" data-al-save>저장</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e)=>{
      if (e.target===modal || e.target.hasAttribute('data-al-close') || e.target.hasAttribute('data-al-cancel')) closeModal();
    });
    return modal;
  }
  function openModal(ev){
    const m = ensureModal();
    m.classList.add('show');
    m.dataset.targetId = ev.id;
    m.querySelector('[data-al-title]').textContent = ev.title;
    m.querySelector('[data-al-date]').textContent  = ev.date;
    const cur = store[ev.id] || { dday:1, time:'08:00', enabled:true };
    m.querySelector('[data-al-dday]').value = String(cur.dday ?? 1);
    m.querySelector('[data-al-time]').value = cur.time || '08:00';
    m.querySelector('[data-al-enabled]').value = cur.enabled===false?'off':'on';
    const rm = m.querySelector('[data-al-remove]');
    rm.style.display = store[ev.id] ? 'inline-flex':'none';

    m.querySelector('[data-al-save]').onclick = ()=>{
      const dday = parseInt(m.querySelector('[data-al-dday]').value, 10);
      const time = m.querySelector('[data-al-time]').value || '08:00';
      const enabled = m.querySelector('[data-al-enabled]').value === 'on';
      store[ev.id] = { dday, time, enabled, date: ev.date, title: ev.title };
      plan(ev.id);
      save(); refreshBadges(); closeModal();
      if ('Notification' in window && Notification.permission==='default'){ Notification.requestPermission(); }
    };
    m.querySelector('[data-al-remove]').onclick = ()=>{
      delete store[ev.id]; save(); refreshBadges(); cancel(ev.id); closeModal();
    };
  }
  function closeModal(){ if (modal) modal.classList.remove('show'); }

  // ---------- 리스트 바인딩 ----------
  function bindList(){
    const root = document.querySelector('.right') || document;
    root.addEventListener('click', (e)=>{
      const row = e.target.closest('.row');
      if (!row) return;
      revealBell(row);
    });
  }
  function revealBell(row){
    if (row.querySelector('.al-bell-btn')) return;
    const titleEl = row.querySelector('.t') || row;
    const btn = document.createElement('button');
    btn.type='button'; btn.className='al-bell-btn'; btn.innerHTML='알람 <span>🔔</span>';
    titleEl.appendChild(btn);
    btn.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const date = getRowDate(row);
      const id   = getRowId(row);
      const title= getRowTitle(row);
      if (!date){ alert('이 일정의 날짜를 찾을 수 없어요. data-date(YYYY-MM-DD)를 넣어주세요.'); return; }
      openModal({ id, date, title });
    });
  }

  // ---------- 뱃지 ----------
  function refreshBadges(){
    document.querySelectorAll('.row').forEach(row=>{
      const id = getRowId(row);
      const has = !!store[id];
      let b = row.querySelector('.al-badge');
      if (has && !b){
        b = document.createElement('span'); b.className='al-badge';
        const t = row.querySelector('.t') || row; t.appendChild(b);
      }else if (!has && b){ b.remove(); }
    });
  }

  // ---------- 스케줄링 ----------
  function plan(id){
    const conf = store[id];
    if (!conf || conf.enabled===false) return;
    const at = computeAlarmDate(conf.date, conf.dday, conf.time);
    if (!at) return;
    conf.nextAt = at.getTime(); save();
    const ms = at.getTime() - Date.now();
    if (ms>0 && ms<24*3600*1000){
      if (conf._timer) clearTimeout(conf._timer);
      conf._timer = setTimeout(()=> fire(id), ms);
    }
  }
  function cancel(id){ const c = store[id]; if (c && c._timer) clearTimeout(c._timer); }
  function tick(){
    const now = Date.now();
    for (const [id,c] of Object.entries(store)){
      if (!c.enabled) continue;
      if (!c.nextAt){ plan(id); continue; }
      if (now >= c.nextAt){ fire(id); }
    }
  }
  function fire(id){
    const c = store[id]; if (!c) return;
    const title = c.title || '일정 알람';
    const body  = `${c.dday===0?'오늘':'D-'+c.dday} • ${c.date}`;
    if ('Notification' in window && Notification.permission==='granted'){
      const n = new Notification(title, { body, tag:id }); setTimeout(()=>n.close(), 8000);
    }else{
      alert(`🔔 ${title}\n${body}`);
    }
    try{ // 짧은 삑소리
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.001,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2,ctx.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);
      o.start(); o.stop(ctx.currentTime+0.45);
    }catch(e){}
    c.enabled = false; save(); refreshBadges();
  }

  // ---------- Add Event 폼에 알람 필드 주입(있을 때만) ----------
  function attachAddForm(){
    const form = document.querySelector('#addEventForm'); if (!form) return;
    if (form.querySelector('[data-al-add]')) return;
    const box = document.createElement('div');
    box.setAttribute('data-al-add','');
    box.innerHTML = `
      <div class="al-row" style="margin-top:10px">
        <label>알람</label>
        <div style="display:flex; gap:8px; align-items:center">
          <select data-al-add-dday>${[0,1,2,3,5,7,10,14,30].map(d=>`<option value="${d}">${d}일 전</option>`).join('')}</select>
          <input type="time" value="08:00" data-al-add-time/>
          <label style="display:inline-flex; align-items:center; gap:6px"><input type="checkbox" data-al-add-on checked/> 사용</label>
        </div>
      </div>`;
    form.appendChild(box);
    form.addEventListener('submit',(e)=>{
      const on   = form.querySelector('[data-al-add-on]')?.checked;
      const date = form.querySelector('[name="date"]')?.value;
      const title= form.querySelector('[name="title"]')?.value || '';
      if (on && date){
        const dday = parseInt(form.querySelector('[data-al-add-dday]').value,10);
        const time = form.querySelector('[data-al-add-time]').value || '08:00';
        const id   = `ev_${date}_${slug(title||'event')}`;
        store[id] = { dday, time, enabled:true, date, title };
        save(); setTimeout(()=>{ refreshBadges(); plan(id); },0);
      }
    });
  }

  // ---------- 시작 ----------
  function init(){
    bindList();
    attachAddForm();
    refreshBadges();
    Object.keys(store).forEach(plan);
    tick();
    setInterval(tick, 60*1000);
    window.addEventListener('focus', tick);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();

  // expose for optional customization
  window.AlarmLite = { refreshBadges: refreshBadges };
})();
