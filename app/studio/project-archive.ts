import { strToU8, zipSync, unzipSync, strFromU8 } from "fflate";
import { download, validName, type Project, type SketchFile } from "./projects";
import {
  makeProject,
  templates,
  html,
  css,
  P5_LATEST,
  P5_LEGACY,
} from "./templates";

export function toSketchFile(
  name: string,
  data: Uint8Array,
  mime = "",
): SketchFile {
  if (/\.(js|mjs|html|css|json|txt|csv|md|svg|vert|frag|glsl)$/i.test(name)) {
    return { name, content: strFromU8(data), mime };
  }
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    mp4: "video/mp4",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
  };
  let binary = "";
  for (let i = 0; i < data.length; i += 8192) {
    binary += String.fromCharCode(...data.subarray(i, i + 8192));
  }
  const type =
    mime ||
    types[name.split(".").pop()?.toLowerCase() ?? ""] ||
    "application/octet-stream";
  return {
    name,
    content: `data:${type};base64,${btoa(binary)}`,
    binary: true,
    mime: type,
  };
}

export function projectZIP(project: Project): Blob {
  const files: Record<string, Uint8Array> = {};
  for (const file of project.files) {
    files[file.name] = file.binary
      ? Uint8Array.from(atob(file.content.split(",")[1]), (c) =>
          c.charCodeAt(0),
        )
      : strToU8(file.content);
  }
  const index = project.files.find((file) => file.name === "index.html");
  if (index) {
    files["index.html"] = strToU8(
      index.content.replace(
        /<head([^>]*)>/i,
        // Standalone defaults must not overwrite the runtime's current controls
        // when this archive is imported and edited again in Velogra.
        `<head$1>\n<script>window.studio ??= ${JSON.stringify(project.params)};</script>`,
      ),
    );
  }
  files["canvas-project.json"] = strToU8(
    JSON.stringify(
      {
        name: project.name,
        params: project.params,
        template: project.template,
        version: project.version,
      },
      null,
      2,
    ),
  );
  files["README.txt"] = strToU8(
    `${project.name}\nCreated with Velogra. Code becomes form.\n\nOpen index.html in a browser. For loading local data or media,\nserve this folder with a local HTTP server.\np5.js libraries require an internet connection.\n`,
  );
  return new Blob([zipSync(files) as Uint8Array<ArrayBuffer>], {
    type: "application/zip",
  });
}

export function exportProjectZIP(project: Project) {
  download(projectZIP(project), `${project.name}.zip`);
}

export async function importProjectZIP(file: File): Promise<Project> {
  if (!/\.zip$/i.test(file.name)) throw new Error("Choose a project ZIP file.");
  if (file.size > 50 * 1024 * 1024)
    throw new Error("Choose a ZIP smaller than 50 MB.");
  let expanded = 0,
    count = 0;
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter: (entry) => {
      if (entry.name.endsWith("/") || entry.name.includes("__MACOSX"))
        return false;
      expanded += entry.originalSize;
      count++;
      if (expanded > 50 * 1024 * 1024 || count > 200) {
        throw new Error(
          "Use at most 200 files and 50 MB of uncompressed data.",
        );
      }
      return true;
    },
  });
  const entries = Object.entries(archive).filter(
    ([name]) =>
      !name.endsWith("/") &&
      !name.includes("__MACOSX") &&
      !name.split("/").some((part) => part.startsWith(".")),
  );
  if (!entries.length)
    throw new Error("This ZIP does not contain any project files.");
  if (
    entries.length > 200 ||
    entries.reduce((sum, [, data]) => sum + data.length, 0) > 50 * 1024 * 1024
  ) {
    throw new Error("Use at most 200 files and 50 MB of uncompressed data.");
  }
  const root =
    entries
      .find(
        ([name]) => name === "index.html" || name.endsWith("/index.html"),
      )?.[0]
      .replace(/index\.html$/, "") ?? "";
  const imported = entries.map(([name, data]) =>
    toSketchFile(name.startsWith(root) ? name.slice(root.length) : name, data),
  );
  if (
    imported.some((entry) => !validName(entry.name)) ||
    new Set(imported.map((entry) => entry.name)).size !== imported.length
  ) {
    throw new Error(
      "The archive contains an unsupported or duplicate file path.",
    );
  }
  const next = makeProject(
    templates.find((template) => template.id === "blank")!,
  );
  next.name =
    file.name
      .replace(/\.zip$/i, "")
      .trim()
      .slice(0, 80) || "Untitled project";
  next.template = "custom";
  next.files = imported;
  const metadata = imported.find(
    (entry) => entry.name === "canvas-project.json",
  );
  if (metadata) {
    try {
      const info = JSON.parse(metadata.content);
      if (typeof info.name === "string")
        next.name = info.name.trim().slice(0, 80) || next.name;
      if (templates.some((template) => template.id === info.template))
        next.template = info.template;
      if ([P5_LATEST, P5_LEGACY].includes(info.version))
        next.version = info.version;
      if (
        info.params &&
        ["hue", "density", "speed"].every((key) =>
          Number.isFinite(info.params[key]),
        )
      ) {
        next.params = {
          hue: Math.max(0, Math.min(360, info.params.hue)),
          density: Math.max(12, Math.min(120, info.params.density)),
          speed: Math.max(0, Math.min(100, info.params.speed)),
        };
      }
    } catch {}
  } else {
    const version = imported
      .find((entry) => entry.name === "index.html")
      ?.content.match(/p5@([\d.]+)\/lib\/p5/);
    if (version && [P5_LATEST, P5_LEGACY].includes(version[1]))
      next.version = version[1];
  }
  next.files = next.files.filter(
    (entry) => entry.name !== "canvas-project.json",
  );
  if (!next.files.some((entry) => entry.name === "index.html"))
    next.files.push({ name: "index.html", content: html(next.version) });
  if (!next.files.some((entry) => entry.name === "style.css"))
    next.files.push({ name: "style.css", content: css });
  return next;
}
