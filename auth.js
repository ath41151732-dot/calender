// auth.js — PHHS 전용 Google 로그인 (@phhs.kr 도메인 제한)
// 정적 사이트(깃허브 Pages/Netlify 등)에서 바로 동작하도록 Firebase v10 CDN 모듈 사용

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence,
  signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

console.log("[auth] loaded");

// 🔧 네가 준 Firebase 설정 (콘솔에서 복사한 값)
const firebaseConfig = {
  apiKey: "AIzaSyCMBAyFozLAyVhsnm7Yl-SBJXVGAkLiysY",
  authDomain: "calender-6fe09.firebaseapp.com",
  projectId: "calender-6fe09",
  storageBucket: "calender-6fe09.firebasestorage.app",
  messagingSenderId: "822464492939",
  appId: "1:822464492939:web:d0b65cf1cd2d73b706ab8e",
  measurementId: "G-N2WYX8GBFT"
};

// Firebase 초기화
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 같은 브라우저에서 로그인 상태 유지
setPersistence(auth, browserLocalPersistence).catch(console.warn);

// 허용할 구글 이메일 도메인
const ALLOWED_DOMAIN = "phhs.kr";

// 로그인 UI를 꽂을 자리 확보
function ensureBox(){
  // 1) 명시적 자리
  let box = document.getElementById("authBox");
  if (box) return box;

  // 2) 기존 툴바 오른쪽
  const bar = document.querySelector(".toolbar");
  if (bar){
    box = document.createElement("div");
    box.id = "authBox";
    box.style.marginLeft = "auto";
    box.style.display = "flex";
    box.style.alignItems = "center";
    box.style.gap = "8px";
    bar.appendChild(box);
    return box;
  }

  // 3) 임시 우상단 고정
  box = document.createElement("div");
  box.id = "authBox";
  box.style.cssText = "position:fixed;top:10px;right:10px;z-index:9999;display:flex;gap:8px;align-items:center";
  document.body.appendChild(box);
  return box;
}

// 비로그인 UI
function renderSignedOut(){
  const box = ensureBox(); if (!box) return;
  box.innerHTML = "";
  const btn = document.createElement("button");
  btn.textContent = "구글로 로그인";
  btn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    // 'hd'는 선택화면 힌트(완전 강제는 아니라서 아래에서 재검사)
    provider.setCustomParameters({ hd: ALLOWED_DOMAIN, prompt: "select_account" });
    try{
      const res = await signInWithPopup(auth, provider);
      const email = (res.user?.email || "").toLowerCase();
      if (!email.endsWith("@"+ALLOWED_DOMAIN)) {
        await signOut(auth);
        alert(`${ALLOWED_DOMAIN} 계정만 로그인할 수 있어요.`);
      }
    }catch(e){
      if (e?.code !== "auth/popup-closed-by-user"){
        alert("로그인 실패: " + (e?.message || e));
      }
    }
  });
  box.appendChild(btn);
}

// 로그인 UI
function renderSignedIn(user){
  const box = ensureBox(); if (!box) return;
  box.innerHTML = "";
  const who = document.createElement("span");
  who.style.fontSize = "12px";
  who.style.opacity = ".8";
  who.textContent = `${user.displayName || user.email} 로그인됨`;
  const out = document.createElement("button");
  out.textContent = "로그아웃";
  out.addEventListener("click", () => signOut(auth));
  box.append(who, out);
}

// 로그인 상태 반영 + 도메인 강제
onAuthStateChanged(auth, (user) => {
  const ok = !!user && (user.email || "").toLowerCase().endsWith("@"+ALLOWED_DOMAIN);
  if (ok) renderSignedIn(user);
  else    renderSignedOut();
});

// 디버깅용
window.phhsAuth = { auth, signOut, onAuthStateChanged };
