(function() {
  if (window.__SECTION_INSPECTOR_ACTIVE__) return;
  window.__SECTION_INSPECTOR_ACTIVE__ = true;

  var state = {enabled:true,hovered:null,selected:null};
  var host = document.createElement("div");
  host.id = "__section_inspector_host__";
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  document.documentElement.appendChild(host);
  var shadow = host.attachShadow({mode:"open"});

  shadow.innerHTML = [
    '<style>',
    ':host{all:initial}*{box-sizing:border-box}',
    '.ov{position:fixed;display:none;pointer-events:none;border:2px solid #7c5cff;background:rgba(124,92,255,.08);z-index:10}',
    '.tag{position:fixed;display:none;pointer-events:none;padding:4px 8px;border-radius:6px;background:#7c5cff;color:#fff;font:600 11px/1.3 ui-monospace,monospace;z-index:11;white-space:nowrap;box-shadow:0 3px 12px rgba(0,0,0,.2)}',
    '.panel{position:fixed;top:12px;right:12px;width:370px;max-height:calc(100vh - 24px);overflow:hidden;pointer-events:auto;color:#f5f7fb;background:#10131a;border:1px solid #272d3a;border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,.35);font:12px/1.45 Inter,system-ui,sans-serif;z-index:20}',
    '.head{height:58px;padding:0 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #262c38;background:#151922}',
    '.title{display:grid;gap:1px}.title strong{font-size:14px;color:#fff}.title span{font-size:10px;color:#818b9c}',
    '.ha{display:flex;gap:6px}.btn{height:30px;padding:0 9px;border:1px solid #2b3240;border-radius:8px;background:#1b202a;color:#dbe1ea;font:600 11px/1 system-ui;cursor:pointer}.btn:hover{border-color:#7c5cff;color:#fff}.danger{color:#ff8090}',
    '.body{max-height:calc(100vh - 82px);overflow:auto;padding:10px 12px 14px}.empty{padding:36px 16px;text-align:center;color:#8791a2;line-height:1.7}',
    '.node{margin-bottom:10px;padding:9px 10px;border:1px solid #282f3b;border-radius:10px;background:#151922}.node code{display:block;color:#c6bfff;font:600 11px/1.45 ui-monospace,monospace;word-break:break-all}.node small{display:block;margin-top:3px;color:#7f8999}',
    '.group{margin:10px 0;border:1px solid #262d39;border-radius:10px;overflow:hidden}.group h3{margin:0;padding:8px 10px;background:#171b24;color:#aab3c1;font-size:10px;letter-spacing:.1em;text-transform:uppercase}',
    '.row{min-height:30px;padding:6px 9px;display:grid;grid-template-columns:116px minmax(0,1fr);gap:8px;align-items:center;border-top:1px solid #222833}.row:first-of-type{border-top:0}.key{color:#7f8999}.val{color:#eef1f5;font-family:ui-monospace,monospace;word-break:break-word}',
    '.sw{display:inline-block;width:12px;height:12px;border:1px solid rgba(255,255,255,.24);border-radius:3px;vertical-align:-2px;margin-left:6px}',
    '.box{margin:8px;padding:8px;border-radius:8px;background:#0d1016;border:1px dashed #333b49;display:grid;gap:5px;color:#cdd3dc;font-family:ui-monospace,monospace}.box b{color:#a895ff}',
    '.chip{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0;padding:8px 10px;border-radius:9px;background:rgba(124,92,255,.1);border:1px solid rgba(124,92,255,.28)}.chip span{color:#cfc9ff}.chip code{font-size:10px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px}',
    '.actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}.actions .btn{width:100%}.note{padding:7px 2px;color:#667083;font-size:10px;text-align:center}',
    '</style>',
    '<div class="ov"></div><div class="tag"></div>',
    '<aside class="panel"><div class="head"><div class="title"><strong>Section Inspector</strong><span>Click any element to inspect</span></div><div class="ha"><button class="btn" data-a="pause">Pause</button><button class="btn danger" data-a="close">×</button></div></div><div class="body"><div class="empty">Move over the page, then click an element.<br>Exact computed properties will appear here.</div></div></aside>'
  ].join("");

  var overlay = shadow.querySelector(".ov");
  var tag = shadow.querySelector(".tag");
  var body = shadow.querySelector(".body");
  var pauseBtn = shadow.querySelector('[data-a="pause"]');

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g,function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m];
    });
  }
  function px(n) {
    n = Number(n);
    return Number.isFinite(n) ? (Math.round(n*100)/100)+"px" : String(n);
  }
  function selectorFor(el) {
    if (!(el instanceof Element)) return "";
    if (el.id) return "#" + CSS.escape(el.id);
    var parts=[], node=el;
    while (node && node.nodeType===1 && node!==document.body) {
      var part=node.tagName.toLowerCase();
      var cls=Array.from(node.classList).filter(Boolean).slice(0,3);
      if (cls.length) part += "."+cls.map(CSS.escape).join(".");
      var parent=node.parentElement;
      if (parent) {
        var same=Array.from(parent.children).filter(function(x){return x.tagName===node.tagName;});
        if (same.length>1) part += ":nth-of-type("+(same.indexOf(node)+1)+")";
      }
      parts.unshift(part);
      node=parent;
      if (parts.length>=5) break;
    }
    return parts.join(" > ");
  }
  function nearestSection(el) {
    return el.closest("section,main,header,footer,article,nav,aside,[role=region],[data-section]") || el;
  }
  function read(el) {
    var cs=getComputedStyle(el), r=el.getBoundingClientRect(), section=nearestSection(el), sr=section.getBoundingClientRect();
    return {
      el:el, section:section, selector:selectorFor(el), sectionSelector:selectorFor(section), tag:el.tagName.toLowerCase(),
      rect:{x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,right:r.right,bottom:r.bottom,left:r.left},
      document:{x:r.left+scrollX,y:r.top+scrollY},
      sectionRect:{x:sr.x,y:sr.y,width:sr.width,height:sr.height},
      box:{margin:[cs.marginTop,cs.marginRight,cs.marginBottom,cs.marginLeft],padding:[cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft],border:[cs.borderTopWidth,cs.borderRightWidth,cs.borderBottomWidth,cs.borderLeftWidth]},
      layout:{display:cs.display,position:cs.position,zIndex:cs.zIndex,overflow:cs.overflow,gap:cs.gap,rowGap:cs.rowGap,columnGap:cs.columnGap,flexDirection:cs.flexDirection,justifyContent:cs.justifyContent,alignItems:cs.alignItems,gridTemplateColumns:cs.gridTemplateColumns,gridTemplateRows:cs.gridTemplateRows},
      appearance:{color:cs.color,backgroundColor:cs.backgroundColor,backgroundImage:cs.backgroundImage,borderColor:cs.borderTopColor,borderStyle:cs.borderTopStyle,borderRadius:cs.borderRadius,boxShadow:cs.boxShadow,opacity:cs.opacity},
      typography:{fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,lineHeight:cs.lineHeight,letterSpacing:cs.letterSpacing,textAlign:cs.textAlign}
    };
  }
  function row(k,v){return '<div class="row"><span class="key">'+esc(k)+'</span><span class="val">'+v+'</span></div>';}
  function group(title,rows){return '<section class="group"><h3>'+esc(title)+'</h3>'+rows.join("")+'</section>';}
  function colorRow(k,v){var sw=(v&&v!=="none"&&v!=="transparent")?'<span class="sw" style="background:'+esc(v)+'"></span>':"";return row(k,sw+esc(v||"—"));}
  function copyText(text) {
    var ta=document.createElement("textarea"); ta.value=text; ta.style.cssText="position:fixed;left:-99999px;top:-99999px"; document.body.appendChild(ta); ta.select();
    try{document.execCommand("copy");}finally{ta.remove();}
  }
  function cssSnippet(d) {
    return d.selector+" {\n"+
      "  width: "+px(d.rect.width)+";\n  height: "+px(d.rect.height)+";\n"+
      "  margin: "+d.box.margin.join(" ")+";\n  padding: "+d.box.padding.join(" ")+";\n"+
      "  display: "+d.layout.display+";\n  position: "+d.layout.position+";\n  gap: "+d.layout.gap+";\n"+
      "  color: "+d.appearance.color+";\n  background-color: "+d.appearance.backgroundColor+";\n"+
      "  border-radius: "+d.appearance.borderRadius+";\n  box-shadow: "+d.appearance.boxShadow+";\n"+
      "  font-family: "+d.typography.fontFamily+";\n  font-size: "+d.typography.fontSize+";\n"+
      "  font-weight: "+d.typography.fontWeight+";\n  line-height: "+d.typography.lineHeight+";\n}";
  }
  function render(d) {
    var r=d.rect,b=d.box,l=d.layout,a=d.appearance,t=d.typography,s=d.sectionRect;
    body.innerHTML =
      '<div class="node"><code>'+esc(d.selector)+'</code><small>&lt;'+esc(d.tag)+'&gt;</small></div>'+
      '<div class="chip"><span>Nearest section</span><code>'+esc(d.sectionSelector)+'</code></div>'+
      '<div class="actions"><button class="btn" data-a="parent">Parent ↑</button><button class="btn" data-a="section">Section</button><button class="btn" data-a="copycss">Copy CSS</button></div>'+
      '<div class="actions"><button class="btn" data-a="copyjson">Copy JSON</button><button class="btn" data-a="refresh">Refresh</button><button class="btn" data-a="unpin">Unpin</button></div>'+
      group("Geometry",[row("width",esc(px(r.width))),row("height",esc(px(r.height))),row("viewport x / y",esc(px(r.x)+" / "+px(r.y))),row("document x / y",esc(px(d.document.x)+" / "+px(d.document.y))),row("section size",esc(px(s.width)+" × "+px(s.height)))])+
      '<section class="group"><h3>Box model</h3><div class="box"><div><b>margin</b> '+esc(b.margin.join(" · "))+'</div><div><b>border</b> '+esc(b.border.join(" · "))+'</div><div><b>padding</b> '+esc(b.padding.join(" · "))+'</div></div></section>'+
      group("Colors & Appearance",[colorRow("text color",a.color),colorRow("background",a.backgroundColor),colorRow("border color",a.borderColor),row("background image",esc(a.backgroundImage)),row("border radius",esc(a.borderRadius)),row("box shadow",esc(a.boxShadow)),row("opacity",esc(a.opacity))])+
      group("Typography",[row("font family",esc(t.fontFamily)),row("font size",esc(t.fontSize)),row("font weight",esc(t.fontWeight)),row("line height",esc(t.lineHeight)),row("letter spacing",esc(t.letterSpacing)),row("text align",esc(t.textAlign))])+
      group("Layout",[row("display",esc(l.display)),row("position",esc(l.position)),row("z-index",esc(l.zIndex)),row("overflow",esc(l.overflow)),row("gap",esc(l.gap)),row("row gap",esc(l.rowGap)),row("column gap",esc(l.columnGap)),row("flex direction",esc(l.flexDirection)),row("justify",esc(l.justifyContent)),row("align",esc(l.alignItems)),row("grid columns",esc(l.gridTemplateColumns)),row("grid rows",esc(l.gridTemplateRows))])+
      '<div class="note">Computed from the live DOM at the current viewport.</div>';

    body.querySelector('[data-a="parent"]').onclick=function(){select(d.el.parentElement||d.el);};
    body.querySelector('[data-a="section"]').onclick=function(){select(d.section);};
    body.querySelector('[data-a="copycss"]').onclick=function(){copyText(cssSnippet(d));};
    body.querySelector('[data-a="copyjson"]').onclick=function(){copyText(JSON.stringify({selector:d.selector,sectionSelector:d.sectionSelector,rect:d.rect,document:d.document,sectionRect:d.sectionRect,box:d.box,layout:d.layout,appearance:d.appearance,typography:d.typography},null,2));};
    body.querySelector('[data-a="refresh"]').onclick=function(){select(d.el);};
    body.querySelector('[data-a="unpin"]').onclick=function(){state.selected=null;body.innerHTML='<div class="empty">Move over the page, then click an element.<br>Exact computed properties will appear here.</div>';};
  }
  function draw(el) {
    if (!(el instanceof Element) || el===host || host.contains(el)) return;
    var r=el.getBoundingClientRect();
    overlay.style.display="block"; overlay.style.left=r.left+"px"; overlay.style.top=r.top+"px"; overlay.style.width=r.width+"px"; overlay.style.height=r.height+"px";
    tag.style.display="block"; tag.textContent=el.tagName.toLowerCase()+"  "+Math.round(r.width)+" × "+Math.round(r.height);
    tag.style.top=Math.max(4,r.top-24)+"px"; tag.style.left=Math.min(Math.max(4,r.left),innerWidth-190)+"px";
  }
  function select(el) {if(!(el instanceof Element))return;state.selected=el;draw(el);render(read(el));}
  function target(e){var p=e.composedPath?e.composedPath():[];return p.find(function(n){return n instanceof Element&&n!==host&&!host.contains(n);})||e.target;}
  function move(e){if(!state.enabled||state.selected)return;var el=target(e);if(el instanceof Element){state.hovered=el;draw(el);}}
  function click(e){if(!state.enabled)return;var el=target(e);if(!(el instanceof Element)||el===document.documentElement||el===document.body)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();select(el);}
  function redraw(){var el=state.selected||state.hovered;if(el&&el.isConnected)draw(el);}
  document.addEventListener("mousemove",move,true);
  document.addEventListener("click",click,true);
  window.addEventListener("scroll",redraw,true);
  window.addEventListener("resize",redraw,true);
  pauseBtn.onclick=function(){
    state.enabled=!state.enabled;
    pauseBtn.textContent=state.enabled?"Pause":"Resume";
    if(!state.enabled){overlay.style.display="none";tag.style.display="none";}else{state.selected=null;}
  };
  var api={
    destroy:function(){
      document.removeEventListener("mousemove",move,true);
      document.removeEventListener("click",click,true);
      window.removeEventListener("scroll",redraw,true);
      window.removeEventListener("resize",redraw,true);
      host.remove();
      delete window.__SECTION_INSPECTOR__;
      window.__SECTION_INSPECTOR_ACTIVE__=false;
    },
    select:select,
    read:read
  };
  shadow.querySelector('[data-a="close"]').onclick=function(){api.destroy();};
  window.__SECTION_INSPECTOR__=api;
})();
