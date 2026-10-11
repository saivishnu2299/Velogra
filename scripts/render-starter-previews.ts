/** Run with npx tsx scripts/render-starter-previews.ts, then open localhost:3031. */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  templates,
  makeStarterPreview,
  P5_LATEST,
  P5_LEGACY,
} from "../app/studio/templates";
import { creativeTools } from "../app/studio/toolkit";
const nonce = randomUUID();
const cases = templates.flatMap((template) =>
  [P5_LATEST, P5_LEGACY].map((version) => ({ id: template.id, version })),
);
const results: object[] = [];
function fixture(id: string, version: string) {
  const template = templates.find((t) => t.id === id)!;
  const project = makeStarterPreview(template);
  let html = project.files.find((f) => f.name === "index.html")!.content;
  html = html.replace(
    /https:\/\/cdn.jsdelivr.net\/npm\/p5@[\d.]+\/lib\/p5.min.js/,
    `/vendor/p5-${version}.min.js`,
  );
  html = html.replace(
    /https:\/\/cdn.jsdelivr.net\/npm\/p5@[\d.]+\/lib\/addons\/p5.sound.min.js/,
    `/vendor/p5.sound-${version === P5_LEGACY ? version : "0.4.1"}.min.js`,
  );
  for (const tool of creativeTools)
    if (tool.source && tool.local) html = html.replace(tool.source, tool.local);
  const code = project.files.find((file) => file.name === "sketch.js")!.content;
  const boot = `<script>window.studio=${JSON.stringify(project.params)};window.addEventListener('error',e=>parent.postMessage({error:e.message},'*'));window.addEventListener('unhandledrejection',e=>parent.postMessage({error:String(e.reason)},'*'));</script>`;
  const capture = `<script>
    let reported=false;
    const captureTimer=setInterval(()=>{
      const canvas=document.querySelector('canvas');
      if(reported||!canvas||window.frameCount<70)return;
      reported=true;clearInterval(captureTimer);
      const copy=document.createElement('canvas');copy.width=480;copy.height=480;const ctx=copy.getContext('2d');ctx.drawImage(canvas,0,0,480,480);
      const pixels=ctx.getImageData(0,0,480,480).data;const colors=new Set();for(let i=0;i<pixels.length;i+=160)colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
      const animationBefore=window.gsap?.globalTimeline.time();window.gsap?.globalTimeline.pause();
      setTimeout(()=>{const paused=!window.gsap||window.gsap.globalTimeline.time()===animationBefore;
      parent.postMessage({image:copy.toDataURL('image/webp',0.8),colors:colors.size,paused,audio:window.getAudioContext?.().state??'none',width:canvas.width,height:canvas.height},'*');noLoop();},100);
    },100);
  </script>`;
  html = html
    .replace("<head>", "<head>" + boot)
    .replace(
      '<link rel="stylesheet" href="style.css" />',
      "<style>html,body{margin:0;background:#12151a}canvas{display:block;max-width:100vw;max-height:100vh}</style>",
    )
    .replace(
      '<script src="sketch.js"></script>',
      `<script>${code}</script>${capture}`,
    );
  return html;
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url!, "http://localhost:3031");
  try {
    if (
      req.method === "POST" &&
      url.pathname === "/result" &&
      url.searchParams.get("token") === nonce
    ) {
      let body = "";
      for await (const chunk of req) body += chunk;
      if (body.length > 500000) throw Error("too large");
      const result = JSON.parse(body);
      const template = templates.find((t) => t.id === result.id);
      if (!template || ![P5_LATEST, P5_LEGACY].includes(result.version))
        throw Error("Invalid case");
      if (
        result.image &&
        result.version === (template.sound ? P5_LEGACY : P5_LATEST)
      ) {
        await mkdir("public/starters", { recursive: true });
        await writeFile(
          `public/starters/${template.id}.webp`,
          Buffer.from(result.image.split(",")[1], "base64"),
        );
      }
      delete result.image;
      results.push(result);
      console.log(JSON.stringify(result));
      await mkdir("output", { recursive: true });
      await writeFile(
        "output/starter-runtime-checks.json",
        JSON.stringify(results, null, 2),
      );
      res.end("ok");
      return;
    }
    if (url.pathname.startsWith("/vendor/")) {
      if (!/^\/vendor\/[\w.-]+$/.test(url.pathname))
        throw Error("invalid path");
      res.setHeader("Content-Type", "text/javascript");
      res.end(await readFile("public" + url.pathname));
      return;
    }
    if (url.pathname === "/fixture") {
      const id = url.searchParams.get("id")!,
        version = url.searchParams.get("version")!;
      if (!cases.some((c) => c.id === id && c.version === version))
        throw Error("Invalid case");
      res.setHeader("Content-Type", "text/html");
      res.end(fixture(id, version));
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end(`<!doctype html><html><head><title>Velogra starter verification</title><style>body{font:14px system-ui;padding:24px;background:#f5f3ed}iframe{width:480px;height:480px;border:0}button{padding:12px}pre{white-space:pre-wrap}</style></head><body><h1>Starter runtime verification</h1><button id="start">Render previews and verify both p5 versions</button><pre id="results"></pre><iframe title="Starter under test"></iframe><script>
    const cases=${JSON.stringify(cases)};const frame=document.querySelector('iframe');const output=document.querySelector('pre');let current,timer;
    async function next(){current=cases.shift();if(!current){output.textContent+='Complete';document.querySelector('button').textContent='Verification complete';return;}frame.src='/fixture?id='+current.id+'&version='+current.version;timer=setTimeout(()=>finish({error:'Timed out'}),15000);}
    async function finish(data){if(!current)return;clearTimeout(timer);const result={...current,...data};current=null;await fetch('/result?token=${nonce}',{method:'POST',body:JSON.stringify(result)});output.textContent+=JSON.stringify({...result,image:undefined})+'\\n';next();}
    window.addEventListener('message',e=>{if(e.source===frame.contentWindow)finish(e.data)});
    document.querySelector('button').onclick=()=>{document.querySelector('button').disabled=true;next();};
    </script></body></html>`);
  } catch (error) {
    res.statusCode = 500;
    res.end(String(error));
  }
});
server.listen(3031, "127.0.0.1", () =>
  console.log(
    "Open http://127.0.0.1:3031 to render and verify starter previews.",
  ),
);
