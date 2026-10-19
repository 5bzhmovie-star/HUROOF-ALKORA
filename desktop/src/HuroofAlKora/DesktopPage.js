// Injected only in the top-level game document. No OS/file APIs are exposed.
(() => {
  if (window.top !== window.self || !window.chrome?.webview) return;
  let menuOpen=false;
  const post = action => window.chrome.webview.postMessage(action);
  document.addEventListener('keydown', event => {
    let action='';
    if(event.key==='F11'||(event.altKey&&event.key==='Enter'))action='fullscreen';
    else if(event.key==='Escape'&&!menuOpen)action='escape';
    else if(event.key==='F5'||(event.ctrlKey&&event.key.toLowerCase()==='r'))action='reload';
    else if(event.key==='F1')action='about';
    if(action){event.preventDefault();post(action);}
  },true);
  let pending=null,watcher=null;
  window.__hkDesktopReady = navigation => {
    pending=navigation;
    watcher?.disconnect();
    const check=()=>{
      const app=document.querySelector('.app');
      // Older independent servers still have a rendered main page but no readiness attribute.
      const ready=app?.dataset.hkReady==='true'||(app&&!app.hasAttribute('data-hk-ready')&&app.querySelector('main')&&!app.querySelector('[role="status"]'));
      if(!ready||app.querySelector('#main-content > .loading'))return;
      watcher?.disconnect();
      const current=navigation;
      Promise.resolve(document.fonts?.ready).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(current===pending)window.chrome.webview.postMessage(JSON.stringify({action:'ready',navigation:String(current)}));
      })));
    };
    watcher=new MutationObserver(check);watcher.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-hk-ready']});check();
  };
  document.addEventListener('DOMContentLoaded',()=>{
    const host=document.createElement('div');host.id='hk-desktop-controls';
    // Inline important declarations keep game layout styles from turning this into a toolbar.
    host.style.cssText='position:fixed!important;inset:auto auto 18px 18px!important;z-index:2147483000!important;width:auto!important;height:auto!important;direction:rtl!important';
    const shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>
      :host{font-family:Tahoma,"Segoe UI",sans-serif;color:#edf3ea;direction:rtl}*{box-sizing:border-box}button{font:inherit;cursor:pointer;color:inherit;border:0}button:focus-visible{outline:2px solid #c2f17c;outline-offset:3px}
      .trigger{display:grid;place-items:center;width:40px;height:40px;border:1px solid #7fa78b55;border-radius:14px;background:#10201fe8;color:#c2f17c;box-shadow:0 6px 20px #0003;opacity:.5;transition:opacity .2s,background .2s}.trigger:hover,.trigger:focus-visible,.trigger[aria-expanded=true]{opacity:1;background:#1b332c}.trigger svg{width:21px;height:21px}
      .menu{position:absolute;bottom:52px;left:0;width:242px;padding:9px;border:1px solid #385b49;border-radius:18px;background:#10201ffa;box-shadow:0 16px 70px #0007}.menu[hidden]{display:none}.title{cursor:grab;user-select:none;padding:8px 9px 13px;font-size:12px;color:#adc1b0;border-bottom:1px solid #2b4540;margin-bottom:5px}.menu button{display:block;text-align:right;width:100%;border-radius:9px;background:transparent;font-size:13px;padding:11px 10px}.menu button:hover{background:#264638}.menu .exit{color:#ffb6b0}.hint{padding:8px;font-size:10px;color:#7f998b;line-height:1.8}
    </style><button class="trigger" aria-label="خيارات التطبيق" aria-expanded="false" title="خيارات التطبيق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 13V2l8 4-8 4"/><path d="M20.561 10.222a9 9 0 1 1-12.55-5.29"/><path d="M8.002 9.997a5 5 0 1 0 8.9 2.02"/></svg></button><section class="menu" role="dialog" aria-label="خيارات حروف الكورة" hidden><div class="title">حروف الكورة · خيارات التطبيق</div>
    <button data-action="fullscreen">تبديل ملء الشاشة <small>F11</small></button><button data-action="minimize">تصغير لشريط المهام</button><button data-action="admin">لوحة الإدارة</button><button data-action="lan">اللعب عبر شبكة LAN</button><button data-action="local">اللعب المحلي</button><button data-action="online">الاتصال بخادم جماعي</button><button data-action="reload">تحديث اللعبة</button><button data-action="about">حول حروف الكورة</button><button data-action="close" class="exit">إغلاق اللعبة</button><div class="hint">Alt + F4 للإغلاق · F11 لملء الشاشة</div></section>`;
    const trigger=shadow.querySelector('.trigger'),menu=shadow.querySelector('.menu');
    const hide=()=>{menuOpen=false;menu.hidden=true;trigger.setAttribute('aria-expanded','false');};
    trigger.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuOpen=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)menu.querySelector('button').focus();});
    shadow.querySelector('.title').addEventListener('pointerdown',event=>{if(event.button===0)post('move');});
    shadow.querySelector('.title').addEventListener('dblclick',()=>post('fullscreen'));
    shadow.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{hide();post(button.dataset.action);trigger.focus();}));
    document.addEventListener('pointerdown',event=>{if(!event.composedPath().includes(host))hide();});
    shadow.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();hide();trigger.focus();}if(event.key==='Tab'&&!menu.hidden){const buttons=[...menu.querySelectorAll('button')];if(event.shiftKey&&shadow.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}else if(!event.shiftKey&&shadow.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}}});
    document.body.append(host);
  },{once:true});
})();
