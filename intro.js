// ===== Config =====
const MAIN_PAGE = "index_rows_patched.html";
const KEY = "skipIntro";

// If the user chose to skip, go directly to main
if (localStorage.getItem(KEY) === "1") {
  location.replace(MAIN_PAGE);
}

document.addEventListener("DOMContentLoaded", () => {
  const enterBtn = document.getElementById("enter");
  const skipCb = document.getElementById("skip");
  const card = document.getElementById("card");

  // Run initial cinematic then reveal card
  runCinematic().then(() => {
    card.classList.remove("hidden");
    card.focus();
  });

  // Button ripple + vortex suck + camera push
  enterBtn.addEventListener("click", () => {
    enterBtn.classList.remove("rippling");
    void enterBtn.offsetWidth;
    enterBtn.classList.add("rippling");

    if (skipCb.checked) {
      try { localStorage.setItem(KEY, "1"); } catch {}
    }

    playVortexWithCamera().then(() => {
      location.assign(MAIN_PAGE);
    });
  });

  // Keyboard: Enter to continue
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enterBtn.click();
  });

  // Background particles
  initParticles();
});

// ===== Vortex suck-in + camera push =====
function playVortexWithCamera(){
  const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (rm.matches) return Promise.resolve();

  const camera = document.getElementById("camera");
  const wrap = document.getElementById("suck");
  const lines = document.getElementById("speedlines");
  const swirl = wrap.querySelector(".swirl");
  const ctx = lines.getContext("2d", { alpha: true });

  // Activate overlay + camera push
  wrap.classList.add("active");
  camera.classList.add("camera-in");

  let w, h, dpr;
  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = lines.width = Math.floor(innerWidth * dpr);
    h = lines.height = Math.floor(innerHeight * dpr);
    lines.style.width = innerWidth + "px";
    lines.style.height = innerHeight + "px";
  }
  resize();

  const cx = w/2, cy = h/2;
  const N = Math.floor(Math.sqrt(w*h)/18); // density
  const parts = Array.from({length: N}, ()=>spawn());
  function spawn(){
    const angle = Math.random()*Math.PI*2;
    const radius = Math.max(w,h) * (0.7 + Math.random()*0.7);
    const speed = 12 + Math.random()*22;
    return { 
      x: cx + Math.cos(angle)*radius,
      y: cy + Math.sin(angle)*radius,
      vx: -(Math.cos(angle))*speed,
      vy: -(Math.sin(angle))*speed,
      life: 320 + Math.random()*200
    };
  }

  const start = performance.now();
  const dur = 850;

  function step(now){
    const t = Math.min(1, (now-start)/dur);
    ctx.clearRect(0,0,w,h);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let p of parts){
      const ax = (cx - p.x) * 0.0018;
      const ay = (cy - p.y) * 0.0018;
      p.vx += ax; p.vy += ay;
      p.x += p.vx; p.y += p.vy;
      p.life -= 16;
      const a = Math.max(0, Math.min(1, p.life/220));
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx*0.6, p.y + p.vy*0.6);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2 + (1-t)*2.2;
      ctx.stroke();
    }

    ctx.restore();
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  return new Promise(res=> setTimeout(res, dur));
}

// ===== Cinematic: projectile streak + impact flash + shake =====
function runCinematic(){
  const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (rm.matches) return Promise.resolve();

  const cvs = document.getElementById("fx");
  const flash = document.getElementById("flash");
  const ctx = cvs.getContext("2d");
  let w, h, dpr;
  function resize(){
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = cvs.width = Math.floor(innerWidth * dpr);
    h = cvs.height = Math.floor(innerHeight * dpr);
    cvs.style.width = innerWidth + "px";
    cvs.style.height = innerHeight + "px";
  }
  resize(); window.addEventListener("resize", resize, {once:true});

  const yBase = (h * (0.3 + Math.random() * 0.4));
  const slope = (Math.random() * 0.2 - 0.1);
  const duration = 900; // ms
  const impactX = w * (0.65 + Math.random()*0.25);
  const impactY = yBase + (impactX - 0) * slope;

  let start = performance.now();

  function draw(now){
    const t = Math.min(1, (now - start)/duration);
    ctx.clearRect(0,0,w,h);

    const x = -w*0.2 + (w*1.4) * t;
    const y = yBase + (x - 0) * slope;

    const trail = 180 * (1 - t);
    const grad = ctx.createLinearGradient(x - trail, y - trail*slope, x, y);
    grad.addColorStop(0, "rgba(147,197,253,0)");
    grad.addColorStop(1, "rgba(255,255,255,0.9)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(1, 4 * (1 + (1 - t)));
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - trail, y - trail*slope);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.arc(x, y, 2.2 + 1.8*(1-t), 0, Math.PI*2);
    ctx.fill();

    if (x >= impactX){
      impact(now);
      return;
    }
    requestAnimationFrame(draw);
  }

  function impact(ts){
    const flashEl = document.getElementById("flash");
    flashEl.style.transition = "opacity .09s ease";
    flashEl.style.opacity = "1";
    setTimeout(()=> flashEl.style.opacity = "0", 90);

    const start = ts;
    const dur = 260;
    const amp = 10;
    function shake(now){
      const p = Math.min(1, (now-start)/dur);
      const damp = (1 - p);
      const x = (Math.random()*2-1) * amp * damp;
      const y = (Math.random()*2-1) * amp * damp;
      document.body.style.transform = `translate(${x}px, ${y}px)`;
      if (p < 1) requestAnimationFrame(shake);
      else document.body.style.transform = "";
    }
    requestAnimationFrame(shake);

    ring(impactX, impactY);
  }

  function ring(x, y){
    const start = performance.now();
    const dur = 420;
    function step(now){
      const t = Math.min(1,(now-start)/dur);
      ctx.clearRect(0,0,w,h);
      ctx.beginPath();
      ctx.arc(x, y, 6 + 80*t, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(255,255,255,${(1-t)*.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  return new Promise((resolve)=>{
    requestAnimationFrame(draw);
    setTimeout(resolve, duration + 320);
  });
}

// ===== Background particles =====
function initParticles(){
  const cvs = document.getElementById("bg");
  const ctx = cvs.getContext("2d", { alpha: true });
  let w, h, dpr, particles = [];
  const rm = window.matchMedia("(prefers-reduced-motion: reduce)");

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = cvs.width = Math.floor(innerWidth * dpr);
    h = cvs.height = Math.floor(innerHeight * dpr);
    cvs.style.width = innerWidth + "px";
    cvs.style.height = innerHeight + "px";
    const count = rm.matches ? 0 : Math.floor((w*h) / (18000 * dpr));
    particles = Array.from({length: count}, () => spawn());
  }
  function spawn(){
    const speed = (Math.random() * 0.3 + 0.15) * (Math.random() < .5 ? 1 : -1);
    return {
      x: Math.random() * w, y: Math.random() * h,
      vx: speed, vy: speed * (Math.random()*0.6 + 0.4),
      r: Math.random() * 1.6 + 0.4, a: Math.random()*0.4 + 0.2
    };
  }
  function step(){
    ctx.clearRect(0,0,w,h);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let p of particles){
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h){
        Object.assign(p, spawn());
        if (Math.random()<.5) p.x = Math.random()*w, p.y = (Math.random()<.5? 0:h);
        else p.y = Math.random()*h, p.x = (Math.random()<.5? 0:w);
      }
      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = "#93c5fd";
      ctx.fill();
    }
    ctx.restore();
    requestAnimationFrame(step);
  }

  window.addEventListener("resize", resize);
  resize();
  step();
}
