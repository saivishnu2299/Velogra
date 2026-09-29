import type { Project } from "./projects";
function scriptText(text: string) {
  return text.replace(/<\/script/gi, "<\\/script");
}
function dataURL(content: string, mime = "text/plain") {
  return `data:${mime};base64,${btoa(unescape(encodeURIComponent(content)))}`;
}
const runtimeSources = new Map<string, string>();
export async function prepareRuntime(project: Project) {
  const index =
    project.files.find((f) => f.name === "index.html")?.content ?? "";
  const paths: string[] = [];
  for (const version of ["2.3.4", "1.11.11"]) {
    if (index.includes("p5@" + version + "/lib/p5"))
      paths.push("/vendor/p5-" + version + ".min.js");
    if (index.includes("p5@" + version + "/lib/addons/p5.sound"))
      paths.push("/vendor/p5.sound-" + version + ".min.js");
  }
  if (index.includes("p5.sound@0.4.1/"))
    paths.push("/vendor/p5.sound-0.4.1.min.js");
  await Promise.all(
    paths.map(async (path) => {
      if (runtimeSources.has(path)) return;
      const response = await fetch(path);
      if (!response.ok)
        throw new Error("Could not load the p5.js runtime. Try running again.");
      runtimeSources.set(
        path,
        dataURL(await response.text(), "text/javascript"),
      );
    }),
  );
}
function normalize(path: string) {
  return decodeURIComponent(path.split(/[?#]/)[0])
    .replace(/^\.\//, "")
    .replace(/^\//, "");
}
export function compileProject(
  project: Project,
  token: string,
  standalone = false,
): string {
  const source = project.files.find((f) => f.name === "index.html")?.content;
  if (!source) throw new Error("Add an index.html file to run this project.");
  const doc = new DOMParser().parseFromString(source, "text/html");
  const files = new Map(project.files.map((f) => [f.name, f]));
  const assets: Record<string, string> = {};
  for (const f of project.files)
    assets[f.name] = f.binary
      ? f.content
      : dataURL(
          f.content,
          f.mime ??
            (f.name.endsWith(".json")
              ? "application/json"
              : f.name.endsWith(".css")
                ? "text/css"
                : "text/plain"),
        );
  function resolve(path: string) {
    return assets[normalize(path)] ?? path;
  }
  const prelude = doc.createElement("script");
  prelude.textContent =
    scriptText(`window.studio=${JSON.stringify(project.params)};
 const __files=${JSON.stringify(assets)};
 const __resolve=(path)=>{if(typeof path!=='string')return path;try{const name=decodeURIComponent(path.split(/[?#]/)[0]).replace(/^\\.\\//,'').replace(/^\\//,'');return __files[name]||path;}catch{return path;}};
 const __Request=window.Request;window.Request=class extends __Request{constructor(input,init){super(typeof input==='string'?__resolve(input):input,init);}};
 const __fetch=window.fetch.bind(window); window.fetch=(input,init)=>__fetch(typeof input==='string'?__resolve(input):input,init);
 const __open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url,...rest){return __open.call(this,method,__resolve(String(url)),...rest);};
 for(const Type of [HTMLImageElement,HTMLMediaElement]){const d=Object.getOwnPropertyDescriptor(Type.prototype,'src');if(d?.set)Object.defineProperty(Type.prototype,'src',{...d,set(value){d.set.call(this,__resolve(value));}});}
 const __attr=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,value){return __attr.call(this,name,['src','href','poster'].includes(name)?__resolve(value):value);};
 ${standalone ? "" : bridge(token)}
 `);
  doc.head.insertBefore(prelude, doc.head.firstChild);
  for (const script of Array.from(doc.querySelectorAll("script[src]"))) {
    const src = script.getAttribute("src") ?? "",
      file = files.get(normalize(src));
    if (file && !file.binary) {
      script.setAttribute("data-canvas-source", file.name);
      script.removeAttribute("src");
      script.textContent =
        scriptText(file.content) + `\n//# sourceURL=${file.name}`;
    } else if (!standalone) {
      const p5 = src.match(
        /\/p5@([\d.]+)\/lib\/(p5(?:\.min)?\.js|addons\/p5\.sound(?:\.min)?\.js)/,
      );
      if (p5 && ["2.3.4", "1.11.11"].includes(p5[1]))
        script.setAttribute(
          "src",
          runtimeSources.get(
            `/vendor/${p5[2].includes("sound") ? "p5.sound" : "p5"}-${p5[1]}.min.js`,
          ) ?? src,
        );
      if (src.includes("p5.sound@0.4.1/"))
        script.setAttribute(
          "src",
          runtimeSources.get("/vendor/p5.sound-0.4.1.min.js") ?? src,
        );
    }
    if (!standalone && script.hasAttribute("src"))
      script.setAttribute(
        "onerror",
        `window.__report('error',${JSON.stringify("Could not load library: " + src)})`,
      );
  }
  for (const link of Array.from(
    doc.querySelectorAll('link[rel="stylesheet"]'),
  )) {
    const file = files.get(normalize(link.getAttribute("href") ?? ""));
    if (file && !file.binary) {
      const style = doc.createElement("style");
      style.textContent = file.content.replace(
        /url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,
        (_, quote, path) => `url("${resolve(path)}")`,
      );
      link.replaceWith(style);
    }
  }
  for (const el of Array.from(doc.querySelectorAll("[src],[href],[poster]")))
    for (const attr of ["src", "href", "poster"])
      if (el.hasAttribute(attr))
        el.setAttribute(attr, resolve(el.getAttribute(attr) ?? ""));
  // Module source files retain module semantics and resolve local imports through an import map.
  const imports: Record<string, string> = {};
  for (const f of project.files.filter(
    (f) => /\.(m?js)$/.test(f.name) && !f.binary,
  )) {
    const text = f.content.replace(
      /((?:from\s*|import\s*\(?\s*)['"])(\.\.?\/[^'"]+)(['"])/g,
      (_, before, path, after) => {
        const root = f.name.includes("/")
          ? f.name.slice(0, f.name.lastIndexOf("/") + 1)
          : "";
        const resolved = new URL(
          path,
          `https://canvas.invalid/${root}`,
        ).pathname.slice(1);
        return `${before}canvas:${resolved}${after}`;
      },
    );
    imports[`canvas:${f.name}`] = dataURL(text, "text/javascript");
  }
  for (const s of Array.from(doc.querySelectorAll('script[type="module"]'))) {
    const sourceFile = s.getAttribute("data-canvas-source") ?? "";
    const base = sourceFile.includes("/")
      ? sourceFile.slice(0, sourceFile.lastIndexOf("/") + 1)
      : "";
    s.textContent =
      s.textContent?.replace(
        /((?:from\s*|import\s*\(?\s*)['"])(\.\.?\/[^'"]+)(['"])/g,
        (_, a, path, b) =>
          `${a}canvas:${new URL(path, `https://canvas.invalid/${base}`).pathname.slice(1)}${b}`,
      ) ?? "";
  }
  if (Object.keys(imports).length) {
    const map = doc.createElement("script");
    map.type = "importmap";
    map.textContent = JSON.stringify({ imports });
    doc.head.insertBefore(map, prelude.nextSibling);
  }
  const fit = doc.createElement("style");
  fit.textContent =
    "html{overflow:auto}canvas{max-width:100vw;max-height:100vh;object-fit:contain;touch-action:none}";
  doc.head.appendChild(fit);
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}
function bridge(token: string) {
  return `
 const __token=${JSON.stringify(token)};
 function __safe(value){try{return typeof value==='string'?value:JSON.stringify(value,(_,v)=>typeof v==='bigint'?String(v):v);}catch{return String(value);}}
 window.__report=(kind,message,extra={})=>parent.postMessage({canvasStudio:__token,kind,message,...extra},'*');
 for(const kind of ['log','info','warn','error']){const original=console[kind].bind(console);console[kind]=(...args)=>{original(...args);window.__report(kind,args.map(__safe).join(' '));};}
 window.addEventListener('error',e=>{if(e.message)window.__report('error',e.message,{file:e.filename,line:e.lineno});else if(e.target?.src)window.__report('error','Could not load resource: '+e.target.src);});
 window.addEventListener('unhandledrejection',e=>window.__report('error',e.reason?.message||String(e.reason)));
 window.addEventListener('message',e=>{
  if(e.source!==parent||e.data?.canvasStudio!==__token)return;
  if(e.data.action==='params')Object.assign(window.studio,e.data.params);
  if(e.data.action==='pause'){window.noLoop?.();window.getAudioContext?.().suspend();}
  if(e.data.action==='resume'){window.loop?.();window.getAudioContext?.().resume();}
  if(e.data.action==='snapshot'){
   try{const canvas=document.querySelector('canvas');if(!canvas)throw new Error('This sketch has no canvas to capture.');window.__report('snapshot',canvas.toDataURL('image/png'));}
   catch(error){window.__report('error',error.message);}
  }
 });
 window.addEventListener('load',()=>window.__report('ready','Sketch is running'));
 setInterval(()=>{const canvas=document.querySelector('canvas');if(canvas)window.__report('stats','',{width:canvas.width/(window.pixelDensity?.()||1),height:canvas.height/(window.pixelDensity?.()||1),fps:Math.round(window.frameRate?.()||0)});},1200);
 `;
}
