import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const SUPABASE_URL = "https://oqolkqwnsivoqnegagdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_-F4sy_LmvOXS8LFywNnNMQ_akJ91gic";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const path = location.pathname.split("/").pop() || "index.html";
const query = new URLSearchParams(location.search);
const moduleMap = {"projects.html":"projects","finance.html":"finance","payroll.html":"payroll","technical.html":"technical","documents.html":"documents","services.html":"services"};
const $ = (s, root=document) => root.querySelector(s);

function message(el, text, bad=false) {
  if (!el) return;
  el.textContent = text;
  el.style.color = bad ? "#fca5a5" : "#5eead4";
}
async function profileFor(user) {
  const {data,error}=await supabase.from("app_profiles").select("full_name,is_admin,is_active").eq("id",user.id).single();
  if(error) throw error;
  if(!data.is_active || !data.is_admin) throw new Error("حساب شما فعال یا دارای دسترسی مدیریتی نیست.");
  return data;
}

async function recoveryPage(){
 const form=$("#recovery-form"), status=$("#recovery-status");
 form.addEventListener("submit",async e=>{
  e.preventDefault();const email=$("#recovery-email").value.trim();
  const btn=form.querySelector("button");btn.disabled=true;message(status,"در حال ارسال لینک بازیابی...");
  try{
   const redirectTo=new URL("reset-password.html",location.href).href;
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
    const phone=$("#phone").value.trim(), password=$("#password").value;
    const btn=form.querySelector("button"); btn.disabled=true; message(status,"در حال بررسی اطلاعات ورود...");
    try {
      const {data,error}=await supabase.auth.signInWithPassword({phone,password});
      if(error) throw error;
      await profileFor(data.user);
      location.replace("index.html");
    } catch(err) {
      await supabase.auth.signOut();
      message(status,err.message || "ورود انجام نشد.",true);
      btn.disabled=false;
    }
  });
}
async function protectPage() {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){location.replace("login.html");return false;}
  try { const profile=await profileFor(session.user); addUserBar(profile); return true; }
  catch(e){await supabase.auth.signOut();location.replace("login.html?reason=access");return false;}
}
function addUserBar(profile) {
  const main=$("main"); if(!main || $("#user-bar")) return;
  const bar=document.createElement("div");bar.id="user-bar";
  bar.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 0 18px;padding:10px 14px;border:1px solid #293a52;border-radius:12px;background:#111c2c;color:#a9b6c9;font:12px Tahoma,sans-serif";
  const who=document.createElement("span");who.textContent="کاربر: "+(profile.full_name||"مدیر سامانه");
  const out=document.createElement("button");out.textContent="خروج";out.style.cssText="background:#26364b;color:#fff;border:1px solid #40536d;border-radius:8px;padding:8px 14px;cursor:pointer";
  out.onclick=async()=>{await supabase.auth.signOut();location.replace("login.html");};
  bar.append(who,out);main.prepend(bar);
}
function addSubmenuLinks(module){
 document.querySelectorAll(".card").forEach(card=>{const h=card.querySelector("h2");if(!h||card.querySelector(".submenu-link"))return;const link=document.createElement("a");link.className="submenu-link";link.href="submodule.html?module="+encodeURIComponent(module)+"&title="+encodeURIComponent(h.textContent.trim());link.textContent="ورود به زیرمجموعه ←";link.style.cssText="display:inline-block;margin-top:12px;color:#5eead4;text-decoration:none;font-size:12px";card.append(link);});
}
function decoratePanel(){
 document.querySelectorAll(".tile").forEach((tile,i)=>{const symbols=["▤","▦","◈","♙","▧","⌘","✦"];const s=tile.querySelector(".symbol");if(s)s.textContent=symbols[i]||"✧";});
 const modules=["transactions","projects","finance","payroll","documents","technical","services"];
 document.querySelectorAll(".tile").forEach((tile,i)=>{tile.href=modules[i]+".html";});
 document.querySelectorAll(".card").forEach(card=>{const h=card.querySelector("h2");if(!h)return;const tile=card.closest("section.grid");if(!tile)return;const module=modules[modules.indexOf(path.replace(".html",""))]||path.replace(".html","");const link=document.createElement("a");link.href="submodule.html?module="+encodeURIComponent(module)+"&title="+encodeURIComponent(h.textContent.trim());link.textContent="ورود به زیرمجموعه ←";link.style.cssText="display:inline-block;margin-top:12px;color:#5eead4;text-decoration:none;font-size:12px";card.append(link);card.style.cursor="pointer";});
}
function unifyTheme(){
 const style=document.createElement("style");style.textContent=`
 :root{color-scheme:dark;--bg:#0b1220;--panel:#151f31;--line:#293a52;--text:#f3f6fb;--muted:#a9b6c9;--accent:#5eead4}
 body{background:radial-gradient(ellipse at 50% -20%,#203653 0,transparent 55%),#0b1220!important;color:#f3f6fb!important;font-family:Tahoma,"Segoe UI",sans-serif!important}
 main{max-width:1120px}
 .card,.panel,.tile,.note,.workspace,.step-card{border-color:#293a52!important;border-radius:16px!important}
 .card,.panel,.workspace,.step-card{background:linear-gradient(145deg,#19283d,#121d2e)!important;color:#f3f6fb!important}
 h1,h2,h3{color:#f3f6fb}
 input,select,textarea,button{font-family:Tahoma,"Segoe UI",sans-serif}
 a.back,.back{border-radius:11px!important;color:#5eead4!important;border-color:#367f7c!important}
 button,.primary,.btn-primary{border-radius:10px!important}
 `;document.head.append(style);
}

async function setupSubmodule(){
 const module=query.get("module"), title=query.get("title")||"زیرمجموعه";
 if(!moduleMap[module+".html"] && !["transactions","projects","finance","payroll","documents","technical","services"].includes(module)){message($("#record-message"),"نشانی زیرمجموعه معتبر نیست.",true);return;}
 const moduleName=module==="transactions"?"transactions":module;
 $("#sub-title").textContent=title;document.title=title+" | سامانه امین عبدی";$("#sub-desc").textContent="ثبت، نگهداری و پیگیری اطلاعات مربوط به "+title;
 const status=$("#record-message"), list=$("#record-list");
 async function load(){list.replaceChildren();const {data,error}=await supabase.from("module_records").select("*").eq("module",moduleName).order("created_at",{ascending:false}).limit(50);if(error){message(status,error.message,true);return;}data.filter(x=>x.details?.submodule===title).forEach(x=>{const a=document.createElement("article");a.textContent=[x.title,x.project_name,x.reference_no,x.status,x.responsible,JSON.stringify(x.details)].filter(Boolean).join(" | ");list.append(a);});if(!list.children.length)list.textContent="هنوز سابقه‌ای برای این زیرمجموعه ثبت نشده است.";}
 $("#record-save").onclick=async()=>{const titleValue=$("#record-title").value.trim();if(!titleValue){message(status,"عنوان را وارد کنید.",true);return;}const raw=$("#record-amount").value.trim();const amount=Number(raw.replace(/[٬,\\s]/g,""))||0;const {error}=await supabase.from("module_records").insert({module:moduleName,title:titleValue,project_name:$("#record-project").value.trim()||null,reference_no:$("#record-ref").value.trim()||null,amount,status:$("#record-status").value,responsible:$("#record-owner").value.trim()||null,details:{submodule:title,description:$("#record-details").value}});if(error){message(status,error.message,true);return;}message(status,"اطلاعات ذخیره شد.");["record-title","record-project","record-ref","record-amount","record-owner","record-details"].forEach(id=>$("#"+id).value="");await load();};await load();
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
  if(path==="login.html"){await loginPage();return;}\n  if(path==="recovery.html"){await recoveryPage();return;}\n  if(path==="reset-password.html"){await resetPasswordPage();return;}
  if(!(await protectPage()))return;
  if(path==="submodule.html"){await setupSubmodule();return;}
  unifyTheme();
  if(path==="panel.html") decoratePanel();
  if(moduleMap[path]){addSubmenuLinks(moduleMap[path]);setupDataForm(moduleMap[path]);}
  if(path==="transactions.html") addSubmenuLinks("transactions");
})();