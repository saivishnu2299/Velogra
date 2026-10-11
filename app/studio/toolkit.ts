import type { Project } from "./projects";

export type CreativeTool = {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  docs: string;
  example: string;
  source?: string;
  local?: string;
};

export const creativeTools: CreativeTool[] = [
  {
    id: "sound",
    name: "p5.sound",
    category: "Sound",
    description: "Give a shape a voice. Synthesize, play, and explore sound.",
    version: "0.4.1 / 1.11.11",
    docs: "https://p5js.org/reference/p5.sound/",
    example: "sound",
  },
  {
    id: "matter",
    name: "Matter.js",
    category: "Physics",
    description: "Let gravity, collisions, and playful forces shape the scene.",
    version: "0.20.0",
    docs: "https://brm.io/matter-js/docs/",
    example: "gravity",
    source: "https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js",
    local: "/vendor/matter-0.20.0.min.js",
  },
  {
    id: "gsap",
    name: "GSAP",
    category: "Motion",
    description: "Choreograph shapes with elastic motion and precise timing.",
    version: "3.13.0",
    docs: "https://gsap.com/docs/v3/",
    example: "elastic",
    source: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js",
    local: "/vendor/gsap-3.13.0.min.js",
  },
  {
    id: "chroma",
    name: "chroma.js",
    category: "Color",
    description:
      "Find unexpected palettes and beautifully blended color scales.",
    version: "3.1.2",
    docs: "https://gka.github.io/chroma.js/",
    example: "palette",
    source: "https://cdn.jsdelivr.net/npm/chroma-js@3.1.2/dist/chroma.min.cjs",
    local: "/vendor/chroma-3.1.2.min.js",
  },
  {
    id: "webgl",
    name: "p5 WebGL",
    category: "3D",
    description:
      "Sculpt in three dimensions with geometry, light, and a camera.",
    version: "Built into p5",
    docs: "https://p5js.org/tutorials/getting-started-with-webgl/",
    example: "space",
  },
  {
    id: "shaders",
    name: "GLSL shaders",
    category: "Shaders",
    description: "Paint with light. Write a tiny program for every pixel.",
    version: "Built into p5",
    docs: "https://p5js.org/reference/p5/createShader/",
    example: "liquid",
  },
];

export function toolSource(tool: CreativeTool, p5Version: string) {
  if (tool.id === "sound")
    return p5Version === "1.11.11"
      ? "https://cdn.jsdelivr.net/npm/p5@1.11.11/lib/addons/p5.sound.min.js"
      : "https://cdn.jsdelivr.net/npm/p5.sound@0.4.1/dist/p5.sound.min.js";
  return tool.source;
}

export function scriptSources(html: string): string[] {
  const sources: string[] = [];
  // Work on complete script elements, so script-like strings inside inline JS
  // and HTML comments are not mistaken for installed dependencies.
  const clean = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const tag of clean.matchAll(
    /<script\b([^>]*?)>[\s\S]*?<\/script\s*>/gi,
  )) {
    const src = tag[1].match(
      /(?:^|\s)src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
    );
    if (src)
      sources.push((src[1] ?? src[2] ?? src[3]).replaceAll("&amp;", "&"));
  }
  return sources;
}

export function toolIncluded(html: string, tool: CreativeTool) {
  const sources = scriptSources(html);
  if (tool.id === "sound")
    return sources.some((src) =>
      /(?:p5\.sound@|\/addons\/p5\.sound)/.test(src),
    );
  return !!tool.source && sources.includes(tool.source);
}

export function addScript(html: string, source: string): string {
  const url = new URL(source);
  if (url.protocol !== "https:")
    throw new Error("Use an HTTPS JavaScript URL.");
  if (scriptSources(html).includes(url.href)) return html;
  const tags = [
    ...html.matchAll(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi),
  ];
  const p5 = tags.find(
    (tag) =>
      !tag[0].startsWith("<!--") &&
      scriptSources(tag[0]).some((src) =>
        /\/p5@[^/]+\/lib\/p5(?:\.min)?\.js/.test(src),
      ),
  );
  if (!p5 || p5.index === undefined)
    throw new Error("Include a supported p5.js script in index.html first.");
  const escaped = url.href.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const offset = p5.index + p5[0].length;
  return (
    html.slice(0, offset) +
    `\n    <script src="${escaped}"></script>` +
    html.slice(offset)
  );
}

export function removeScript(html: string, source: string): string {
  return html.replace(
    /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,
    (tag) =>
      !tag.startsWith("<!--") && scriptSources(tag).includes(source) ? "" : tag,
  );
}

export function editDependency(
  project: Project,
  source: string,
  remove = false,
): Project {
  if (!project.files.some((file) => file.name === "index.html"))
    throw new Error("Add index.html before including a library.");
  return {
    ...project,
    updated: Date.now(),
    files: project.files.map((file) =>
      file.name === "index.html"
        ? {
            ...file,
            content: remove
              ? removeScript(file.content, source)
              : addScript(file.content, source),
          }
        : file,
    ),
  };
}

export function switchP5Version(project: Project, version: string): Project {
  if (!["2.3.4", "1.11.11"].includes(version))
    throw new Error("Unsupported p5.js version.");
  const sound = creativeTools.find((tool) => tool.id === "sound")!;
  return {
    ...project,
    version,
    updated: Date.now(),
    files: project.files.map((file) => {
      if (file.name !== "index.html") return file;
      const hasSound = toolIncluded(file.content, sound);
      let content = file.content.replace(
        /p5@[\d.]+\/lib\/p5(?:\.min)?\.js/g,
        `p5@${version}/lib/p5.min.js`,
      );
      for (const source of scriptSources(content).filter((source) =>
        /(?:p5\.sound@|\/addons\/p5\.sound)/.test(source),
      ))
        content = removeScript(content, source);
      if (hasSound) content = addScript(content, toolSource(sound, version)!);
      return { ...file, content };
    }),
  };
}
