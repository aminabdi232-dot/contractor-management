import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const SUPABASE_URL = "https://oqolkqwnsivoqnegagdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_-F4sy_LmvOXS8LFywNnNMQ_akJ91gic";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const path = location.pathname.split("/").pop() || "index.html";
const query = new URLSearchParams(location.search);
const moduleMap = {"projects.html":"projects","finance.html":"finance","payroll.html":"payroll","technical.html":"technical","documents.html":"documents","services.html":"services"};

const $ = (s, root=document) => root.querySelector(s);

// مقیاس یکپارچه فونت‌ها: همه صفحات ۲ پیکسل بزرگ‌تر، صفحه کمیسیون معاملات ۲ پیکسل کوچک‌تر
function applyGlobalFontScale() {
  const delta = path === "transactions.html" ? -2 : 2;
  const scale = root => {
    if (!(root instanceof Element)) return;
    const nodes = [root, ...root.querySelectorAll("*")];
    const measured = nodes
      .filter(el => el.dataset.fontScaleApplied !== "1" && !/^(SCRIPT|STYLE|SVG|PATH|USE|META|LINK)$/i.test(el.tagName))
      .map(el => [el, Number.parseFloat(getComputedStyle(el).fontSize)]);
    for (const [el, size] of measured) {
      if (!Number.isFinite(size) || size <= 0) continue;
      const sidebarBoost = el.closest("#app-sidebar") ? 3 : 0;
      el.style.setProperty("font-size", Math.max(9, size + delta + sidebarBoost) + "px", "important");
      el.dataset.fontScaleApplied = "1";
    }
  };
  scale(document.body);
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) scale(node);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
if (document.body) applyGlobalFontScale();


function message(el, text, bad=false) {
  if (!el) return;
  el.textContent = text;
  el.style.color = bad ? "#fca5a5" : "#5eead4";
}
async function profileFor(user) {
  const {data,error}=await supabase.from("app_profiles").select("full_name,is_admin,is_active,job_title").eq("id",user.id).single();
  if(error) throw error;
  if(!data.is_active) throw new Error("حساب شما غیرفعال است. با مدیر سامانه تماس بگیرید.");
  return data;
}

async function recoveryPage(){
 const form=$("#recovery-form"), status=$("#recovery-status");
 form.addEventListener("submit",async e=>{
  e.preventDefault();const email=$("#recovery-email").value.trim();
  const btn=form.querySelector("button");btn.disabled=true;message(status,"در حال ارسال لینک بازیابی...");
  try{
   const redirectTo="https://aminabdi232-dot.github.io/contractor-management/reset-password.html";
   const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo});
   if(error)throw error;
   message(status,"لینک بازیابی ارسال شد. صندوق ورودی و پوشه هرزنامه را بررسی کنید.");
  }catch(err){message(status,err.message||"ارسال ایمیل انجام نشد.",true);}
  finally{btn.disabled=false;}
 });
}
async function resetPasswordPage(){
 const form=$("#reset-form"),status=$("#reset-status");
 let recoveryReady=false;
 const enable=()=>{recoveryReady=true;};
 supabase.auth.onAuthStateChange((event,session)=>{if(event==="PASSWORD_RECOVERY"&&session)enable();});
 const {data:{session}}=await supabase.auth.getSession();
 if(session)enable();
 if(!session && !location.hash.includes("access_token") && !location.search.includes("code=")) message(status,"نشست بازیابی دریافت نشد. لینک ایمیل ممکن است منقضی شده باشد یا آدرس بازگشت آن درست تنظیم نشده باشد. از صفحه بازیابی، لینک تازه‌ای درخواست کنید.",true);
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  const password=$("#new-password").value,confirm=$("#confirm-password").value;
  if(password.length<8){message(status,"رمز عبور باید حداقل ۸ کاراکتر باشد.",true);return;}
  if(password!==confirm){message(status,"تکرار رمز عبور با رمز جدید مطابقت ندارد.",true);return;}
  const btn=form.querySelector("button");btn.disabled=true;message(status,"در حال ثبت رمز جدید...");
  try{
   const {data:{session:current}}=await supabase.auth.getSession();
   if(!recoveryReady&&!current)throw new Error("نشست بازیابی معتبر نیست. دوباره از صفحه ورود درخواست لینک بازیابی کنید.");
   const {error}=await supabase.auth.updateUser({password});
   if(error)throw error;
   await supabase.auth.signOut();
   message(status,"رمز عبور با موفقیت تغییر کرد. در حال انتقال به صفحه ورود...");
   setTimeout(()=>location.replace("login.html"),1200);
  }catch(err){message(status,err.message||"تغییر رمز انجام نشد.",true);btn.disabled=false;}
 });
}

async function loginPage() {
  const form=$("#login-form"), status=$("#login-status");
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const identifier=$("#login-identifier").value.trim(), password=$("#password").value;
    const btn=form.querySelector("button"); btn.disabled=true; message(status,"در حال بررسی اطلاعات ورود...");
    try {
      // اگر شناسه شامل @ باشد، ورود با ایمیل انجام می‌شود؛ در غیر این صورت شماره همراه استفاده می‌شود.
      const phone=identifier.replace(/[\s()-]/g,"");
      const normalizedPhone=/^09\d{9}$/.test(phone)?"+98"+phone.slice(1):/^9\d{9}$/.test(phone)?"+98"+phone:phone;
      const credentials=identifier.includes("@")
        ? {email:identifier,password}
        : {phone:normalizedPhone,password};
      const {data,error}=await supabase.auth.signInWithPassword(credentials);
      if(error) {
        if(!identifier.includes("@") && /Phone logins are disabled/i.test(error.message))
          throw new Error("ورود با شماره همراه در تنظیمات Supabase غیرفعال است. فعلاً با ایمیل وارد شوید یا ورود با شماره همراه را در Auth فعال کنید.");
        throw error;
      }
      await profileFor(data.user);
      try { sessionStorage.setItem("show-login-greeting", "1"); } catch {}
      location.replace("index.html");
    } catch(err) {
      await supabase.auth.signOut();
      message(status,err.message || "ورود انجام نشد.",true);
      btn.disabled=false;
    }
  });
}
function showLoginGreeting() {
  let shouldShow=false;
  try {
    shouldShow=sessionStorage.getItem("show-login-greeting")==="1";
    if(shouldShow) sessionStorage.removeItem("show-login-greeting");
  } catch {}
  if(!shouldShow) return;
  const overlay=document.createElement("div");
  overlay.setAttribute("role","status");
  overlay.setAttribute("aria-live","polite");
  overlay.style.cssText="position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:24px;background:rgba(3,12,10,.88);backdrop-filter:blur(8px);opacity:0;transition:opacity .25s ease";
  const card=document.createElement("div");
  card.textContent="امین طاهونه‌چی، خیلی دیر کردی برای ورود!";
  card.style.cssText="width:min(680px,100%);padding:34px 26px;border:1px solid #34d399;border-radius:22px;background:linear-gradient(145deg,#15372d,#102820);box-shadow:0 24px 80px #0008;color:#ecfdf5;text-align:center;font:800 clamp(21px,4vw,32px)/2 Vazirmatn,Tahoma,sans-serif";
  overlay.append(card);
  document.body.append(overlay);
  requestAnimationFrame(()=>{overlay.style.opacity="1";});
  setTimeout(()=>{
    overlay.style.opacity="0";
    setTimeout(()=>overlay.remove(),300);
  },2600);
}

async function protectPage() {
  const {data:{session},error:sessionError}=await supabase.auth.getSession();
  if(sessionError || !session){location.replace("login.html");return false;}
  let profile;
  try {
    profile=await profileFor(session.user);
  } catch(e) {
    console.error("Access validation failed:",e);
    await supabase.auth.signOut();
    location.replace("login.html?reason=access");
    return false;
  }
  showLoginGreeting();
  try {
    await loadGlobalTheme();
    addUserBar(profile);
    if(path==="panel.html" && profile.is_admin){
      setupUserManagement();
      setupThemeSettings();
    }
  } catch(e) {
    console.error("Page interface initialization failed:",e);
    const notice=document.createElement("div");
    notice.setAttribute("role","alert");
    notice.textContent="بخشی از رابط سامانه بارگذاری نشد. صفحه را تازه‌سازی کنید.";
    notice.style.cssText="margin:12px;padding:12px;border:1px solid #b45309;border-radius:10px;background:#451a03;color:#ffedd5;font:13px/2 Tahoma,sans-serif";
    document.body.prepend(notice);
  }
  return true;
}
function setupUserManagement(){
  const main=$("main"); if(!main || $("#user-management")) return;
  const section=document.createElement("section");
  section.id="user-management";
  section.style.cssText="display:none;margin:0 0 30px;padding:24px;border:1px solid #b98535;border-radius:18px;background:linear-gradient(145deg,#142b48,#091a31);box-shadow:0 12px 30px #0005;color:#f7f8fb";
  section.innerHTML=`
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px">
      <span style="font-size:25px;color:#e8b957">♙</span>
      <h2 style="margin:0;color:#ffe2a0;font-size:21px">مدیریت کاربران</h2>
    </div>
    <p style="margin:0 0 18px;color:#aebdd0;font-size:13px;line-height:2">ایجاد حساب کاربری جدید و تعیین اطلاعات ورود</p>
    <form id="new-user-form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px">
      <label style="display:grid;gap:7px;font-size:13px;color:#dbe5f2">نام و نام خانوادگی<input id="new-user-name" required maxlength="100" placeholder="نام کاربر" style="width:100%;padding:12px;border:1px solid #52657e;border-radius:10px;background:#07172b;color:white"></label>
      <label style="display:grid;gap:7px;font-size:13px;color:#dbe5f2">شماره موبایل / نام کاربری<input id="new-user-phone" required inputmode="tel" placeholder="09123456789" style="width:100%;padding:12px;border:1px solid #52657e;border-radius:10px;background:#07172b;color:white"></label>
      <label style="display:grid;gap:7px;font-size:13px;color:#dbe5f2">عنوان شغلی<input id="new-user-job" maxlength="100" placeholder="مثلاً کارشناس فنی" style="width:100%;padding:12px;border:1px solid #52657e;border-radius:10px;background:#07172b;color:white"></label>
      <label style="display:grid;gap:7px;font-size:13px;color:#dbe5f2">رمز عبور<input id="new-user-password" type="text" required minlength="8" autocomplete="new-password" placeholder="حداقل ۸ نویسه" style="width:100%;padding:12px;border:1px solid #52657e;border-radius:10px;background:#07172b;color:white"></label>
      <div style="display:flex;align-items:end"><button id="new-user-submit" type="submit" style="width:100%;padding:13px 18px;border:0;border-radius:10px;background:linear-gradient(135deg,#ffe2a0,#c18d37);color:#142238;font-weight:800;cursor:pointer">+ ایجاد کاربر</button></div>
    </form>
    <p id="new-user-status" role="status" style="min-height:24px;margin:14px 0 0;font-size:13px"></p>
    <p style="margin:4px 0 0;color:#8fa4bf;font-size:11px;line-height:1.9">نام کاربری برای ورود همان شماره موبایل است. حساب‌های جدید با دسترسی کاربر عادی ساخته می‌شوند.</p>
  `;
  const heading=main.querySelector(".heading");
  if(heading?.nextSibling) main.insertBefore(section,heading.nextSibling); else main.prepend(section);
  const form=$("#new-user-form",section),status=$("#new-user-status",section),button=$("#new-user-submit",section);
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const full_name=$("#new-user-name",section).value.trim();
    const phone=$("#new-user-phone",section).value.trim();
    const job_title=$("#new-user-job",section).value.trim();
    const password=$("#new-user-password",section).value;
    if(password.length<8){status.textContent="رمز عبور باید حداقل ۸ نویسه باشد.";status.style.color="#fca5a5";return;}
    button.disabled=true;button.textContent="در حال ایجاد حساب...";
    status.textContent="در حال ثبت اطلاعات کاربر...";status.style.color="#ffe2a0";
    try{
      const {data,error}=await supabase.functions.invoke("admin-create-user",{body:{full_name,phone,password,job_title}});
      if(error){
        let detail=error.message||"ایجاد کاربر انجام نشد.";
        try{const payload=await error.context?.json();if(payload?.error)detail=payload.error;}catch{}
        throw new Error(detail);
      }
      if(!data?.success) throw new Error(data?.error||"پاسخ سرور معتبر نیست.");
      const normalized=data.user?.phone||phone;
      status.textContent="کاربر با موفقیت ساخته شد. نام کاربری ورود: "+normalized;
      status.style.color="#5eead4";
      form.reset();
    }catch(err){status.textContent=err.message||"ایجاد کاربر انجام نشد.";status.style.color="#fca5a5";}
    finally{button.disabled=false;button.textContent="+ ایجاد کاربر";}
  });
}
function addUserBar(profile) {
  if($("#app-sidebar")) return;
  const items=[
    ["panel.html","خانه","home"],
    ["projects.html","مدیریت پروژه‌ها","building"],
    ["documents.html","مدیریت اسناد","file"],
    ["technical.html","فنی و مهندسی","settings"],
    ["services.html","سایر خدمات","grid"]
  ];
  const icons={
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z"/>',
    briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>',
    building:'<path d="M3 21h18M5 21V5l7-3 7 3v16M9 21v-5h6v5M8 8h1m6 0h1M8 12h1m6 0h1"/>',
    wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h2"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8z"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
  };
  const current=path==="submodule.html"?(query.get("module")+".html"):(path==="technical-project.html"?"technical.html":path);
  const side=document.createElement("aside");side.id="app-sidebar";side.setAttribute("aria-label","منوی اصلی سامانه");
  side.innerHTML=`
   <div class="sidebar-brand">
    <div class="sidebar-logo"><svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z"/></svg></div>
    <div class="sidebar-brand-text"><strong>سامانه مدیریت</strong><span>پروژه و منابع شرکت</span></div>
   </div>
   <div class="sidebar-caption">منوی اصلی</div>
   <nav class="sidebar-nav">${items.map(([href,label,key])=>`<a class="sidebar-link ${current===href?"is-active":""}" href="${href}" ${current===href?'aria-current="page"':""}><svg viewBox="0 0 24 24">${icons[key]}</svg><span>${label}</span></a>`).join("")}</nav>
   <div class="sidebar-bottom">
    ${profile.is_admin&&path==="panel.html"?'<button type="button" class="sidebar-action" data-side-action="users"><svg viewBox="0 0 24 24">'+icons.users+'</svg><span>مدیریت کاربران</span></button><button type="button" class="sidebar-action" data-side-action="appearance"><svg viewBox="0 0 24 24">'+icons.settings+'</svg><span>تنظیمات ظاهر</span></button>':""}
    <div class="sidebar-user"><div class="sidebar-avatar">${(profile.full_name||"ک").trim().charAt(0)}</div><div class="sidebar-user-text"><strong>${profile.full_name||"کاربر سامانه"}</strong><span>${profile.is_admin?"مدیر سامانه":"کاربر"}</span></div></div>
    <button type="button" class="sidebar-logout"><svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5M15 12H3M21 3v18"/></svg><span>خروج از سامانه</span></button>
   </div>`;
  document.body.append(side);
  document.body.classList.add("has-app-sidebar");
  side.querySelectorAll("[data-side-action]").forEach(btn=>btn.addEventListener("click",()=>{
    const target=btn.dataset.sideAction==="users"?"#user-management":"#theme-settings";
    const section=$(target);
    if(!section)return;
    if(btn.dataset.sideAction==="users")section.style.display=section.style.display==="none"?"block":"none";
    section.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  side.querySelector(".sidebar-logout").addEventListener("click",async()=>{await supabase.auth.signOut();location.replace("login.html");});
}
function addSubmenuLinks(module){
 document.querySelectorAll(".card").forEach(card=>{const h=card.querySelector("h2");if(!h||card.querySelector(".submenu-link"))return;const link=document.createElement("a");link.className="submenu-link";link.href="submodule.html?module="+encodeURIComponent(module)+"&title="+encodeURIComponent(h.textContent.trim());link.textContent="ورود به زیرمجموعه ←";link.style.cssText="display:inline-block;margin-top:12px;color:#5eead4;text-decoration:none;font-size:12px";card.append(link);});
}
function decoratePanel(){
 const artwork=[
  '<circle cx="48" cy="48" r="34" fill="url(#a)"/><path d="M25 48h46M48 25v46M34 34l28 28m0-28L34 62" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M76 20l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#fef3c7"/>',
  '<path d="M18 68V35l30-17 30 17v33" fill="none" stroke="url(#a)" stroke-width="8" stroke-linejoin="round"/><path d="M28 68V43h40v25M42 68V52h12v16" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M12 75h72" stroke="#a7f3d0" stroke-width="5" stroke-linecap="round"/>',
  '<rect x="17" y="27" width="62" height="45" rx="10" fill="url(#a)"/><path d="M17 39h62M29 54h16m-16 9h29" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="66" cy="59" r="5" fill="#fef3c7"/>',
  '<circle cx="48" cy="31" r="15" fill="url(#a)"/><path d="M18 77c2-20 12-30 30-30s28 10 30 30" fill="url(#a)"/><circle cx="19" cy="43" r="9" fill="#a7f3d0"/><circle cx="77" cy="43" r="9" fill="#a7f3d0"/>',
  '<path d="M26 15h35l12 12v48H26z" fill="url(#a)"/><path d="M61 15v14h12M36 43h27M36 54h27M36 65h18" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  '<circle cx="48" cy="46" r="28" fill="none" stroke="url(#a)" stroke-width="10"/><circle cx="48" cy="46" r="10" fill="#fff"/><path d="M68 66l15 15" stroke="#a7f3d0" stroke-width="8" stroke-linecap="round"/>',
  '<path d="M48 13l8 20 21 1-16 13 6 21-19-12-19 12 6-21-16-13 21-1z" fill="url(#a)" stroke="#fff" stroke-width="3"/>'
 ];
 document.querySelectorAll(".tile").forEach((tile,i)=>{
  const art=tile.querySelector(".art");
  if(art)art.innerHTML='<svg viewBox="0 0 96 96" role="img" aria-hidden="true"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a7f3d0"/><stop offset="1" stop-color="#059669"/></linearGradient></defs><circle cx="48" cy="48" r="43" fill="#ffffff0b" stroke="#6ee7b7" stroke-opacity=".35" stroke-width="1.5"/>'+artwork[i]+'</svg>';
 });
 document.querySelectorAll(".tile h2").forEach(h=>{h.style.fontSize="20px";h.style.fontWeight="900";});
}
function applyTheme(theme){
 const green=theme==="green";
 const palette=green?{
  accent:"#34d399",accent2:"#a7f3d0",border:"#23765c",bg:"#071a16",panel:"#102820",panel2:"#15372d",muted:"#a7c7b9",glow:"#0c3d2d"
 }:{
  accent:"#5eead4",accent2:"#99f6e4",border:"#367f7c",bg:"#0b1220",panel:"#151f31",panel2:"#19283d",muted:"#a9b6c9",glow:"#203653"
 };
 document.documentElement.dataset.theme=green?"green":"blue";
 const old=document.getElementById("global-theme-style");if(old)old.remove();
 const style=document.createElement("style");style.id="global-theme-style";
 style.textContent=`
 :root{color-scheme:dark;--app-accent:${palette.accent};--app-accent-soft:${palette.accent2};--app-line:${palette.border};--app-bg:${palette.bg};--app-panel:${palette.panel};--app-panel-2:${palette.panel2};--app-muted:${palette.muted}}
 body{background:radial-gradient(ellipse at 50% -20%,${palette.glow} 0,transparent 55%),${palette.bg}!important;color:#f3f6fb!important;font-family:"Vazirmatn",sans-serif!important}
 body *{font-family:"Vazirmatn",sans-serif}
 .card,.panel,.workspace,.step-card,#module-catalog,#user-bar,#theme-settings,#user-management,
 .grid>.tile,.tile.active,.form-card,.data-card,.record-card,.catalog-card,.submenu,.content-box,.section-card{
  border-color:${palette.border}!important;
  background:linear-gradient(145deg,${palette.panel2},${palette.panel})!important;
  color:#f3f6fb!important
 }
 .tile,.tile.active{border-color:${palette.border}!important;background:linear-gradient(145deg,${palette.panel2},${palette.bg})!important;color:#f3f6fb!important}
 .tile:before{background:radial-gradient(ellipse at 50% 0,${green?"rgba(52,211,153,.18)":"rgba(94,234,212,.12)"},transparent 58%)!important}
 .tile:after{background:linear-gradient(90deg,transparent,${palette.accent2},transparent)!important;box-shadow:0 0 12px ${palette.accent}!important}
 .tile:hover{border-color:${palette.accent2}!important}
 .topbar{border-color:${palette.border}!important;background:linear-gradient(90deg,${palette.bg},${palette.panel2},${palette.bg})!important}
 .brand,.brand-mark,.profile-icon{color:${palette.accent2}!important;border-color:${palette.accent}!important}
 .brand-mark,.profile-icon{box-shadow:0 0 20px ${green?"#34d39935":"#5eead435"}!important}
 .heading-rule{background:linear-gradient(90deg,transparent,${palette.accent},transparent)!important}
 .bottom,.bottom span:first-child{color:${palette.accent2}!important}
 .art svg,.brand-mark svg,.profile-icon svg{filter:hue-rotate(${green?"48deg":"0deg"}) saturate(${green?"1.2":"1"}) drop-shadow(0 7px 7px #0007)!important}
 .tile h2,h1,h2,h3,.top-title{color:#f3f6fb!important}
 .tile p,.subtitle,.muted{color:${palette.muted}!important}
 a.back,.back,.submenu-link{color:${palette.accent}!important;border-color:${palette.border}!important}
 button,.primary,.btn-primary{border-radius:10px}
 input,select,textarea{border-color:${palette.border}!important;background-color:${palette.bg}!important;color:#f3f6fb!important}
 #theme-settings p{color:${palette.muted}!important}
 #theme-settings button[data-theme-choice]{border-color:${palette.border}!important;background:${palette.panel2}!important;color:#f3f6fb!important}
 #user-management{background:linear-gradient(145deg,${palette.panel2},${palette.panel})!important;border-color:${palette.border}!important}
 
 #app-sidebar{position:fixed;z-index:1000;right:0;left:auto;top:0;bottom:0;width:258px;direction:rtl;display:flex;flex-direction:column;padding:24px 16px 18px;background:linear-gradient(180deg,${palette.panel2} 0%,${palette.bg} 100%);border-left:1px solid ${palette.border};box-shadow:-12px 0 35px #0005;color:#f3f6fb}
 #app-sidebar *{box-sizing:border-box}
 .sidebar-brand{display:flex;align-items:center;gap:12px;padding:4px 7px 24px;border-bottom:1px solid ${palette.border}}
 .sidebar-logo{width:44px;height:44px;flex:0 0 44px;display:grid;place-items:center;border:1px solid ${palette.accent};border-radius:14px;color:${palette.accent2};background:${palette.glow};box-shadow:0 0 22px ${palette.accent}22}
 .sidebar-logo svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
 .sidebar-brand-text{display:flex;flex-direction:column;gap:5px}.sidebar-brand-text strong{font-size:16px;font-weight:900}.sidebar-brand-text span{font-size:12px;font-weight:600;color:${palette.muted}}
 .sidebar-caption{font-size:12px;font-weight:800;color:${palette.muted};padding:23px 10px 10px}
 .sidebar-nav{display:flex;flex-direction:column;gap:6px;overflow-y:auto}
 .sidebar-link,.sidebar-action,.sidebar-logout{display:flex;align-items:center;gap:12px;min-height:45px;padding:10px 12px;border:1px solid transparent;border-radius:11px;background:transparent;color:${palette.muted};text-decoration:none;font-size:14px;font-weight:800;text-align:right;cursor:pointer;transition:.18s}
 .sidebar-link svg,.sidebar-action svg,.sidebar-logout svg{width:19px;height:19px;flex:0 0 19px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
 .sidebar-link:hover,.sidebar-action:hover,.sidebar-logout:hover{background:${palette.panel2};color:#fff;border-color:${palette.border}}
 .sidebar-link.is-active{background:linear-gradient(90deg,${palette.glow},${palette.panel2});border-color:${palette.border};color:${palette.accent2};box-shadow:inset 3px 0 0 ${palette.accent},0 5px 18px #0002}
 .sidebar-bottom{margin-top:auto;padding-top:15px;border-top:1px solid ${palette.border};display:flex;flex-direction:column;gap:7px}
 .sidebar-action{width:100%;font-family:inherit}
 .sidebar-user{display:flex;align-items:center;gap:10px;padding:12px 7px 7px}
 .sidebar-avatar{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border-radius:50%;background:${palette.glow};border:1px solid ${palette.border};color:${palette.accent2};font-weight:800}
 .sidebar-user-text{display:flex;flex-direction:column;gap:4px;min-width:0}.sidebar-user-text strong{font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sidebar-user-text span{font-size:12px;font-weight:700;color:${palette.muted}}
 .sidebar-logout{width:100%;color:#fca5a5;font-family:inherit}
 body.has-app-sidebar main{width:calc(100% - 258px)!important;max-width:none!important;margin:0 258px 0 0!important}
 body.has-app-sidebar .topbar{margin-right:258px;margin-left:0}
 body.has-app-sidebar footer{margin-right:258px;margin-left:0}
 @media(max-width:760px){
  #app-sidebar{width:76px;padding:18px 9px 12px;align-items:center}
  .sidebar-brand{padding:0 0 18px;justify-content:center;width:100%}
  .sidebar-logo{width:42px;height:42px;flex-basis:42px}
  .sidebar-brand-text,.sidebar-caption,.sidebar-link span,.sidebar-action span,.sidebar-logout span,.sidebar-user-text{display:none}
  .sidebar-nav{width:100%;align-items:center;gap:8px}
  .sidebar-link,.sidebar-action,.sidebar-logout{width:54px;height:48px;min-height:48px;justify-content:center;padding:0}
  .sidebar-link svg,.sidebar-action svg,.sidebar-logout svg{width:21px;height:21px}
  .sidebar-bottom{width:100%;align-items:center}
  .sidebar-user{justify-content:center;padding:10px 0}
  .sidebar-avatar{width:34px;height:34px}
  body.has-app-sidebar main{width:calc(100% - 76px)!important;margin-right:76px!important;margin-left:0!important}
  body.has-app-sidebar .topbar{margin-right:76px;margin-left:0}
  body.has-app-sidebar footer{margin-right:76px;margin-left:0}
 }
`;
 document.head.append(style);
 document.documentElement.removeAttribute("data-theme-pending");
}
async function loadGlobalTheme(){
 try{
  const {data,error}=await supabase.from("app_settings").select("setting_value").eq("setting_key","appearance").maybeSingle();
  if(error)throw error;
  applyTheme(data?.setting_value?.theme==="green"?"green":"blue");
 }catch(e){console.warn("Global appearance setting unavailable; using blue theme.",e);applyTheme("blue");}
}
function setupThemeSettings(){
 const main=$("main");if(!main||$("#theme-settings"))return;
 const section=document.createElement("section");section.id="theme-settings";
 section.style.cssText="display:block;margin:0 0 22px;padding:20px;border:1px solid var(--app-line);border-radius:16px;background:linear-gradient(145deg,#19283d,#101a2a);color:#f3f6fb";
 section.innerHTML=`
 <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="font-size:23px">🎨</span><h2 style="margin:0;font-size:19px">تنظیمات ظاهر سامانه</h2></div>
 <p style="margin:0 0 14px;color:#a9b6c9;font-size:13px;line-height:2">انتخاب مدیر برای تمام کاربران و تمام دستگاه‌ها اعمال می‌شود.</p>
 <div style="display:flex;gap:10px;flex-wrap:wrap">
 <button type="button" data-theme-choice="blue" style="padding:11px 18px;border:1px solid #367f7c;border-radius:10px;background:#173653;color:white;cursor:pointer">🔵 تم آبی</button>
 <button type="button" data-theme-choice="green" style="padding:11px 18px;border:1px solid #23765c;border-radius:10px;background:#123d2e;color:white;cursor:pointer">🟢 تم سبز</button>
 </div><p id="theme-setting-status" role="status" style="min-height:20px;margin:12px 0 0;font-size:12px"></p>`;
 const heading=main.querySelector(".heading");
 if(heading?.nextSibling)main.insertBefore(section,heading.nextSibling);else main.prepend(section);
 section.querySelectorAll("[data-theme-choice]").forEach(btn=>btn.addEventListener("click",async()=>{
  const theme=btn.dataset.themeChoice,status=$("#theme-setting-status",section);
  section.querySelectorAll("button").forEach(b=>b.disabled=true);
  status.textContent="در حال ذخیره و تعمیم به همه کاربران...";
  try{
   const {data:{user}}=await supabase.auth.getUser();
   const {error}=await supabase.from("app_settings").upsert({setting_key:"appearance",setting_value:{theme},updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:"setting_key"});
   if(error)throw error;
   applyTheme(theme);status.textContent=theme==="green"?"تم سبز برای همه کاربران فعال شد.":"تم آبی برای همه کاربران فعال شد.";
  }catch(e){status.textContent="ذخیره انجام نشد: "+(e.message||"خطای نامشخص");}
  finally{section.querySelectorAll("button").forEach(b=>b.disabled=false);}
 }));
}

async function setupSubmodule(){
 const module=query.get("module"), title=query.get("title")||"زیرمجموعه";
 if(!moduleMap[module+".html"] && !["transactions","projects","finance","payroll","documents","technical","services"].includes(module)){message($("#record-message"),"نشانی زیرمجموعه معتبر نیست.",true);return;}
 const moduleName=module==="transactions"?"transactions":module;
 const projectName=query.get("project")||"", scope=query.get("scope")||"";
 $("#sub-title").textContent=title;document.title=title+" | سامانه امین عبدی";$("#sub-desc").textContent="ثبت و پیگیری "+title+" برای "+projectName+(scope?" · "+scope:"");
 if(projectName) $("#record-project").value=projectName;
 const status=$("#record-message"), list=$("#record-list");
 async function load(){list.replaceChildren();const {data,error}=await supabase.from("module_records").select("*").eq("module",moduleName).order("created_at",{ascending:false}).limit(100);if(error){message(status,error.message,true);return;}data.filter(x=>x.details?.submodule===title&&(!projectName||(x.project_name||"")===projectName)&&(!scope||(x.details?.scope||"")===scope)).forEach(x=>{const a=document.createElement("article");a.textContent=[x.title,x.project_name,x.details?.scope,x.reference_no,x.status,x.responsible,JSON.stringify(x.details)].filter(Boolean).join(" | ");list.append(a);});if(!list.children.length)list.textContent="هنوز سابقه‌ای برای این بخش از پروژه ثبت نشده است.";}
 $("#record-save").onclick=async()=>{const titleValue=$("#record-title").value.trim();if(!titleValue){message(status,"عنوان را وارد کنید.",true);return;}const raw=$("#record-amount").value.trim();const amount=Number(raw.replace(/[٬,\\s]/g,""))||0;const {error}=await supabase.from("module_records").insert({module:moduleName,title:titleValue,project_name:$("#record-project").value.trim()||projectName||null,reference_no:$("#record-ref").value.trim()||null,amount,status:$("#record-status").value,responsible:$("#record-owner").value.trim()||null,details:{submodule:title,scope,description:$("#record-details").value}});if(error){message(status,error.message,true);return;}message(status,"اطلاعات ذخیره شد.");["record-title","record-ref","record-amount","record-owner","record-details"].forEach(id=>$("#"+id).value="");$("#record-project").value=projectName;await load();};await load();
}

async function setupGlobalProjectPicker(module) {
  const main=$("main"); if(!main || $("#global-project-picker")) return;
  const section=document.createElement("section");section.id="global-project-picker";
  section.style.cssText="margin:22px 0;padding:20px;border:1px solid var(--app-line,#23765c);border-radius:16px;background:var(--app-panel,#102820)";
  const heading=document.createElement("h2");heading.textContent="پروژه‌های تعریف‌شده";heading.style.cssText="margin:0 0 8px;font-size:18px;color:var(--app-text,#f3f6fb)";
  const hint=document.createElement("p");hint.textContent="فهرست زیر از مدیریت پروژه‌ها خوانده می‌شود؛ هر پروژه‌ای که آنجا تعریف شود، در این بخش و سایر واحدها نیز نمایش داده خواهد شد.";hint.style.cssText="margin:0 0 14px;color:var(--app-muted,#a7c7b9);font-size:12px;line-height:2";
  const list=document.createElement("div");list.style.cssText="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px";
  const status=document.createElement("p");status.style.cssText="font-size:12px;color:var(--app-muted,#a7c7b9)";
  section.append(heading,hint,list,status);
  const target=module==="technical"?$(".projects",main):($(".grid",main)||$(".panel",main));
  if(module==="technical" && target){target.replaceWith(section);}
  else if(target){main.insertBefore(section,target);}
  else main.append(section);
  const {data,error}=await supabase.from("module_catalog").select("id,name").eq("module","projects").eq("node_type","project").is("parent_id",null).order("sort_order").order("created_at");
  if(error){status.textContent="دریافت فهرست پروژه‌ها ناموفق بود: "+error.message;return;}
  if(!data?.length){status.textContent="هنوز پروژه‌ای تعریف نشده است. ابتدا از بخش مدیریت پروژه‌ها پروژه جدید بسازید.";return;}
  data.forEach((project,index)=>{
    const link=document.createElement("a");
    const params=new URLSearchParams({project:project.name});
    link.href=module==="technical"?"technical-project.html?"+params.toString():"submodule.html?"+new URLSearchParams({module,title:"پرونده پروژه",project}).toString();
    link.style.cssText="display:block;padding:16px;border:1px solid var(--app-line,#23765c);border-radius:12px;background:linear-gradient(145deg,var(--app-panel-2,#15372d),#0b211a);color:var(--app-text,#f3f6fb);text-decoration:none";
    const number=document.createElement("small");number.textContent="پروژه "+String(index+1).padStart(2,"0");number.style.cssText="display:block;color:var(--app-accent,#34d399);margin-bottom:7px";
    const name=document.createElement("strong");name.textContent=project.name;name.style.cssText="font-size:14px";
    const action=document.createElement("div");action.textContent="ورود به پرونده ←";action.style.cssText="font-size:11px;color:var(--app-muted,#a7c7b9);margin-top:10px";
    link.append(number,name,action);list.append(link);
  });
  status.textContent=data.length+" پروژه از فهرست مرکزی نمایش داده شد.";
}
async function populateProjectSelect(select) {
  if(!select || select.dataset.projectsLoaded==="1") return;
  const {data,error}=await supabase.from("module_catalog").select("name").eq("module","projects").eq("node_type","project").is("parent_id",null).order("sort_order").order("created_at");
  if(error)return;
  const current=select.value;
  const blank=document.createElement("option");blank.value="";blank.textContent="انتخاب پروژه";select.replaceChildren(blank);
  (data||[]).forEach(p=>{const option=document.createElement("option");option.value=p.name;option.textContent=p.name;select.append(option);});
  if(current && [...select.options].some(o=>o.value===current))select.value=current;
  select.dataset.projectsLoaded="1";
}
function setupModuleCatalog(module) {
  const main=$("main"); if(!main || $("#module-catalog")) return;
  const section=document.createElement("section");section.id="module-catalog";
  section.style.cssText="margin:24px 0;padding:22px;border:1px solid var(--app-line,#806c48);border-radius:18px;background:linear-gradient(145deg,var(--app-panel,#19283d),#101a2a);color:var(--app-text,#f3f6fb)";
  const head=document.createElement("div");head.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap";
  const title=document.createElement("h2");title.textContent="ساختار دلخواه این بخش";title.style.cssText="font-size:19px;margin:0;color:var(--app-text,#f3f6fb)";
  const addProject=document.createElement("button");addProject.type="button";addProject.textContent="+ تعریف پروژه جدید";addProject.style.cssText="background:linear-gradient(135deg,#d6b879,#a88443);color:#101827;border:0;border-radius:10px;padding:11px 16px;font:600 13px Vazirmatn,sans-serif;cursor:pointer";
  head.append(title,addProject);
  const hint=document.createElement("p");hint.textContent="پروژه‌ها و زیرمجموعه‌های دلخواهت را بدون محدودیت تعریف و مدیریت کن.";hint.style.cssText="font:13px/2 Vazirmatn,sans-serif;color:var(--app-muted,#a9b6c9);margin:10px 0 16px";
  const status=document.createElement("p");status.style.cssText="font:12px Vazirmatn,sans-serif;min-height:20px";
  const tree=module==="projects"?$("#project-list"):document.createElement("div");
  if(!tree){say("محل نمایش پروژه‌ها پیدا نشد.",true);return;}
  if(module!=="projects")tree.style.cssText="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px";
  section.append(head,hint,status,tree);
  main.insertBefore(section,main.children[1]||null);
  const say=(t,bad=false)=>{status.textContent=t;status.style.color=bad?"#fca5a5":"#5eead4";};
  const btnStyle="background:#26364b;color:#e8d7b5;border:1px solid #806c48;border-radius:9px;padding:8px 12px;font:12px Vazirmatn,sans-serif;cursor:pointer";
  let modal=null, currentNodes=[];
  function closeModal(){modal?.remove();modal=null;}
  function openNameDialog(parent=null){
    closeModal();
    modal=document.createElement("div");modal.style.cssText="position:fixed;inset:0;z-index:9999;background:#020817c9;display:grid;place-items:center;padding:18px";
    const card=document.createElement("form");card.style.cssText="width:min(440px,100%);padding:24px;border:1px solid #806c48;border-radius:18px;background:linear-gradient(145deg,#19283d,#101a2a);box-shadow:0 25px 80px #0009;color:#f3f6fb";
    const heading=document.createElement("h3");heading.textContent=parent?"افزودن زیرمجموعه":"تعریف پروژه جدید";heading.style.cssText="margin:0 0 16px;font:600 18px Vazirmatn,sans-serif";
    const label=document.createElement("label");label.textContent=parent?"عنوان زیرمجموعه":"نام پروژه";label.style.cssText="display:block;margin-bottom:8px;font:13px Vazirmatn,sans-serif;color:#cbd5e1";
    const input=document.createElement("input");input.type="text";input.placeholder=parent?"مثلاً قراردادهای اصلی":"نام پروژه را وارد کنید";input.required=true;input.maxLength=120;input.style.cssText="width:100%;box-sizing:border-box;padding:12px;border:1px solid #40536d;border-radius:10px;background:#0b1422;color:#fff;font:14px Vazirmatn,sans-serif;outline:none";
    const actions=document.createElement("div");actions.style.cssText="display:flex;justify-content:flex-start;gap:9px;margin-top:18px";
    const submit=document.createElement("button");submit.type="submit";submit.textContent="ثبت";submit.style.cssText=btnStyle+";background:#b99b62;color:#101827;padding:10px 22px;font-weight:600";
    const cancel=document.createElement("button");cancel.type="button";cancel.textContent="انصراف";cancel.style.cssText=btnStyle;cancel.onclick=closeModal;
    actions.append(submit,cancel);label.append(input);card.append(heading,label,actions);modal.append(card);document.body.append(modal);
    modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});
    card.addEventListener("submit",async e=>{
      e.preventDefault();const name=input.value.trim();if(!name){input.focus();return;}
      submit.disabled=true;submit.textContent="در حال ثبت...";
      const {data:{user}}=await supabase.auth.getUser();
      const {error}=await supabase.from("module_catalog").insert({module,parent_id:parent?.id||null,node_type:parent?"category":"project",name,created_by:user?.id||null});
      if(error){say("ذخیره انجام نشد: "+error.message,true);submit.disabled=false;submit.textContent="ثبت";return;}
      closeModal();say("مورد جدید با موفقیت ثبت شد.");await load();
    });
    input.focus();
  }
  function descendants(node){
    const ids=[node.id];
    (node.children||[]).forEach(child=>ids.push(...descendants(child)));
    return ids;
  }
  async function removeNode(node){
    const count=descendants(node).length;
    const label=node.node_type==="project"?"پروژه":"زیرمجموعه";
    if(!confirm("«"+node.name+"» و "+(count-1)+" زیرمجموعه وابسته حذف شود؟ این کار قابل بازگشت نیست."))return;
    const ids=descendants(node);
    const {error}=await supabase.from("module_catalog").delete().in("id",ids);
    if(error){say("حذف انجام نشد: "+error.message,true);return;}
    say(label+" و موارد وابسته با موفقیت حذف شدند.");await load();
  }
  function renderNode(node,depth=0){
    const isRoot=depth===0;
    const wrap=document.createElement("article");
    wrap.style.cssText=isRoot
      ?"display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:12px;min-height:178px;padding:18px 13px;border:1px solid var(--app-line,#35445a);border-radius:16px;background:linear-gradient(145deg,var(--app-panel,#19283d),#0b1422);text-align:center;box-shadow:0 8px 22px #0002"
      :"display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px;border:1px solid #35445a;border-radius:12px;background:#0b1422";
    const icon=document.createElement("div");icon.textContent=isRoot?"▣":"▤";icon.style.cssText=isRoot?"display:grid;place-items:center;width:58px;height:58px;border-radius:16px;background:#1b6650;color:#d1fae5;border:1px solid #3b9b78;font-size:29px":"display:none";
    const name=document.createElement("strong");name.textContent=node.name;name.style.cssText="font:700 "+(isRoot?"15px":"13px")+" Vazirmatn,sans-serif;color:var(--app-text,#f3f6fb);overflow-wrap:anywhere";
    const controls=document.createElement("div");controls.style.cssText="display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;width:100%";
    const add=document.createElement("button");add.type="button";add.textContent="+ زیرمجموعه";add.style.cssText=btnStyle;add.onclick=()=>openNameDialog(node);
    const del=document.createElement("button");del.type="button";del.textContent="حذف";del.style.cssText=btnStyle+";background:#4a2028;color:#fecaca;border-color:#8b3b46";del.onclick=()=>removeNode(node);
    controls.append(add,del);wrap.append(icon,name,controls);
    if(node.children?.length){
      const children=document.createElement("div");children.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px;width:100%;margin-top:4px";
      node.children.forEach(child=>children.append(renderNode(child,depth+1)));wrap.append(children);
    }
    return wrap;
  }
  async function load(){
    tree.replaceChildren();say("در حال دریافت ساختار...");
    const {data,error}=await supabase.from("module_catalog").select("id,module,parent_id,node_type,name,sort_order,created_at").eq("module",module).order("sort_order").order("created_at");
    if(error){say("دریافت اطلاعات انجام نشد: "+error.message,true);return;}
    const nodes=new Map(data.map(x=>[x.id,{...x,children:[]} ]));const roots=[];
    nodes.forEach(n=>{if(n.parent_id&&nodes.has(n.parent_id))nodes.get(n.parent_id).children.push(n);else roots.push(n);});
    currentNodes=roots;
    roots.forEach(n=>tree.append(renderNode(n)));
    if(!roots.length){tree.style.gridTemplateColumns="1fr";const empty=document.createElement("p");empty.textContent="هنوز پروژه‌ای در این بخش تعریف نشده است. از دکمه بالا شروع کن.";empty.style.cssText="color:#9aabc1;font:13px Vazirmatn,sans-serif";tree.append(empty);}
    else tree.style.gridTemplateColumns="repeat(auto-fill,minmax(190px,1fr))";
    say(roots.length+" پروژه در این بخش تعریف شده است.");
  }
  addProject.onclick=()=>openNameDialog();load();
}

function setupDataForm(module) {
  const panel=$(".panel"); if(!panel) return;
  const labels=[...panel.querySelectorAll("label")].filter(l=>l.querySelector("input,select,textarea"));
  if(!labels.length) return;
  const action=document.createElement("div");action.style.cssText="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:16px";
  const save=document.createElement("button");save.type="button";save.textContent="ثبت اطلاعات در پایگاه داده";
  save.style.cssText="background:#0f766e;color:white;border:0;border-radius:10px;padding:12px 18px;font:13px Tahoma;cursor:pointer";
  const status=document.createElement("span");status.style.cssText="font:12px Tahoma";
  action.append(save,status);panel.append(action);
  const list=document.createElement("section");list.style.cssText="margin-top:22px;border-top:1px solid #293a52;padding-top:16px";
  const heading=document.createElement("h2");heading.textContent="آخرین اطلاعات ثبت‌شده";heading.style.fontSize="16px";
  const rows=document.createElement("div");rows.style.cssText="display:grid;gap:8px";
  list.append(heading,rows);panel.append(list);
  const fields=labels.flatMap(l=>{const el=l.querySelector("input,select,textarea");return el?[{label:l.childNodes[0]?.textContent?.trim()||el.placeholder||"فیلد",el}]:[]});
  const readValues=()=>fields.map(({label,el})=>({label,value:el.value.trim()})).filter(x=>x.value);
  const load=async()=>{
    rows.replaceChildren();
    const {data,error}=await supabase.from("module_records").select("id,title,project_name,reference_no,amount,status,responsible,details,created_at").eq("module",module).order("created_at",{ascending:false}).limit(30);
    if(error){message(status,"خطا در دریافت اطلاعات: "+error.message,true);return;}
    if(!data.length){const empty=document.createElement("p");empty.textContent="هنوز اطلاعاتی ثبت نشده است.";empty.style.color="#9aabc1";rows.append(empty);return;}
    data.forEach(r=>{const item=document.createElement("article");item.style.cssText="padding:12px;border:1px solid #293a52;border-radius:10px;background:#0b1422";
      const title=document.createElement("b");title.textContent=r.title;
      const detail=document.createElement("div");detail.style.cssText="font:12px/2 Tahoma;color:#a9b6c9;white-space:pre-wrap";
      detail.textContent=[r.project_name,r.reference_no,r.amount?Number(r.amount).toLocaleString("fa-IR")+" ریال":"",r.status,r.responsible,...Object.entries(r.details||{}).map(([k,v])=>k+": "+v)].filter(Boolean).join(" | ");
      const date=document.createElement("small");date.textContent=new Date(r.created_at).toLocaleString("fa-IR");date.style.color="#718198";
      item.append(title,detail,date);rows.append(item);
    });
  };
  save.addEventListener("click",async()=>{
    const values=readValues(); if(!values.length){message(status,"حداقل یک فیلد را تکمیل کنید.",true);return;}
    const find=(terms)=>values.find(x=>terms.some(t=>x.label.includes(t)));
    const title=find(["عنوان","موضوع","نوع درخواست","پروژه","نام پروژه"])?.value || document.title;
    const project=find(["پروژه"])?.value || null;
    const reference=find(["شماره","دوره","کد"])?.value || null;
    const amountValue=find(["مبلغ"])?.value || "0";
    const amount=Number(String(amountValue).replace(/[٬,s]/g,""))||0;
    const statusValue=find(["وضعیت"])?.value || null;
    const responsible=find(["مسئول"])?.value || null;
    const details=Object.fromEntries(values.map(x=>[x.label,x.value]));
    save.disabled=true;message(status,"در حال ذخیره...");
    const {error}=await supabase.from("module_records").insert({module,title,project_name:project,reference_no:reference,amount,status:statusValue,responsible,details});
    save.disabled=false;
    if(error){message(status,"ذخیره انجام نشد: "+error.message,true);return;}
    message(status,"اطلاعات با موفقیت ذخیره شد.");
    fields.forEach(({el})=>{if(el.tagName==="SELECT")el.selectedIndex=0;else el.value="";});
    await load();
  });
  load();
}
(async()=>{
  if(path==="login.html"){await loginPage();return;} 
  if(path==="recovery.html"){await recoveryPage();return;} 
  if(path==="reset-password.html"){await resetPasswordPage();return;}
  // تمام صفحات داخلی فقط پس از ورود معتبر در دسترس هستند.
  if(!(await protectPage())) return;
  if(path==="submodule.html"){await setupSubmodule();return;}

  if(path==="panel.html") decoratePanel();
  if(moduleMap[path]){if(moduleMap[path]==="projects")setupModuleCatalog("projects");else setupGlobalProjectPicker(moduleMap[path]);addSubmenuLinks(moduleMap[path]);setupDataForm(moduleMap[path]);}
  if(path==="transactions.html"){setupGlobalProjectPicker("transactions");addSubmenuLinks("transactions");}
})();