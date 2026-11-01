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
 const style=document.createElement("style");
 style.textContent=`
 :root{color-scheme:dark;--bg:#0b1220;--panel:#151f31;--line:#293a52;--text:#f3f6fb;--muted:#a9b6c9;--accent:#5eead4}
 body{background:radial-gradient(ellipse at 50% -20%,#203653 0,transparent 55%),#0b1220!important;color:#f3f6fb!important;font-family:"Vazirmatn",sans-serif!important}
 body *{font-family:"Vazirmatn",sans-serif!important}
 main{max-width:1120px}
 .card,.panel,.tile,.note,.workspace,.step-card{border-color:#293a52!important;border-radius:16px!important}
 .card,.panel,.workspace,.step-card{background:linear-gradient(145deg,#19283d,#121d2e)!important;color:#f3f6fb!important}
 h1,h2,h3{color:#f3f6fb}
 input,select,textarea,button{font-family:"Vazirmatn",sans-serif!important}
 a.back,.back{border-radius:11px!important;color:#5eead4!important;border-color:#367f7c!important}
 button,.primary,.btn-primary{border-radius:10px!important}
 `;document.head.append(style);
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

function setupModuleCatalog(module) {
  const main=$("main"); if(!main || $("#module-catalog")) return;
  const section=document.createElement("section");section.id="module-catalog";
  section.style.cssText="margin:24px 0;padding:22px;border:1px solid #806c48;border-radius:18px;background:linear-gradient(145deg,#19283d,#101a2a);color:#f3f6fb";
  const head=document.createElement("div");head.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap";
  const title=document.createElement("h2");title.textContent="ساختار دلخواه این بخش";title.style.cssText="font-size:19px;margin:0;color:#f3f6fb";
  const addProject=document.createElement("button");addProject.type="button";addProject.textContent="+ تعریف پروژه جدید";addProject.style.cssText="background:linear-gradient(135deg,#d6b879,#a88443);color:#101827;border:0;border-radius:10px;padding:11px 16px;font:600 13px Vazirmatn,sans-serif;cursor:pointer";
  head.append(title,addProject);
  const hint=document.createElement("p");hint.textContent="پروژه‌ها و زیرمجموعه‌های دلخواهت را بدون محدودیت تعریف و مدیریت کن.";hint.style.cssText="font:13px/2 Vazirmatn,sans-serif;color:#a9b6c9;margin:10px 0 16px";
  const status=document.createElement("p");status.style.cssText="font:12px Vazirmatn,sans-serif;min-height:20px";
  const tree=document.createElement("div");tree.style.cssText="display:grid;gap:10px";
  section.append(head,hint,status,tree);main.insertBefore(section,main.children[1]||null);
  const say=(t,bad=false)=>{status.textContent=t;status.style.color=bad?"#fca5a5":"#5eead4";};
  const btnStyle="background:#26364b;color:#e8d7b5;border:1px solid #806c48;border-radius:9px;padding:8px 12px;font:12px Vazirmatn,sans-serif;cursor:pointer";
  let modal=null;
  function closeModal(){modal?.remove();modal=null;}
  function openNameDialog(parent=null){
    closeModal();
    modal=document.createElement("div");modal.style.cssText="position:fixed;inset:0;z-index:9999;background:#020817c9;display:grid;place-items:center;padding:18px";
    const card=document.createElement("form");card.style.cssText="width:min(440px,100%);padding:24px;border:1px solid #806c48;border-radius:18px;background:linear-gradient(145deg,#19283d,#101a2a);box-shadow:0 25px 80px #0009;color:#f3f6fb";
    const heading=document.createElement("h3");heading.textContent=parent?"افزودن زیرمجموعه":"تعریف پروژه جدید";heading.style.cssText="margin:0 0 16px;font:600 18px Vazirmatn,sans-serif";
    const label=document.createElement("label");label.textContent=parent?"عنوان زیرمجموعه":"نام پروژه";label.style.cssText="display:block;margin-bottom:8px;font:13px Vazirmatn,sans-serif;color:#cbd5e1";
    const input=document.createElement("input");input.type="text";input.placeholder=parent?"مثلاً قراردادهای اصلی":"نام پروژه را وارد کنید";input.required=true;input.maxLength=120;input.style.cssText="width:100%;box-sizing:border-box;padding:12px;border:1px solid #40536d;border-radius:10px;background:#0b1422;color:#fff;font:14px Vazirmatn,sans-serif;outline:none";
    const actions=document.createElement("div");actions.style.cssText="display:flex;justify-content:flex-start;gap:9px;margin-top:18px";
    const submit=document.createElement("button");submit.type="submit";submit.textContent="ثبت";submit.style.cssText=""+btnStyle+";background:#b99b62;color:#101827;padding:10px 22px;font-weight:600";
    const cancel=document.createElement("button");cancel.type="button";cancel.textContent="انصراف";cancel.style.cssText=btnStyle;cancel.onclick=closeModal;
    actions.append(submit,cancel);label.append(input);card.append(heading,label,actions);modal.append(card);document.body.append(modal);
    modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});
    card.addEventListener("submit",async e=>{
      e.preventDefault();const name=input.value.trim();if(!name){input.focus();return;}
      submit.disabled=true;submit.textContent="در حال ثبت...";
      const {error}=await supabase.from("module_catalog").insert({module,parent_id:parent?.id||null,node_type:parent?"category":"project",name});
      if(error){say("ذخیره انجام نشد: "+error.message,true);submit.disabled=false;submit.textContent="ثبت";return;}
      closeModal();say("مورد جدید با موفقیت ثبت شد.");await load();
    });
    input.focus();
  }
  function renderNode(node,depth=0){
    const wrap=document.createElement("div");wrap.style.cssText="margin-right:"+(depth*18)+"px;padding:13px;border:1px solid #35445a;border-radius:12px;background:#0b1422";
    const line=document.createElement("div");line.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap";
    const name=document.createElement("strong");name.textContent=(node.node_type==="project"?"▣ ":"↳ ")+node.name;name.style.cssText="font:600 14px Vazirmatn,sans-serif;color:#f3f6fb";
    const add=document.createElement("button");add.type="button";add.textContent="+ افزودن زیرمجموعه";add.style.cssText=btnStyle;add.onclick=()=>openNameDialog(node);
    line.append(name,add);wrap.append(line);(node.children||[]).forEach(child=>wrap.append(renderNode(child,depth+1)));return wrap;
  }
  async function load(){
    tree.replaceChildren();say("در حال دریافت ساختار...");
    const {data,error}=await supabase.from("module_catalog").select("id,module,parent_id,node_type,name,sort_order,created_at").eq("module",module).order("sort_order").order("created_at");
    if(error){say("دریافت اطلاعات انجام نشد: "+error.message,true);return;}
    const nodes=new Map(data.map(x=>[x.id,{...x,children:[]}]));const roots=[];
    nodes.forEach(n=>{if(n.parent_id&&nodes.has(n.parent_id))nodes.get(n.parent_id).children.push(n);else roots.push(n);});
    roots.forEach(n=>tree.append(renderNode(n)));
    if(!roots.length){const empty=document.createElement("p");empty.textContent="هنوز پروژه‌ای در این بخش تعریف نشده است. از دکمه بالا شروع کن.";empty.style.cssText="color:#9aabc1;font:13px Vazirmatn,sans-serif";tree.append(empty);}
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
  unifyTheme();
  if(path==="panel.html") decoratePanel();
  if(moduleMap[path]){setupModuleCatalog(moduleMap[path]);addSubmenuLinks(moduleMap[path]);setupDataForm(moduleMap[path]);}
  if(path==="transactions.html"){setupModuleCatalog("transactions");addSubmenuLinks("transactions");}
})();