
/* timetable_builder_plus.js
 * - Injects "시간표 만들기" button into the existing .toolbar
 * - Adds a builder modal to input subjects by grade, multiple classes, weekday, and period count
 * - Exports one combined timetable.json
 * - Patches CSS so the 시간표 보기(tt-grid) never clips 4,5교시 on desktop or mobile
 */
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    // ------ Patch CSS for tt-grid (prevent clipping on narrow screens) ------
    const css = `
      /* widen modal a bit and allow better wrapping on mobile */
      .modal .sheet{ width: min(96vw, 680px) !important; }

      /* timetable grid responsive: never clip, wrap with min column width */
      .tt-result{ overflow-x: auto; } /* allow horizontal scroll just in case */
      .tt-grid{
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)) !important;
        gap: 8px !important;
      }
      .tt-period{ min-width: 110px; }

      /* Extra safety on very small screens */
      @media (max-width: 520px){
        .tt-grid{ grid-template-columns: repeat(2, minmax(110px, 1fr)) !important; }
      }
      @media (max-width: 380px){
        .tt-grid{ grid-template-columns: 1fr !important; }
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // ------ Find toolbar to inject button ------
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return; // nothing to do if toolbar missing

    const btn = document.createElement('button');
    btn.id = 'btnMakeTT';
    btn.textContent = '시간표 만들기';
    btn.title = '학년/다중 반/요일/교시별 과목 편집 → 한 번에 timetable.json 내보내기';
    toolbar.prepend(btn);

    // ------ Builder modal (DOM) ------
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'ttBuildModal';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.innerHTML = `
      <div class="sheet">
        <div class="head">
          <div>시간표 만들기</div>
          <button id="ttbClose">✕</button>
        </div>
        <div class="body">
          <div class="row2">
            <label for="ttbGrade">학년</label>
            <select id="ttbGrade">
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>
          <div class="row2">
            <label for="ttbClasses">반(여러 개)</label>
            <input id="ttbClasses" placeholder="예: 1,2,3 또는 1-1,1-2 / 쉼표로 구분"/>
          </div>
          <div class="row2">
            <label for="ttbPeriods">교시 수</label>
            <input id="ttbPeriods" type="number" min="1" max="12" value="7" />
          </div>

          <div class="row2">
            <label>요일</label>
            <div class="inline" id="ttbTabs">
              <button class="mini" data-day="mon">월</button>
              <button class="mini" data-day="tue">화</button>
              <button class="mini" data-day="wed">수</button>
              <button class="mini" data-day="thu">목</button>
              <button class="mini" data-day="fri">금</button>
            </div>
          </div>

          <div class="row2">
            <label>반 선택</label>
            <div class="inline">
              <button id="ttbPrev" class="mini">◀ 이전 반</button>
              <div id="ttbCurrent" style="font-weight:800">—</div>
              <button id="ttbNext" class="mini">다음 반 ▶</button>
            </div>
          </div>

          <div id="ttbEditor" class="tt-result"></div>

          <div class="actions">
            <button id="ttbClear" class="danger mini">현재 반·요일 초기화</button>
            <button id="ttbExport" class="primary">JSON 내보내기</button>
          </div>
          <div class="hint">
            * 입력 방법: 먼저 학년/반/교시 수를 정하고 요일 탭을 눌러 과목을 입력하세요.<br/>
            * 여러 반을 쉼표로 구분해서 넣을 수 있습니다(예: 1,2,3 또는 1-1,1-2).<br/>
            * 내보내기하면 모든 반·요일의 입력값을 <code>timetable.json</code> 형식으로 다운로드합니다.
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // ------ State ------
    const KO = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금'};
    let state = {
      grade: '1',
      classKeys: [],   // ["1-1","1-2",...]
      idx: 0,          // active class index
      day: 'mon',
      periods: 7,
      data: {}         // { "1-1": { mon:[], tue:[], ... } }
    };

    // ------ DOM refs ------
    const ttbGrade   = modal.querySelector('#ttbGrade');
    const ttbClasses = modal.querySelector('#ttbClasses');
    const ttbPeriods = modal.querySelector('#ttbPeriods');
    const ttbTabs    = modal.querySelector('#ttbTabs');
    const ttbPrev    = modal.querySelector('#ttbPrev');
    const ttbNext    = modal.querySelector('#ttbNext');
    const ttbCurrent = modal.querySelector('#ttbCurrent');
    const ttbEditor  = modal.querySelector('#ttbEditor');
    const ttbExport  = modal.querySelector('#ttbExport');
    const ttbClear   = modal.querySelector('#ttbClear');
    const ttbClose   = modal.querySelector('#ttbClose');

    // ------ Helpers ------
    function normalizeClassTokens(grade, raw){
      if (!raw) return [];
      const tokens = raw.split(',').map(s => s.trim()).filter(Boolean);
      const out = [];
      for (const tk of tokens){
        if (/^\d+\s*-\s*\d+$/.test(tk)){
          // already "g-c"
          const [g,c] = tk.split('-').map(x => x.replace(/[^\d]/g,''));
          out.push(`${+g}-${+c}`);
        }else{
          // just "c"
          const c = tk.replace(/[^\d]/g,'');
          if (c) out.push(`${+grade}-${+c}`);
        }
      }
      // unique & sorted by class number
      return Array.from(new Set(out)).sort((a,b) => (+a.split('-')[1])-(+b.split('-')[1]));
    }
    function ensureBuckets(){
      for (const key of state.classKeys){
        if (!state.data[key]) state.data[key] = {mon:[],tue:[],wed:[],thu:[],fri:[]};
        for (const d of ['mon','tue','wed','thu','fri']){
          const arr = state.data[key][d];
          if (!Array.isArray(arr)) state.data[key][d] = [];
          // resize with empty strings
          const need = state.periods;
          if (arr.length < need) state.data[key][d] = arr.concat(Array(need - arr.length).fill(''));
          if (arr.length > need) state.data[key][d] = arr.slice(0, need);
        }
      }
    }
    function renderEditor(){
      ensureBuckets();
      const key = state.classKeys[state.idx];
      ttbCurrent.textContent = key ? key : '—';
      ttbTabs.querySelectorAll('button').forEach(b => {
        b.classList.toggle('primary', b.dataset.day === state.day);
      });
      if (!key){
        ttbEditor.innerHTML = '<div class="hint">먼저 반 목록을 입력하세요.</div>';
        return;
      }
      const arr = state.data[key][state.day];
      const html = `
        <div style="font-weight:900;margin-bottom:8px">${key} · ${KO[state.day]}요일 (${state.periods}교시)</div>
        <div class="tt-grid">
          ${arr.map((v,i)=>`
            <div class="tt-period">
              <div class="p">${i+1}교시</div>
              <div class="c">
                <input data-idx="${i}" type="text" placeholder="${i+1}교시 과목" value="${(v||'').replace(/"/g,'&quot;')}"
                       style="width:100%; background:#0f172a; border:1px solid rgba(255,255,255,.14); border-radius:8px; padding:6px; color:#e5e7eb"/>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      ttbEditor.innerHTML = html;
      ttbEditor.querySelectorAll('input[data-idx]').forEach(inp => {
        inp.addEventListener('input', (e)=>{
          const i = +e.target.dataset.idx;
          state.data[key][state.day][i] = e.target.value.trim();
        });
      });
    }
    function openModal(){
      // init with current controls
      state.grade   = ttbGrade.value || '1';
      state.classKeys = normalizeClassTokens(state.grade, ttbClasses.value);
      state.idx = 0;
      state.periods = Math.max(1, Math.min(12, parseInt(ttbPeriods.value||'7', 10)));
      ensureBuckets();
      renderEditor();
      modal.classList.add('show');
      modal.setAttribute('aria-hidden','false');
    }
    function closeModal(){
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden','true');
    }

    // ------ Events ------
    btn.addEventListener('click', openModal);
    ttbClose.addEventListener('click', closeModal);

    ttbGrade.addEventListener('change', ()=>{
      state.grade = ttbGrade.value || '1';
      state.classKeys = normalizeClassTokens(state.grade, ttbClasses.value);
      state.idx = 0;
      renderEditor();
    });
    ttbClasses.addEventListener('change', ()=>{
      state.classKeys = normalizeClassTokens(state.grade, ttbClasses.value);
      state.idx = 0;
      renderEditor();
    });
    ttbPeriods.addEventListener('change', ()=>{
      state.periods = Math.max(1, Math.min(12, parseInt(ttbPeriods.value||'7', 10)));
      renderEditor();
    });
    ttbTabs.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', ()=>{
        state.day = b.dataset.day;
        renderEditor();
      });
    });
    ttbPrev.addEventListener('click', ()=>{
      if (!state.classKeys.length) return;
      state.idx = (state.idx - 1 + state.classKeys.length) % state.classKeys.length;
      renderEditor();
    });
    ttbNext.addEventListener('click', ()=>{
      if (!state.classKeys.length) return;
      state.idx = (state.idx + 1) % state.classKeys.length;
      renderEditor();
    });
    ttbClear.addEventListener('click', ()=>{
      const key = state.classKeys[state.idx];
      if (!key) return;
      if (!confirm(`${key} · ${KO[state.day]} 요일 입력을 초기화할까요?`)) return;
      state.data[key][state.day] = Array(state.periods).fill('');
      renderEditor();
    });

    // ------ Export JSON ------
    ttbExport.addEventListener('click', ()=>{
      if (!state.classKeys.length){
        alert('반 목록이 비어 있습니다.');
        return;
      }
      // Clean copy: trim blanks at the tail for each day
      const out = {};
      for (const key of state.classKeys){
        out[key] = {};
        for (const d of ['mon','tue','wed','thu','fri']){
          const arr = (state.data[key][d] || []).slice(0, state.periods);
          // remove trailing empty strings
          let end = arr.length;
          while (end>0 && (!arr[end-1] || !arr[end-1].trim())) end--;
          out[key][d] = arr.slice(0, end);
        }
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'timetable.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });
})();
