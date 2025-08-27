
// theme_switch_slider_inline.js
// Place a Light/Dark slider inline RIGHT NEXT to the small note text on the list header
// (e.g., the element that shows "휴일·시험·행사"). Adds a small gap between the text and slider.
// - Only light/dark (no auto)
// - Persists in localStorage
// - Includes light-mode contrast fixes
//
// Usage: <script src="theme_switch_slider_inline.js"></script>
// Best: mark the exact note element with an attribute for precise targeting:
//   <span class="note" data-list-note>휴일·시험·행사</span>

(function(){
  const KEY = 'phhs_theme_mode';   // 'light' | 'dark'
  const THEME_COLOR = { light: '#f4f6fb', dark: '#0b0f19' };

  function cleanupOld(){
    const oldBtn = document.getElementById('btnTheme');
    if (oldBtn && oldBtn.parentNode) oldBtn.parentNode.removeChild(oldBtn);
    document.querySelectorAll('.theme-switch-wrap,.theme-switch-anchor,.theme-switch-inline').forEach(w => w.remove());
    ['theme-toggle-css','theme-toggle-v2-css','theme-toggle-v3-css',
     'theme-switch-slider-css','theme-switch-slider-month-css',
     'theme-switch-slider-month-pin-css','theme-switch-slider-list-css',
     'theme-switch-slider-inline-css'].forEach(id=>{
      const el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function injectCSS(){
    const css = `
      [data-theme="light"]{
        --bg:#f4f6fb; --card:#ffffff; --surface:#ffffff; --surface-2:#f7f9fd;
        --text:#0f172a; --muted:#475569; --accent:#4f46e5; --ring:rgba(79,70,229,.30);
        --today:#b45309; --holiday:#dc2626; --exam:#b45309; --school:#15803d;
        --border:#d6dbe4; --border-weak:#e1e5ed;
        --chip:#eef2f9; --chip-border:#d6dbe4; --legend:#475569;
        --cell-gap:6px;
      }
      [data-theme="dark"]{
        --bg:#0b0f19; --card:#111827; --surface:#0b1220; --surface-2:rgba(255,255,255,.02);
        --text:#e5e7eb; --muted:#9ca3af; --accent:#4f46e5; --ring:rgba(79,70,229,.35);
        --today:#f59e0b; --holiday:#ef4444; --exam:#eab308; --school:#22c55e;
        --border:rgba(255,255,255,.12); --border-weak:rgba(255,255,255,.08);
        --chip:rgba(255,255,255,.06); --chip-border:rgba(255,255,255,.18); --legend:#cbd5e1;
        --cell-gap:6px;
      }
      body{ background:var(--bg); color:var(--text); }

      /* Light-mode contrast fixes */
      [data-theme="light"] button{ background:var(--surface); color:var(--text); border-color:var(--border); }
      [data-theme="light"] button:hover{ background:var(--chip); border-color:var(--chip-border); }
      [data-theme="light"] button.primary{
        background: linear-gradient(180deg, var(--accent), #4338ca)!important;
        color:#fff!important; border-color:transparent!important; box-shadow:0 8px 18px var(--ring);
      }
      [data-theme="light"] .card{ background:linear-gradient(180deg,#fff,#f7f9fd); border:1px solid var(--border); }
      [data-theme="light"] .header{ border-bottom:1px solid var(--border); }
      [data-theme="light"] .cell{ background:var(--surface); border:1px solid var(--border); }
      [data-theme="light"] .cell:hover{ background:var(--surface-2); border-color:var(--chip-border); }
      [data-theme="light"] .selected{ background:rgba(79,70,229,.10)!important; border-color:rgba(79,70,229,.45); }
      [data-theme="light"] .legend{ color:var(--legend); }
      [data-theme="light"] .legend .item{ background:var(--surface-2); border-color:var(--border); }
      [data-theme="light"] .row{ background:var(--surface-2); border:1px solid var(--border); }
      [data-theme="light"] .row .t .ext{ background:var(--chip); border:1px solid var(--chip-border); color:var(--text); }
      [data-theme="light"] .sheet{ background:var(--card); border:1px solid var(--border); }
      [data-theme="light"] select,[data-theme="light"] input{ background:var(--surface); border:1px solid var(--border); color:var(--text); }
      [data-theme="light"] .tt-result{ border-top:1px dashed var(--border); }
      [data-theme="light"] .tt-period{ background:var(--surface-2); border:1px solid var(--border); }
      [data-theme="light"] .tt-period .p{ color:#5b6472; }
      [data-theme="light"] .weekdays{ border-bottom:1px solid var(--border); }
      [data-theme="light"] .fill.holiday{ background:rgba(239,68,68,.10)!important; border-color:rgba(239,68,68,.25); }
      [data-theme="light"] .fill.exam{ background:rgba(234,179,8,.12)!important; border-color:rgba(234,179,8,.28); }
      [data-theme="light"] .fill.school{ background:rgba(34,197,94,.10)!important; border-color:rgba(34,197,94,.25); }
      [data-theme="light"] .fill.personal{ background:rgba(56,189,248,.10)!important; border-color:rgba(56,189,248,.25); }

      /* Compact inline slider styles */
      .theme-switch{
        --h: 22px; --w: 52px; --pad: 3px; --kn: 16px;
        position: relative; width: var(--w); height: var(--h);
        border-radius: calc(var(--h) / 2);
        background: linear-gradient(180deg,#0ea5e9,#6366f1);
        display:inline-flex; align-items:center; padding: var(--pad);
        cursor: pointer; user-select: none; border: 1px solid rgba(255,255,255,.25);
        box-shadow: inset 0 1px 2px rgba(0,0,0,.12);
        vertical-align: middle;
      }
      [data-theme="light"] .theme-switch{ background: linear-gradient(180deg,#94a3b8,#64748b); border-color: rgba(0,0,0,.10); }
      .theme-switch .knob{
        width: var(--kn); height: var(--kn); border-radius: 50%;
        background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.25);
        transform: translateX(0); transition: transform .22s ease;
      }
      .theme-switch.is-dark .knob{ transform: translateX(calc(var(--w) - var(--kn) - var(--pad)*2)); }
      .theme-switch .ico{
        position:absolute; top:50%; transform: translateY(-50%); font-size: 10px; opacity:.9;
      }
      .theme-switch .sun{ left: 6px; }
      .theme-switch .moon{ right: 6px; }

      .theme-switch-inline{
        display:inline-flex; align-items:center; gap:6px; margin-left: 10px; /* small gap from text */
      }
      .theme-switch-label{ font-size: 12px; opacity:.82; white-space:nowrap; }
    `;
    const style = document.createElement('style');
    style.id = 'theme-switch-slider-inline-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function findListMonthHeader(){
    const explicit = document.querySelector('[data-list-month-header]');
    if (explicit) return explicit;
    const right = document.querySelector('.right') || document;
    const pattern = /(\d{4})\s*년\s*(\d{1,2})\s*월\s*일정/;
    const tags = right.querySelectorAll('h1,h2,h3,div,span,p');
    for (const el of tags){
      const txt = (el.textContent || '').trim();
      if (pattern.test(txt)) return el;
    }
    return null;
  }

  // Find the small note element (e.g., "휴일·시험·행사") on the list header line
  function findNoteElement(){
    const explicit = document.querySelector('[data-list-note]');
    if (explicit) return explicit;
    const right = document.querySelector('.right') || document;
    const header = findListMonthHeader();
    // Prefer searching within the same line or siblings
    const scope = (header && header.parentElement) ? header.parentElement : right;
    const pattern = /휴일.*시험.*행사|시험.*휴일.*행사|행사.*휴일.*시험/;
    const nodes = scope.querySelectorAll('small, span, div, p');
    for (const el of nodes){
      const txt = (el.textContent || '').replace(/\s+/g,'').trim();
      if (!txt) continue;
      if (pattern.test(txt)) return el;
    }
    // As a last fallback, return toolbar
    return document.querySelector('.toolbar') || document.body;
  }

  function ensureThemeMeta(){
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m){
      m = document.createElement('meta');
      m.setAttribute('name','theme-color');
      document.head.appendChild(m);
    }
    return m;
  }

  function apply(mode){
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    const meta = ensureThemeMeta();
    meta.setAttribute('content', THEME_COLOR[mode] || THEME_COLOR.dark);
    if (switchEl){
      switchEl.classList.toggle('is-dark', mode === 'dark');
      if (labelEl) labelEl.textContent = mode === 'dark' ? '다크' : '라이트';
    }
  }

  function toggleMode(){
    const cur = (localStorage.getItem(KEY) || 'dark');
    const next = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    apply(next);
  }

  let switchEl, labelEl;
  function injectSwitch(){
    const note = findNoteElement();
    const wrap = document.createElement('span');
    wrap.className = 'theme-switch-inline';

    const sw = document.createElement('span');
    sw.className = 'theme-switch';
    sw.setAttribute('role','switch');
    sw.setAttribute('aria-label','테마 전환 (라이트/다크)');
    sw.tabIndex = 0;
    sw.innerHTML = '<span class="ico sun">☀️</span><span class="ico moon">🌙</span><span class="knob"></span>';
    sw.addEventListener('click', toggleMode);
    sw.addEventListener('keydown', (e)=>{
      if (e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); toggleMode(); }
    });

    const label = document.createElement('span');
    label.className = 'theme-switch-label';
    label.textContent = '다크';

    wrap.appendChild(sw);
    wrap.appendChild(label);

    // Insert right AFTER the note element
    if (note.nextSibling){
      note.parentNode.insertBefore(wrap, note.nextSibling);
    } else {
      note.parentNode.appendChild(wrap);
    }

    switchEl = sw;
    labelEl = label;
  }

  function init(){
    cleanupOld();
    injectCSS();
    injectSwitch();
    const saved = (localStorage.getItem(KEY) || 'dark'); // default dark
    apply(saved);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
