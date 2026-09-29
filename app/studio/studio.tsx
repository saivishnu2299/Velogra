"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  PlusIcon,
  SunIcon,
  MoonIcon,
  CodeIcon,
  FrameCornersIcon,
  DownloadSimpleIcon,
  FolderOpenIcon,
  FileJsIcon,
  FileHtmlIcon,
  FileCssIcon,
  FileIcon,
  DotsThreeIcon,
  BookOpenIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  CommandIcon,
  UploadSimpleIcon,
  ImageIcon,
  TrashIcon,
  TerminalIcon,
  PaletteIcon,
  KeyboardIcon,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { Toaster, toast } from "sonner";
import { strToU8, zipSync, unzipSync, strFromU8 } from "fflate";
import { CodeEditor } from "./editor";
import { VelograMark } from "./brand";
import {
  templates,
  makeProject,
  html,
  css,
  P5_LATEST,
  P5_LEGACY,
  type Template,
} from "./templates";
import { compileProject, prepareRuntime } from "./runtime";
import {
  readProjects,
  saveProject,
  validName,
  download,
  cloneProject,
  type Project,
  type SketchFile,
} from "./projects";

type Modal =
  | "gallery"
  | "projects"
  | "reference"
  | "settings"
  | "addfile"
  | "rename"
  | "library"
  | "commands"
  | null;
type Log = {
  kind: string;
  message: string;
  file?: string;
  line?: number;
  id: number;
};
function IconButton({
  label,
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`icon-button ${className}`}
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  );
}
function LabeledSlider(props: React.ComponentProps<typeof Slider>) {
  const host = useRef<HTMLDivElement>(null);
  const label = props["aria-label"];
  useEffect(() => {
    if (typeof label === "string")
      host.current
        ?.querySelector('[role="slider"]')
        ?.setAttribute("aria-label", label);
  }, [label]);
  return (
    <div ref={host}>
      <Slider {...props} />
    </div>
  );
}

function FileSymbol({ name }: { name: string }) {
  const Icon = name.endsWith(".js")
    ? FileJsIcon
    : name.endsWith(".html")
      ? FileHtmlIcon
      : name.endsWith(".css")
        ? FileCssIcon
        : FileIcon;
  return <Icon size={17} weight="regular" />;
}
function HelpRows({ category }: { category: string }) {
  const groups: Record<string, [string, string, string][]> = {
    basics: [
      ["setup()", "Runs once when your sketch starts.", "setup"],
      ["draw()", "Runs repeatedly. Put animation here.", "draw"],
      [
        "createCanvas(640, 640)",
        "Choose your canvas width and height.",
        "createCanvas",
      ],
      [
        "background(245)",
        "Paint the background. Try a color name or hex value.",
        "background",
      ],
      ["mouseX, mouseY", "Follow the position of your pointer.", "mouseX"],
    ],
    shapes: [
      ["circle(x, y, size)", "Draw a circle at a position.", "circle"],
      ["rect(x, y, width, height)", "Draw a rectangle.", "rect"],
      ['fill("#507f73")', "Set the color inside your shapes.", "fill"],
      ['stroke("#ffffff")', "Set the color of their outlines.", "stroke"],
      ['text("hello", x, y)', "Put words on the canvas.", "text"],
    ],
    motion: [
      ["random(0, 100)", "Pick a new number every time.", "random"],
      ["noise(x, y)", "Smooth variation for organic movement.", "noise"],
      ["sin(frameCount * 0.01)", "Make something sway or pulse.", "sin"],
      ["translate(x, y)", "Move the origin for your next shapes.", "translate"],
      [
        "createCanvas(640, 640, WEBGL)",
        "Explore 3D shapes and shaders.",
        "WEBGL",
      ],
    ],
    media: [
      [
        'loadImage("assets/photo.png")',
        "Load an image from your project.",
        "loadImage",
      ],
      ['loadFont("assets/font.ttf")', "Use a custom font.", "loadFont"],
      [
        "createCapture(VIDEO)",
        "Use a camera in a standalone sketch.",
        "createCapture",
      ],
      [
        'loadSound("assets/tone.mp3")',
        "Load audio with the p5.sound library.",
        "loadSound",
      ],
      [
        'loadJSON("assets/data.json")',
        "Bring data into your visualization.",
        "loadJSON",
      ],
    ],
  };
  return (
    <div className="reference-rows">
      {groups[category].map(([code, desc, url]) => (
        <a
          key={code}
          href={`https://p5js.org/reference/p5/${url}/`}
          target="_blank"
          rel="noreferrer"
        >
          <code>{code}</code>
          <span>{desc}</span>
          <BookOpenIcon size={16} />
        </a>
      ))}
    </div>
  );
}

export default function Studio() {
  const [project, setProject] = useState<Project | null>(null),
    [ready, setReady] = useState(false),
    [saved, setSaved] = useState("Saving…");
  const [dark, setDark] = useState(false),
    [active, setActive] = useState("sketch.js"),
    [modal, setModal] = useState<Modal>(null),
    [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [view, setView] = useState<"split" | "canvas" | "code">("split"),
    [mobile, setMobile] = useState(false),
    [autoRun, setAutoRun] = useState(false),
    [fontSize, setFontSize] = useState(14);
  const [source, setSource] = useState(""),
    [runState, setRunState] = useState<
      "loading" | "running" | "paused" | "stopped" | "error"
    >("stopped"),
    [logs, setLogs] = useState<Log[]>([]),
    [consoleOpen, setConsoleOpen] = useState(false);
  const [stats, setStats] = useState({ width: 640, height: 640, fps: 0 }),
    [cursor, setCursor] = useState([1, 1]),
    [controls, setControls] = useState(true),
    [fileName, setFileName] = useState(""),
    [fileError, setFileError] = useState(""),
    [deleteFile, setDeleteFile] = useState<string | null>(null),
    [libraryURL, setLibraryURL] = useState("");
  const iframe = useRef<HTMLIFrameElement>(null),
    upload = useRef<HTMLInputElement>(null),
    token = useRef(""),
    projectRef = useRef<Project | null>(null),
    logId = useRef(0),
    consoleEnd = useRef<HTMLDivElement>(null);
  const [lastRun, setLastRun] = useState("");
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const update = useCallback((fn: (p: Project) => Project) => {
    setSaved("Saving…");
    setProject((p) => (p ? { ...fn(p), updated: Date.now() } : p));
  }, []);
  const send = useCallback(
    (action: string, extra: object = {}) =>
      iframe.current?.contentWindow?.postMessage(
        { canvasStudio: token.current, action, ...extra },
        "*",
      ),
    [],
  );
  const run = useCallback(async () => {
    const p = projectRef.current;
    if (!p) return;
    try {
      token.current = crypto.randomUUID();
      setLastRun(JSON.stringify(p.files));
      setLogs([]);
      setStats((s) => ({ ...s, fps: 0 }));
      setRunState("loading");
      const runToken = token.current;
      await prepareRuntime(p);
      if (token.current !== runToken) return;
      setSource(compileProject(p, runToken));
    } catch (e) {
      setRunState("error");
      toast.error((e as Error).message);
    }
  }, []);
  const pause = () => {
    if (runState === "paused") {
      send("resume");
      setRunState("running");
    } else {
      send("pause");
      setRunState("paused");
    }
  };
  const stop = () => {
    token.current = crypto.randomUUID();
    setSource("");
    setRunState("stopped");
    setStats((s) => ({ ...s, fps: 0 }));
  };

  useEffect(() => {
    let alive = true;
    const mq = window.matchMedia("(max-width: 820px)");
    const size = () => {
      setMobile(mq.matches);
      setView(mq.matches ? "canvas" : "split");
    };
    queueMicrotask(size);
    mq.addEventListener("change", size);
    queueMicrotask(() => {
      try {
        setDark(localStorage.getItem("canvas-theme") === "dark");
        setAutoRun(localStorage.getItem("canvas-autorun") === "true");
      } catch {}
    });
    readProjects()
      .then((items) => {
        if (!alive) return;
        let current: string | null = null;
        try {
          current = localStorage.getItem("canvas-active");
        } catch {}
        setProject(
          items.find((p) => p.id === current) ?? items[0] ?? makeProject(),
        );
        setReady(true);
      })
      .catch(() => {
        if (alive) {
          setProject(makeProject());
          setReady(true);
          setSaved("Storage unavailable");
          toast.error(
            "Device storage is unavailable. Export your work to keep it.",
          );
        }
      });
    return () => {
      alive = false;
      mq.removeEventListener("change", size);
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    if (ready)
      try {
        localStorage.setItem("canvas-theme", dark ? "dark" : "light");
      } catch {}
  }, [dark, ready]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("canvas-autorun", String(autoRun));
      } catch {}
  }, [autoRun, ready]);
  useEffect(() => {
    if (!project || !ready) return;
    const timer = setTimeout(() => {
      saveProject(project)
        .then(() => {
          setSaved("Saved on this device");
          try {
            localStorage.setItem("canvas-active", project.id);
          } catch {}
        })
        .catch(() => {
          setSaved("Save failed");
          toast.error("Could not save on this device. Export a backup.");
        });
    }, 450);
    return () => clearTimeout(timer);
  }, [project, ready]);
  useEffect(() => {
    const persist = () => {
      if (document.visibilityState === "hidden" && projectRef.current)
        void saveProject(projectRef.current).catch(() => {});
    };
    document.addEventListener("visibilitychange", persist);
    return () => document.removeEventListener("visibilitychange", persist);
  }, []);
  const projectId = project?.id;
  useEffect(() => {
    if (ready && projectId) void run();
  }, [ready, projectId, run]);
  useEffect(() => {
    if (
      !autoRun ||
      !ready ||
      !project ||
      lastRun === JSON.stringify(project.files)
    )
      return;
    const timer = setTimeout(run, 800);
    return () => clearTimeout(timer);
  }, [project, autoRun, ready, run, lastRun]);
  const visualParams = project?.params;
  useEffect(() => {
    if (visualParams) send("params", { params: visualParams });
  }, [visualParams, send]);
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (
        e.source !== iframe.current?.contentWindow ||
        e.data?.canvasStudio !== token.current
      )
        return;
      const d = e.data;
      if (d.kind === "ready")
        setRunState((s) => (s === "error" ? s : "running"));
      else if (d.kind === "stats")
        setStats({
          width: Math.round(d.width),
          height: Math.round(d.height),
          fps: d.fps,
        });
      else if (d.kind === "snapshot") {
        fetch(d.message)
          .then((r) => r.blob())
          .then((b) =>
            download(b, `${projectRef.current?.name ?? "canvas"}.png`),
          );
        toast.success("Canvas captured");
      } else {
        setLogs((l) => [
          ...l.slice(-199),
          {
            kind: d.kind,
            message: String(d.message).slice(0, 10000),
            file: d.file,
            line: d.line,
            id: logId.current++,
          },
        ]);
        if (d.kind === "error") {
          setRunState("error");
          setConsoleOpen(true);
        }
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    consoleEnd.current?.scrollIntoView({ block: "nearest" });
  }, [logs]);
  useEffect(() => {
    if (runState !== "loading") return;
    const timer = setTimeout(() => {
      setRunState("error");
      setLogs((l) => [
        ...l,
        {
          kind: "error",
          message:
            "The sketch took too long to start. Check your code or library connection, then run again.",
          id: logId.current++,
        },
      ]);
      setConsoleOpen(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [runState]);

  const switchProject = async (next: Project) => {
    const current = projectRef.current;
    if (current)
      try {
        await saveProject(current);
      } catch {
        toast.error("Could not save the current sketch. Export it first.");
        return;
      }
    setSaved("Saving…");
    setProject(next);
    setActive(
      next.files.some((f) => f.name === "sketch.js")
        ? "sketch.js"
        : (next.files[0]?.name ?? "index.html"),
    );
    setModal(null);
    setControls(next.template !== "custom");
  };
  const newSketch = (template: Template) => {
    void switchProject(makeProject(template));
  };
  const openProjects = async () => {
    try {
      if (project) await saveProject(project);
      setSavedProjects(await readProjects());
      setModal("projects");
    } catch {
      toast.error("Could not read saved sketches.");
    }
  };
  const edit = (content: string) =>
    update((p) => ({
      ...p,
      files: p.files.map((f) => (f.name === active ? { ...f, content } : f)),
    }));
  const parameter = (key: keyof Project["params"], value: number) =>
    update((p) => ({ ...p, params: { ...p.params, [key]: value } }));
  const formatCode = useCallback(async () => {
    const p = projectRef.current,
      f = p?.files.find((f) => f.name === active);
    if (!f || f.binary) return;
    try {
      const prettier = await import("prettier/standalone");
      const babel = await import("prettier/plugins/babel");
      const estree = await import("prettier/plugins/estree");
      const htmlPlugin = await import("prettier/plugins/html");
      const postcss = await import("prettier/plugins/postcss");
      const content = await prettier.format(f.content, {
        parser: f.name.endsWith(".html")
          ? "html"
          : f.name.endsWith(".css")
            ? "css"
            : f.name.endsWith(".json")
              ? "json"
              : "babel",
        plugins: [
          babel.default,
          estree.default,
          htmlPlugin.default,
          postcss.default,
        ],
        tabWidth: 2,
      });
      update((p) => ({
        ...p,
        files: p.files.map((file) =>
          file.name === f.name ? { ...file, content } : file,
        ),
      }));
      toast.success("Code formatted");
    } catch (e) {
      toast.error(`Could not format: ${(e as Error).message.split("\n")[0]}`);
    }
  }, [active, update]);
  const exportHTML = () => {
    if (!project) return;
    try {
      download(
        new Blob([compileProject(project, "", true)], { type: "text/html" }),
        `${project.name}.html`,
      );
      toast.success("Standalone sketch exported");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const exportZIP = () => {
    if (!project) return;
    const files: Record<string, Uint8Array> = {};
    for (const f of project.files)
      files[f.name] = f.binary
        ? Uint8Array.from(atob(f.content.split(",")[1]), (c) => c.charCodeAt(0))
        : strToU8(f.content);
    if (files["index.html"])
      files["index.html"] = strToU8(
        project.files
          .find((f) => f.name === "index.html")!
          .content.replace(
            /<head([^>]*)>/i,
            `<head$1>\n<script>window.studio=${JSON.stringify(project.params)};</script>`,
          ),
      );
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
    download(
      new Blob([zipSync(files) as Uint8Array<ArrayBuffer>], {
        type: "application/zip",
      }),
      `${project.name}.zip`,
    );
    toast.success("Project exported");
  };
  const onImport = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      if (
        Array.from(files).reduce((sum, f) => sum + f.size, 0) >
        50 * 1024 * 1024
      )
        throw new Error("Choose files totaling less than 50 MB.");
      if (files.length === 1 && files[0].name.endsWith(".zip")) {
        let expanded = 0,
          count = 0;
        const archive = unzipSync(
          new Uint8Array(await files[0].arrayBuffer()),
          {
            filter: (file) => {
              if (file.name.endsWith("/") || file.name.includes("__MACOSX"))
                return false;
              expanded += file.originalSize;
              count++;
              if (expanded > 50 * 1024 * 1024 || count > 200)
                throw new Error(
                  "Use fewer than 200 files and 50 MB of uncompressed data.",
                );
              return true;
            },
          },
        );
        const entries = Object.entries(archive).filter(
          ([name]) =>
            !name.endsWith("/") &&
            !name.includes("__MACOSX") &&
            !name.split("/").some((p) => p.startsWith(".")),
        );
        if (
          entries.length > 200 ||
          entries.reduce((sum, [, data]) => sum + data.length, 0) >
            50 * 1024 * 1024
        )
          throw new Error(
            "This project is too large. Use fewer than 200 files and 50 MB.",
          );
        const root =
          entries
            .find(([name]) => name.endsWith("index.html"))?.[0]
            .replace(/index\.html$/, "") ?? "";
        const imported = entries.map(([name, data]) =>
          toSketchFile(
            name.startsWith(root) ? name.slice(root.length) : name,
            data,
          ),
        );
        if (imported.some((f) => !validName(f.name)))
          throw new Error("The archive contains an unsupported file path.");
        const next = makeProject(templates.find((t) => t.id === "blank")!);
        next.name = files[0].name.replace(/\.zip$/, "");
        next.template = "custom";
        next.files = imported;
        const metadata = imported.find((f) => f.name === "canvas-project.json");
        if (metadata)
          try {
            const info = JSON.parse(metadata.content);
            if (typeof info.name === "string")
              next.name = info.name.slice(0, 80);
            if (templates.some((t) => t.id === info.template))
              next.template = info.template;
            if ([P5_LATEST, P5_LEGACY].includes(info.version))
              next.version = info.version;
            if (
              info.params &&
              ["hue", "density", "speed"].every((key) =>
                Number.isFinite(info.params[key]),
              )
            )
              next.params = {
                hue: Math.max(0, Math.min(360, info.params.hue)),
                density: Math.max(12, Math.min(120, info.params.density)),
                speed: Math.max(0, Math.min(100, info.params.speed)),
              };
          } catch {}
        else {
          const version = imported
            .find((f) => f.name === "index.html")
            ?.content.match(/p5@([\d.]+)\/lib\/p5/);
          if (version && [P5_LATEST, P5_LEGACY].includes(version[1]))
            next.version = version[1];
        }
        next.files = next.files.filter((f) => f.name !== "canvas-project.json");
        if (!next.files.some((f) => f.name === "index.html"))
          next.files.push({ name: "index.html", content: html() });
        if (!next.files.some((f) => f.name === "style.css"))
          next.files.push({ name: "style.css", content: css });
        await switchProject(next);
        toast.success("Project imported");
      } else {
        const imports: SketchFile[] = [];
        for (const f of Array.from(files)) {
          const name = /\.(js|mjs|html|css|json|txt|svg)$/.test(f.name)
            ? f.name
            : `assets/${f.name}`;
          if (!validName(name)) throw new Error("Choose a valid file name.");
          if (project?.files.some((existing) => existing.name === name))
            throw new Error(
              `${name} already exists. Rename it before importing.`,
            );
          imports.push(
            toSketchFile(name, new Uint8Array(await f.arrayBuffer()), f.type),
          );
        }
        update((p) => ({ ...p, files: [...p.files, ...imports] }));
        setActive(imports[0].name);
        toast.success(
          `${imports.length} ${imports.length === 1 ? "file" : "files"} added`,
        );
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      if (upload.current) upload.current.value = "";
    }
  };
  function toSketchFile(name: string, data: Uint8Array, mime = ""): SketchFile {
    if (/\.(js|mjs|html|css|json|txt|csv|md|svg|vert|frag|glsl)$/i.test(name))
      return { name, content: strFromU8(data), mime };
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
    for (let i = 0; i < data.length; i += 8192)
      binary += String.fromCharCode(...data.subarray(i, i + 8192));
    const type =
      mime || types[name.split(".").pop() ?? ""] || "application/octet-stream";
    return {
      name,
      content: `data:${type};base64,${btoa(binary)}`,
      binary: true,
      mime: type,
    };
  }
  const addFile = () => {
    const name = fileName.trim();
    if (!validName(name)) {
      setFileError(
        "Use a relative file name, such as helpers.js or assets/data.json.",
      );
      return;
    }
    if (project?.files.some((f) => f.name === name)) {
      setFileError("A file with this name already exists.");
      return;
    }
    if (modal === "rename") {
      if (active === "index.html") {
        setFileError("Keep index.html as the project entry point.");
        return;
      }
      update((p) => ({
        ...p,
        files: p.files.map((f) => (f.name === active ? { ...f, name } : f)),
      }));
      toast.success(
        "File renamed. Update its references in index.html if needed.",
      );
    } else {
      update((p) => ({
        ...p,
        files: [
          ...p.files,
          {
            name,
            content: name.endsWith(".json")
              ? "{}\n"
              : name.endsWith(".js")
                ? "// Add your ideas here.\n"
                : "",
          },
        ],
      }));
      toast.success(
        name.endsWith(".js")
          ? "File created. Include it in index.html to run it."
          : "File created. Use its path in your sketch.",
      );
    }
    setActive(name);
    setModal(null);
  };
  const addLibrary = (url = libraryURL) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") throw new Error();
      const index = project?.files.find((f) => f.name === "index.html");
      if (!index) throw new Error();
      if (index.content.includes(parsed.href)) {
        toast("This library is already included.");
        return;
      }
      if (!/<\/head>/i.test(index.content)) {
        toast.error("Add a closing </head> tag to index.html first.");
        return;
      }
      const tag = `    <script src="${parsed.href.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"></script>\n`;
      update((p) => ({
        ...p,
        files: p.files.map((f) =>
          f.name === "index.html"
            ? {
                ...f,
                content: f.content.replace(/<\/head>/i, tag + "  </head>"),
              }
            : f,
        ),
      }));
      setModal(null);
      setActive("index.html");
      setTimeout(run, 0);
      toast.success("Library added to index.html");
    } catch {
      toast.error("Enter a valid HTTPS JavaScript library URL.");
    }
  };
  const changeVersion = (version: string) => {
    update((p) => ({
      ...p,
      version,
      files: p.files.map((f) =>
        f.name === "index.html"
          ? {
              ...f,
              content: f.content
                .replace(
                  /p5@[\d.]+\/lib\/p5(?:\.min)?\.js/g,
                  `p5@${version}/lib/p5.min.js`,
                )
                .replace(
                  /<script[^>]*src="[^"]*p5(?:@[^/]+\/lib\/addons|\.sound@[^/]+\/dist)\/p5\.sound(?:\.min)?\.js"[^>]*><\/script>\s*/g,
                  "",
                ),
            }
          : f,
      ),
    }));
    toast.success(
      `p5.js ${version} selected. Add matching sound libraries again if needed.`,
    );
    setTimeout(run, 0);
  };
  const duplicate = () => {
    if (project) void switchProject(cloneProject(project));
  };
  const actionNames = [
    "Run sketch",
    "Explore starter sketches",
    "Open saved sketches",
    "Format code",
    "Toggle light and dark mode",
    "Canvas focus",
    "Export HTML",
    "Export ZIP",
    "Add files",
    "Reference",
  ];
  const chooseAction = (name: string) => {
    setModal(null);
    switch (name) {
      case "Run sketch":
        void run();
        break;
      case "Explore starter sketches":
        setModal("gallery");
        break;
      case "Open saved sketches":
        void openProjects();
        break;
      case "Format code":
        void formatCode();
        break;
      case "Toggle light and dark mode":
        setDark((d) => !d);
        break;
      case "Canvas focus":
        setView((v) => (v === "canvas" ? "split" : "canvas"));
        break;
      case "Export HTML":
        exportHTML();
        break;
      case "Export ZIP":
        exportZIP();
        break;
      case "Add files":
        upload.current?.click();
        break;
      case "Reference":
        setModal("reference");
        break;
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !(e.metaKey || e.ctrlKey)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        run();
      } else if (e.key === "k") {
        e.preventDefault();
        setModal("commands");
      } else if (e.key === "s") {
        e.preventDefault();
        const p = projectRef.current;
        if (p)
          saveProject(p)
            .then(() => {
              setSaved("Saved on this device");
              toast.success("Sketch saved");
            })
            .catch(() => toast.error("Could not save. Export a backup."));
      } else if (e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        void formatCode();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [run, formatCode]);
  useEffect(() => {
    type Context = {
      registerTool: (
        t: {
          name: string;
          description: string;
          inputSchema: object;
          annotations: object;
          execute: (input: unknown) => unknown;
        },
        options: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const lifetime = new AbortController();
    const tool = {
      name: "read_canvas_project",
      description: "Read the active p5.js sketch files and visual settings.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input: unknown) => {
        if (!input || typeof input !== "object" || Object.keys(input).length)
          throw new Error("Expected an empty object.");
        const p = projectRef.current;
        return p
          ? {
              name: p.name,
              files: p.files.map((f) => ({
                name: f.name,
                content: f.binary ? "[binary asset]" : f.content,
              })),
              params: p.params,
            }
          : null;
      },
    };
    const editTool = {
      name: "stage_canvas_files",
      description:
        "Update existing text files in the active sketch. Changes appear in the code editor and are saved on this device. Run the sketch separately unless auto-run is enabled.",
      inputSchema: {
        type: "object",
        properties: {
          files: {
            type: "array",
            minItems: 1,
            maxItems: 50,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                content: { type: "string" },
              },
              required: ["name", "content"],
              additionalProperties: false,
            },
          },
        },
        required: ["files"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input: unknown) => {
        const value = input as { files?: { name: string; content: string }[] };
        if (
          !value ||
          typeof value !== "object" ||
          Object.keys(value).some((k) => k !== "files") ||
          !Array.isArray(value.files) ||
          !value.files.length ||
          value.files.length > 50
        )
          throw new Error("Provide between 1 and 50 text files.");
        const p = projectRef.current;
        if (!p) throw new Error("No active project.");
        const names = new Set<string>();
        for (const f of value.files) {
          if (
            !f ||
            typeof f.name !== "string" ||
            typeof f.content !== "string" ||
            f.content.length > 2000000 ||
            Object.keys(f).some((k) => k !== "name" && k !== "content") ||
            names.has(f.name) ||
            !p.files.some(
              (existing) => existing.name === f.name && !existing.binary,
            )
          )
            throw new Error(
              "Use unique existing text file names and content under 2 MB.",
            );
          names.add(f.name);
        }
        const changes = new Map(value.files.map((f) => [f.name, f.content]));
        update((current) => ({
          ...current,
          files: current.files.map((f) =>
            changes.has(f.name) ? { ...f, content: changes.get(f.name)! } : f,
          ),
        }));
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        return { stagedFiles: [...names], project: projectRef.current?.name };
      },
    };
    for (const registered of [tool, editTool])
      try {
        Promise.resolve(
          context.registerTool(registered, { signal: lifetime.signal }),
        ).catch(() => {});
      } catch {}
    return () => lifetime.abort();
  }, [update]);

  const supportsControls = project?.files.some(
    (f) =>
      !f.binary &&
      f.name.endsWith(".js") &&
      f.content.includes("window.studio"),
  );
  const hasMotion = !["brush", "blank", "sound"].includes(
    project?.template ?? "",
  );
  const file = project?.files.find((f) => f.name === active),
    currentTemplate = templates.find((t) => t.id === project?.template),
    errors = logs.filter((l) => l.kind === "error").length,
    dirty = project && lastRun !== JSON.stringify(project.files);
  const panelCode = (
    <section className="code-panel">
      <div className="panel-bar">
        <div className="file-tab">
          <FileSymbol name={active} />
          <span>{active}</span>
          {dirty && (
            <span className="unsynced" title="Changes waiting to run" />
          )}
        </div>
        <div className="mobile-file-picker">
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger aria-label="Active project file">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {project?.files.map((f) => (
                <SelectItem key={f.name} value={f.name}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="panel-tools">
          <span className="muted language">
            {active.endsWith(".js")
              ? "JavaScript"
              : active.endsWith(".html")
                ? "HTML"
                : active.endsWith(".css")
                  ? "CSS"
                  : "File"}
          </span>
          <IconButton
            label="Format code · ⌘⇧F"
            onClick={() => void formatCode()}
            disabled={!!file?.binary}
          >
            <SparkleIcon size={17} />
          </IconButton>
          <div className="mobile-project-tools">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="icon-button" aria-label="Project tools">
                  <DotsThreeIcon size={21} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setFileName("");
                    setFileError("");
                    setModal("addfile");
                  }}
                >
                  New file
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => upload.current?.click()}>
                  Upload files or import ZIP
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setModal("library")}>
                  Add a library
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setModal("settings")}>
                  Editor settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {file?.binary ? (
        <div className="asset-view">
          <FileIcon size={38} />
          <h3>{file.name}</h3>
          {file.mime?.startsWith("image/") && (
            <Image
              unoptimized
              src={file.content}
              alt={file.name}
              width={640}
              height={640}
            />
          )}
          <p>Use this asset in your sketch with its file path.</p>
          <code>{JSON.stringify(file.name)}</code>
        </div>
      ) : file ? (
        <CodeEditor
          fileKey={`${project?.id}:${active}`}
          name={active}
          value={file.content}
          dark={dark}
          onChange={edit}
          onCursor={(l, c) => setCursor([l, c])}
          onRun={run}
          fontSize={fontSize}
        />
      ) : (
        <div className="asset-view">
          <FileIcon size={32} />
          <p>Select a file to start editing.</p>
        </div>
      )}
      <div className="editor-bottom">
        <span>{file?.content.split("\n").length ?? 0} lines</span>
        <button onClick={() => setModal("reference")}>
          <BookOpenIcon size={14} /> A little help
        </button>
      </div>
    </section>
  );
  const panelCanvas = (
    <section className="preview-panel">
      <div className="panel-bar">
        <div className="canvas-title">
          <FrameCornersIcon size={18} />
          <span>Canvas</span>
          <span className={`run-label ${runState}`}>
            <i />
            {runState === "loading"
              ? "Starting"
              : runState === "error"
                ? "Check console"
                : runState.charAt(0).toUpperCase() + runState.slice(1)}
          </span>
        </div>
        <div className="panel-tools">
          <IconButton
            label={runState === "paused" ? "Resume sketch" : "Pause sketch"}
            onClick={pause}
            disabled={!["running", "paused"].includes(runState)}
          >
            {runState === "paused" ? (
              <PlayIcon size={17} />
            ) : (
              <PauseIcon size={17} />
            )}
          </IconButton>
          <IconButton
            label="Capture canvas as PNG"
            onClick={() => send("snapshot")}
            disabled={!source}
          >
            <ImageIcon size={17} />
          </IconButton>
          <IconButton
            label={view === "canvas" ? "Show editor" : "Focus on canvas"}
            onClick={() =>
              setView(
                view === "canvas" ? (mobile ? "code" : "split") : "canvas",
              )
            }
          >
            <FrameCornersIcon size={17} />
          </IconButton>
        </div>
      </div>
      <div className="preview-stage">
        {source ? (
          <iframe
            ref={iframe}
            title="Live p5.js sketch"
            className="sketch-frame"
            sandbox="allow-scripts allow-downloads allow-modals allow-forms allow-pointer-lock allow-presentation"
            allow="fullscreen; autoplay; camera; microphone"
            srcDoc={source}
          />
        ) : (
          <div className="stopped-canvas">
            <FrameCornersIcon size={40} weight="light" />
            <h3>A little space to begin.</h3>
            <p>Run your sketch to bring the canvas to life.</p>
            <button className="primary-button" onClick={run}>
              <PlayIcon size={15} weight="fill" /> Run sketch
            </button>
          </div>
        )}
      </div>
      <div className="canvas-info">
        <span>
          {stats.width} × {stats.height}
        </span>
        <span>
          {["running", "paused"].includes(runState)
            ? `${runState === "paused" ? 0 : stats.fps} fps`
            : "p5.js"}
        </span>
      </div>
      {currentTemplate && supportsControls && (
        <div className="creative-controls">
          <button
            className="controls-heading"
            onClick={() => setControls(!controls)}
            aria-expanded={controls}
          >
            <span>
              <SlidersHorizontalIcon size={17} /> Make it yours
            </span>
            <span>
              {controls ? <CaretDownIcon size={14} /> : <PlusIcon size={14} />}
            </span>
          </button>
          {controls && (
            <>
              <div
                className={`control-grid ${hasMotion ? "" : "two-controls"}`}
              >
                <div className="control">
                  <label>
                    Color{" "}
                    <span
                      style={{
                        background: `hsl(${project?.params.hue} 35% 65%)`,
                      }}
                      className="color-dot"
                    />
                  </label>
                  <LabeledSlider
                    aria-label="Color hue"
                    min={0}
                    max={360}
                    step={1}
                    value={[project?.params.hue ?? 165]}
                    onValueChange={(v) => parameter("hue", v[0])}
                  />
                </div>
                <div className="control">
                  <label>
                    {project?.template === "brush"
                      ? "Brush size"
                      : project?.template === "blank"
                        ? "Size"
                        : "Detail"}{" "}
                    <span>{project?.params.density}</span>
                  </label>
                  <LabeledSlider
                    aria-label="Detail"
                    min={12}
                    max={120}
                    step={1}
                    value={[project?.params.density ?? 72]}
                    onValueChange={(v) => parameter("density", v[0])}
                  />
                </div>
                {hasMotion && (
                  <div className="control">
                    <label>
                      Motion{" "}
                      <span>
                        {project?.params.speed === 0
                          ? "Still"
                          : project?.params.speed}
                      </span>
                    </label>
                    <LabeledSlider
                      aria-label="Motion speed"
                      min={0}
                      max={100}
                      step={1}
                      value={[project?.params.speed ?? 35]}
                      onValueChange={(v) => parameter("speed", v[0])}
                    />
                  </div>
                )}
              </div>
              <p className="canvas-tip">{currentTemplate.tip}</p>
            </>
          )}
        </div>
      )}
      <div className="console-bar">
        <button
          onClick={() => setConsoleOpen(!consoleOpen)}
          aria-expanded={consoleOpen}
        >
          <TerminalIcon size={15} /> Console{" "}
          {errors > 0 && <span className="error-count">{errors}</span>}
          <CaretDownIcon
            size={12}
            style={{ transform: consoleOpen ? "rotate(180deg)" : "" }}
          />
        </button>
        <span>
          {dirty
            ? "Code changed. Run to update."
            : logs.length
              ? `${logs.length} messages`
              : "No messages"}
        </span>
        {consoleOpen && (
          <IconButton label="Clear console" onClick={() => setLogs([])}>
            <TrashIcon size={15} />
          </IconButton>
        )}
      </div>
      {consoleOpen && (
        <div className="console-output" role="log" aria-label="Sketch console">
          {logs.length === 0 ? (
            <p>Messages from your sketch will appear here.</p>
          ) : (
            logs.map((log) => (
              <div className={`console-line ${log.kind}`} key={log.id}>
                <span>{log.kind}</span>
                <code>
                  {log.message}
                  {log.file && (
                    <small>
                      {log.file.split("/").pop()}:{log.line}
                    </small>
                  )}
                </code>
              </div>
            ))
          )}
          <div ref={consoleEnd} />
        </div>
      )}
    </section>
  );

  return (
    <TooltipProvider delayDuration={350}>
      <main
        className={`studio ${dark ? "dark" : ""} ${view === "canvas" && !mobile ? "focus-canvas" : ""}`}
      >
        <header className="topbar">
          <div className="brand">
            <VelograMark className="brand-mark" />
            <strong>velogra</strong>
            <span className="brand-meta">creative coding studio</span>
          </div>
          <nav className="main-nav">
            <button className="nav-button" onClick={() => setModal("gallery")}>
              Explore
            </button>
            <button
              className="nav-button"
              onClick={() => setModal("reference")}
            >
              Reference
            </button>
          </nav>
          <div className="top-actions">
            <IconButton
              label="Open command menu · ⌘K"
              onClick={() => setModal("commands")}
              className="desktop-command"
            >
              <CommandIcon size={18} />
            </IconButton>
            <IconButton
              label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <SunIcon size={19} /> : <MoonIcon size={19} />}
            </IconButton>
            <div className="toolbar-divider" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="export-button">
                  <DownloadSimpleIcon size={16} />
                  <span>Export</span>
                  <CaretDownIcon size={11} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={exportHTML}>
                  Standalone HTML
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportZIP}>
                  Project ZIP
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => send("snapshot")}
                  disabled={!source}
                >
                  Canvas PNG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              className="run primary-button"
              onClick={run}
              disabled={!ready}
            >
              <PlayIcon size={14} weight="fill" />
              <span>Run</span>
              <kbd>⌘ ↵</kbd>
            </button>
            <IconButton
              label="Stop sketch"
              onClick={stop}
              disabled={!source}
              className="stop-button"
            >
              <StopIcon size={16} weight="fill" />
            </IconButton>
          </div>
        </header>
        <div className="mobile-bar">
          <button onClick={() => void openProjects()}>
            <FolderOpenIcon size={17} />
            {project?.name ?? "Your sketch"}
          </button>
          <Tabs
            value={view === "code" ? "code" : "canvas"}
            onValueChange={(v) => setView(v as "code" | "canvas")}
          >
            <TabsList>
              <TabsTrigger value="canvas">Canvas</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="studio-body">
          <SidebarProvider
            className="workspace-provider"
            style={{ "--sidebar-width": "210px" } as React.CSSProperties}
          >
            <Sidebar collapsible="none" className="rail">
              <SidebarContent>
                <SidebarGroup className="rail-header">
                  <div className="section-label">
                    WORKSPACE
                    <IconButton
                      label="New sketch"
                      onClick={() => setModal("gallery")}
                    >
                      <PlusIcon size={16} />
                    </IconButton>
                  </div>
                  <input
                    className="project-title"
                    aria-label="Sketch name"
                    value={project?.name ?? ""}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        name: e.target.value.slice(0, 80),
                      }))
                    }
                    onBlur={() => {
                      if (!project?.name.trim())
                        update((p) => ({ ...p, name: "Untitled sketch" }));
                    }}
                  />
                  <div className="save-note">
                    <CheckIcon size={12} />
                    {saved}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="project-menu">
                        Sketch options <CaretDownIcon size={12} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => void openProjects()}>
                        Open saved sketch
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => duplicate()}>
                        Duplicate sketch
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setModal("settings")}>
                        Editor settings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarGroup>
                <SidebarGroup className="file-group">
                  <div className="section-label">
                    FILES
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="icon-button"
                          aria-label="Add project files"
                        >
                          <PlusIcon size={15} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onSelect={() => {
                            setFileName("");
                            setFileError("");
                            setModal("addfile");
                          }}
                        >
                          New file
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => upload.current?.click()}
                        >
                          Upload files or import ZIP
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <SidebarMenu>
                    {project?.files.map((f) => (
                      <SidebarMenuItem key={f.name} className="file-row">
                        <SidebarMenuButton
                          className="file"
                          isActive={f.name === active}
                          onClick={() => {
                            setActive(f.name);
                            if (mobile) setView("code");
                          }}
                        >
                          <FileSymbol name={f.name} />
                          <span>{f.name}</span>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="file-more"
                              aria-label={`Options for ${f.name}`}
                              onClick={() => setActive(f.name)}
                            >
                              <DotsThreeIcon size={18} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              disabled={f.name === "index.html"}
                              onSelect={() => {
                                setFileName(f.name);
                                setFileError("");
                                setModal("rename");
                              }}
                            >
                              Rename file
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={f.name === "index.html"}
                              variant="destructive"
                              onSelect={() => setDeleteFile(f.name)}
                            >
                              Delete file
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                  <button
                    className="subtle-button add-library"
                    onClick={() => {
                      setLibraryURL("");
                      setModal("library");
                    }}
                  >
                    <PlusIcon size={14} /> Add a library
                  </button>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter className="rail-footer">
                <button
                  className="explore-tile"
                  onClick={() => setModal("gallery")}
                >
                  <PaletteIcon size={22} weight="light" />
                  <span>
                    A starting point
                    <small>Find a sketch to make your own.</small>
                  </span>
                  <CaretRightIcon size={13} />
                </button>
                <button
                  className="subtle-button"
                  onClick={() => setModal("settings")}
                >
                  <SlidersHorizontalIcon size={16} /> Editor settings
                </button>
                <a
                  className="p5-credit"
                  href="https://p5js.org/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Made possible by p5.js
                </a>
              </SidebarFooter>
            </Sidebar>
            <div className={`main-panels layout-${view}`}>
              <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel
                  className="code-resizable"
                  defaultSize="46%"
                  minSize="25%"
                >
                  {panelCode}
                </ResizablePanel>
                <ResizableHandle className="panel-divider" />
                <ResizablePanel
                  className="preview-resizable"
                  defaultSize="54%"
                  minSize="30%"
                >
                  {panelCanvas}
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </SidebarProvider>
        </div>
        <footer className="statusbar">
          <div>
            <span className="p5-label">
              p5.js {project?.version ?? P5_LATEST}
            </span>
            <span className="status-separator" />
            <button onClick={() => setModal("settings")}>
              Auto-run <span>{autoRun ? "on" : "off"}</span>
            </button>
          </div>
          <div>
            <span className="cursor-position">
              Ln {cursor[0]}, Col {cursor[1]}
            </span>
            <span className="status-separator" />
            <button
              className="view-button"
              onClick={() =>
                setView(
                  view === "canvas" ? (mobile ? "code" : "split") : "canvas",
                )
              }
            >
              <CodeIcon size={14} />
              {view === "canvas" ? "Show code" : "Canvas focus"}
            </button>
            <IconButton
              label="Keyboard shortcuts and getting started"
              onClick={() => setModal("reference")}
            >
              <KeyboardIcon size={15} />
            </IconButton>
          </div>
        </footer>
        <input
          ref={upload}
          type="file"
          multiple
          className="sr-only"
          aria-label="Upload project files"
          accept="*/*"
          onChange={(e) => void onImport(e.target.files)}
        />
        <Dialog
          open={modal !== null}
          onOpenChange={(open) => {
            if (!open) setModal(null);
          }}
        >
          <DialogContent
            className={`studio-dialog ${modal === "gallery" ? "gallery-dialog" : ""} ${modal === "commands" ? "command-dialog" : ""}`}
          >
            <DialogHeader>
              <DialogTitle>
                {
                  (
                    {
                      gallery: "Start with a spark.",
                      projects: "Your sketches",
                      reference: "A little help goes a long way.",
                      settings: "Your studio, your way.",
                      addfile: "Add a file",
                      rename: "Rename file",
                      library: "More possibilities.",
                      commands: "What would you like to do?",
                    } as Record<string, string>
                  )[modal ?? ""]
                }
              </DialogTitle>
              <DialogDescription>
                {
                  (
                    {
                      gallery:
                        "Pick an idea, change a few things, and see where it takes you.",
                      projects:
                        "Your sketches are saved in this browser, on this device.",
                      reference:
                        "You don’t need to know everything. Start with one small change.",
                      settings: "Make room for the way you like to create.",
                      addfile:
                        "JavaScript, CSS, data, shaders. Give your file a name.",
                      rename:
                        "Update references to this file in your sketch after renaming.",
                      library:
                        "Add sound or any browser-compatible JavaScript library.",
                      commands:
                        "Search actions or use the shortcuts you already know.",
                    } as Record<string, string>
                  )[modal ?? ""]
                }
              </DialogDescription>
            </DialogHeader>
            {modal === "gallery" && (
              <div className="gallery-grid">
                {templates.map((t) => (
                  <button
                    className="template-card"
                    key={t.id}
                    onClick={() => newSketch(t)}
                  >
                    <TemplatePreview template={t} />
                    <div className="template-copy">
                      <span className="template-category">{t.category}</span>
                      <h3>{t.name}</h3>
                      <p>{t.description}</p>
                      <span className="template-use">
                        Make it yours <PlusIcon size={15} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {modal === "projects" && (
              <div className="saved-list">
                {savedProjects.length === 0 ? (
                  <p>
                    No saved sketches yet. Start a sketch to make this space
                    yours.
                  </p>
                ) : (
                  savedProjects.map((p) => (
                    <button key={p.id} onClick={() => void switchProject(p)}>
                      <FolderOpenIcon size={22} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.files.length} files ·{" "}
                          {new Date(p.updated).toLocaleDateString()}
                        </small>
                      </span>
                      {p.id === project?.id && <CheckIcon size={18} />}
                    </button>
                  ))
                )}
              </div>
            )}
            {modal === "reference" && (
              <>
                <Tabs defaultValue="basics">
                  <TabsList className="reference-tabs">
                    <TabsTrigger value="basics">First steps</TabsTrigger>
                    <TabsTrigger value="shapes">Shapes</TabsTrigger>
                    <TabsTrigger value="motion">Motion & 3D</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                  </TabsList>
                  {["basics", "shapes", "motion", "media"].map((category) => (
                    <TabsContent value={category} key={category}>
                      <HelpRows category={category} />
                    </TabsContent>
                  ))}
                </Tabs>
                <div className="help-note">
                  <p>
                    Each example is yours to change. Edit <code>sketch.js</code>
                    , then press <kbd>⌘ Enter</kbd> to run it. Use{" "}
                    <kbd>⌘ K</kbd> for commands and <kbd>⌘ S</kbd> to save.
                  </p>
                  <p>
                    Upload images, fonts, audio, or data from the Files menu.
                    Add libraries and edit <code>index.html</code> for more
                    possibilities. Camera and microphone sketches need a
                    standalone browser tab; export HTML to use them.
                  </p>
                  <a
                    href="https://p5js.org/tutorials/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explore p5.js tutorials
                  </a>
                </div>
              </>
            )}
            {modal === "settings" && (
              <div className="settings-list">
                <label>
                  <span>
                    Auto-run
                    <small>Update the canvas after you finish typing.</small>
                  </span>
                  <Switch
                    aria-label="Auto-run sketches"
                    checked={autoRun}
                    onCheckedChange={setAutoRun}
                  />
                </label>
                <label>
                  <span>
                    Dark mode<small>A quieter studio after dark.</small>
                  </span>
                  <Switch
                    aria-label="Dark mode"
                    checked={dark}
                    onCheckedChange={setDark}
                  />
                </label>
                <label>
                  <span>
                    Code size<small>Make your code comfortable to read.</small>
                  </span>
                  <Select
                    value={String(fontSize)}
                    onValueChange={(v) => setFontSize(Number(v))}
                  >
                    <SelectTrigger aria-label="Editor font size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[12, 14, 16, 18, 20].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} px
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label>
                  <span>
                    p5.js version
                    <small>2.x for new work, 1.x for older sketches.</small>
                  </span>
                  <Select
                    value={project?.version ?? P5_LATEST}
                    onValueChange={changeVersion}
                  >
                    <SelectTrigger aria-label="p5.js version">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={P5_LATEST}>2.3.4</SelectItem>
                      <SelectItem value={P5_LEGACY}>1.11.11</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <button
                  className="outline-button"
                  onClick={() => upload.current?.click()}
                >
                  <UploadSimpleIcon size={17} /> Import files or a project ZIP
                </button>
              </div>
            )}
            {(modal === "addfile" || modal === "rename") && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addFile();
                }}
                className="file-form"
              >
                <label htmlFor="filename">File name</label>
                <input
                  id="filename"
                  autoFocus
                  value={fileName}
                  placeholder="helpers.js"
                  onChange={(e) => {
                    setFileName(e.target.value);
                    setFileError("");
                  }}
                />
                {fileError && (
                  <p className="form-error" role="alert">
                    {fileError}
                  </p>
                )}
                <button className="primary-button" type="submit">
                  {modal === "rename" ? "Rename" : "Create file"}
                </button>
              </form>
            )}
            {modal === "library" && (
              <div className="library-panel">
                <button
                  className="library-preset"
                  onClick={() =>
                    addLibrary(
                      project?.version === P5_LEGACY
                        ? `https://cdn.jsdelivr.net/npm/p5@${P5_LEGACY}/lib/addons/p5.sound.min.js`
                        : "https://cdn.jsdelivr.net/npm/p5.sound@0.4.1/dist/p5.sound.min.js",
                    )
                  }
                >
                  <span>
                    <strong>p5.sound</strong>
                    <small>Audio, synthesis, and sound analysis.</small>
                  </span>
                  <PlusIcon size={18} />
                </button>
                <form
                  className="file-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addLibrary();
                  }}
                >
                  <label htmlFor="library-url">JavaScript library URL</label>
                  <input
                    id="library-url"
                    type="url"
                    placeholder="https://…/library.min.js"
                    value={libraryURL}
                    onChange={(e) => setLibraryURL(e.target.value)}
                    required
                  />
                  <p>
                    Adds a script to index.html, after p5.js. For module
                    libraries, edit your HTML directly.
                  </p>
                  <button className="primary-button" type="submit">
                    Add library
                  </button>
                </form>
              </div>
            )}
            {modal === "commands" && (
              <Command>
                <CommandInput placeholder="Search an action…" />
                <CommandList>
                  <CommandEmpty>No matching actions.</CommandEmpty>
                  <CommandGroup>
                    {actionNames.map((name) => (
                      <CommandItem
                        key={name}
                        onSelect={() => chooseAction(name)}
                      >
                        {name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </DialogContent>
        </Dialog>
        <AlertDialog
          open={!!deleteFile}
          onOpenChange={(open) => {
            if (!open) setDeleteFile(null);
          }}
        >
          <AlertDialogContent className="studio-dialog">
            <AlertDialogTitle>Delete {deleteFile}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the file from this sketch. Export a backup first if
              you want to keep it.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep file</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  update((p) => ({
                    ...p,
                    files: p.files.filter((f) => f.name !== deleteFile),
                  }));
                  setActive("sketch.js");
                  setDeleteFile(null);
                }}
              >
                Delete file
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Toaster
          position="bottom-right"
          theme={dark ? "dark" : "light"}
          richColors
        />
      </main>
    </TooltipProvider>
  );
}

function TemplatePreview({ template }: { template: Template }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const p = makeProject(template);
    p.params.speed = 0;
    p.params.density = 40;
    if (template.sound)
      p.files = p.files.map((f) =>
        f.name === "sketch.js"
          ? {
              ...f,
              content: f.content.replace(
                "oscillator = new p5.Oscillator('sine');",
                "oscillator = {amp(){},start(){},freq(){}};",
              ),
            }
          : f,
      );
    p.files = p.files.map((f) =>
      f.name === "sketch.js"
        ? {
            ...f,
            content:
              (template.id === "blank"
                ? f.content.replace(
                    "circle(mouseX, mouseY, density)",
                    "circle(width / 2, height / 2, density)",
                  )
                : template.id === "brush"
                  ? f.content
                      .replace(
                        "if (mouseIsPressed && mouseX >= 0 && mouseX <= width)",
                        "if (true)",
                      )
                      .replace(
                        "line(pmouseX, pmouseY, mouseX, mouseY)",
                        "line(160 + frameCount * 6, 320 + sin(frameCount * 0.25) * 80, 166 + frameCount * 6, 320 + sin((frameCount + 1) * 0.25) * 80)",
                      )
                  : f.content) +
              '\nsetTimeout(() => { if(typeof noLoop === "function") noLoop(); }, 400);',
          }
        : f,
    );
    let alive = true;
    prepareRuntime(p)
      .then(() => {
        if (alive) setSrc(compileProject(p, "gallery-" + template.id));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [template]);
  return (
    <div
      className="template-preview"
      style={{ borderBottomColor: template.color }}
    >
      {src && (
        <iframe
          title={`${template.name} preview`}
          sandbox="allow-scripts"
          srcDoc={src}
          tabIndex={-1}
          loading="lazy"
        />
      )}
      <div className="template-overlay" />
    </div>
  );
}
