"use client";

import Image from "next/image";
import Link from "next/link";
import { registerProjectNavigationGuard } from "./navigation-guard";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  KeyboardIcon,
  ArrowCounterClockwiseIcon,
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
import {
  exportProjectZIP,
  importProjectZIP,
  toSketchFile,
} from "./project-archive";
import { CodeEditor } from "./editor";
import { VelograMark } from "./brand";
import { StarterGallery } from "./starter-gallery";
import { ToolkitPanel } from "./toolkit-panel";
import { editDependency, switchP5Version } from "./toolkit";
import { acceptThumbnail, sourceRevision } from "./thumbnails";
import {
  templates,
  makeProject,
  P5_LATEST,
  P5_LEGACY,
  type Template,
} from "./templates";
import { compileProject, prepareRuntime } from "./runtime";
import {
  readProject,
  saveProject,
  validName,
  download,
  cloneProject,
  DEFAULT_PARAMS,
  type Project,
  type SketchFile,
} from "./projects";

type Modal =
  | "gallery"
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

export default function Studio({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loadError, setLoadError] = useState<"missing" | "storage" | null>(
    null,
  );
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const navigating = useRef(false);
  const mounted = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedProject = useRef<Project | null>(null);
  const [project, setProject] = useState<Project | null>(null),
    [ready, setReady] = useState(false),
    [saved, setSaved] = useState("Saving…");
  const [dark, setDark] = useState(false),
    [active, setActive] = useState("sketch.js"),
    [modal, setModalState] = useState<Modal>(null);
  const modalTrigger = useRef<HTMLElement | null>(null);
  const setModal = useCallback((next: Modal) => {
    if (next && document.activeElement instanceof HTMLElement)
      modalTrigger.current = document.activeElement;
    setModalState(next);
  }, []);
  const [view, setView] = useState<"split" | "canvas" | "code">("canvas"),
    [mobile, setMobile] = useState(false),
    [autoRun, setAutoRun] = useState(false),
    [fontSize, setFontSize] = useState(14),
    [reduceMotion, setReduceMotion] = useState(false);
  const [source, setSource] = useState(""),
    [runState, setRunState] = useState<
      "loading" | "running" | "paused" | "stopped" | "error"
    >("stopped"),
    [logs, setLogs] = useState<Log[]>([]),
    [consoleOpen, setConsoleOpen] = useState(false);
  const [stats, setStats] = useState({ width: 640, height: 640, fps: 0 }),
    [cursor, setCursor] = useState([1, 1]),
    [controls, setControls] = useState(false),
    [filesOpen, setFilesOpen] = useState(false),
    [fileName, setFileName] = useState(""),
    [fileError, setFileError] = useState(""),
    [deleteFile, setDeleteFile] = useState<string | null>(null);
  const iframe = useRef<HTMLIFrameElement>(null),
    upload = useRef<HTMLInputElement>(null),
    token = useRef(""),
    projectRef = useRef<Project | null>(null),
    logId = useRef(0),
    consoleEnd = useRef<HTMLDivElement>(null);
  const runFiles = useRef("");
  const canvasBounds = useRef<DOMRect | null>(null);
  const canvasMotion = useRef<Animation | null>(null);
  const changeView = (
    next:
      | "split"
      | "canvas"
      | "code"
      | ((current: "split" | "canvas" | "code") => "split" | "canvas" | "code"),
  ) => {
    canvasBounds.current = iframe.current?.getBoundingClientRect() ?? null;
    canvasMotion.current?.cancel();
    setView(next);
  };
  useLayoutEffect(() => {
    const before = canvasBounds.current;
    canvasBounds.current = null;
    const frame = iframe.current;
    if (
      !frame ||
      !before ||
      !before.width ||
      reduceMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const after = frame.getBoundingClientRect();
    if (!after.width || !after.height) return;
    canvasMotion.current = frame.animate(
      [
        {
          transform: `translate(${before.x - after.x}px, ${before.y - after.y}px) scale(${before.width / after.width}, ${before.height / after.height})`,
          transformOrigin: "0 0",
        },
        { transform: "translate(0, 0) scale(1)", transformOrigin: "0 0" },
      ],
      { duration: 360, easing: "cubic-bezier(0.16,1,0.3,1)" },
    );
    return () => canvasMotion.current?.cancel();
  }, [view, reduceMotion]);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
    return () => document.documentElement.classList.remove("reduce-motion");
  }, [reduceMotion]);
  const [lastRun, setLastRun] = useState("");
  useLayoutEffect(() => {
    projectRef.current = project;
  }, [project]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      token.current = "";
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // Browser Back also flushes the latest edit before the library reads.
      if (projectRef.current && !navigating.current)
        void saveProject(projectRef.current).catch(() => {});
    };
  }, []);
  const persistProject = useCallback(async (snapshot: Project) => {
    try {
      await saveProject(snapshot);
      if (mounted.current && projectRef.current?.id === snapshot.id)
        committedProject.current = snapshot;
      if (mounted.current && projectRef.current === snapshot) {
        setSaved("Saved on this device");
        try {
          localStorage.setItem("canvas-active", snapshot.id);
        } catch {}
      }
    } catch (error) {
      if (mounted.current && projectRef.current === snapshot)
        setSaved("Save failed");
      throw error;
    }
  }, []);

  const update = useCallback((fn: (p: Project) => Project) => {
    if (navigating.current) return;
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
      runFiles.current = JSON.stringify(p.files);
      setLogs([]);
      setStats((s) => ({ ...s, fps: 0 }));
      setRunState("loading");
      const runToken = token.current;
      await prepareRuntime(p);
      if (token.current !== runToken) return;
      setSource(compileProject(p, runToken));
    } catch (e) {
      if (!mounted.current) return;
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
      setView((v) => (mq.matches && v === "split" ? "code" : v));
    };
    queueMicrotask(size);
    mq.addEventListener("change", size);
    queueMicrotask(() => {
      try {
        setDark(localStorage.getItem("canvas-theme") === "dark");
        setAutoRun(localStorage.getItem("canvas-autorun") === "true");
        setReduceMotion(
          localStorage.getItem("velogra-reduce-motion") === "true",
        );
      } catch {}
    });
    readProject(projectId)
      .then((item) => {
        if (!alive) return;
        if (!item) {
          setLoadError("missing");
          return;
        }
        setProject(item);
        committedProject.current = item;
        setActive(
          item.files.some((file) => file.name === "sketch.js")
            ? "sketch.js"
            : (item.files[0]?.name ?? "index.html"),
        );
        setControls(false);
        setReady(true);
      })
      .catch(() => {
        if (alive) setLoadError("storage");
      });
    return () => {
      alive = false;
      mq.removeEventListener("change", size);
    };
  }, [projectId, loadAttempt]);
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
    if (!project || !ready || navigating.current) return;
    const timer = setTimeout(() => {
      void persistProject(project).catch(() => {
        if (mounted.current && projectRef.current === project)
          toast.error("Could not save on this device. Export a backup.");
      });
    }, 450);
    saveTimer.current = timer;
    return () => {
      clearTimeout(timer);
      if (saveTimer.current === timer) saveTimer.current = null;
    };
  }, [project, ready, persistProject]);
  useEffect(() => {
    const persist = () => {
      if (
        document.visibilityState === "hidden" &&
        projectRef.current &&
        !navigating.current
      )
        void persistProject(projectRef.current).catch(() => {});
    };
    document.addEventListener("visibilitychange", persist);
    return () => document.removeEventListener("visibilitychange", persist);
  }, [persistProject]);
  useEffect(() => {
    const protectUnsaved = (event: BeforeUnloadEvent) => {
      const current = projectRef.current;
      if (!current || current === committedProject.current) return;
      // Cross-document Back/reload cannot wait for IndexedDB, unlike app navigation.
      void persistProject(current).catch(() => {});
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectUnsaved);
    return () => window.removeEventListener("beforeunload", protectUnsaved);
  }, [persistProject]);
  const loadedProjectId = project?.id;
  useEffect(() => {
    if (ready && loadedProjectId) void run();
  }, [ready, loadedProjectId, run]);
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
      else if (d.kind === "thumbnail") {
        if (
          navigating.current ||
          JSON.stringify(projectRef.current?.files) !== runFiles.current
        )
          return;
        setProject((current) =>
          current ? acceptThumbnail(current, d.revision, d.message) : current,
        );
      } else if (d.kind === "snapshot") {
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
    if (!["running", "paused"].includes(runState)) return;
    const timer = setTimeout(() => {
      const current = projectRef.current;
      if (current && JSON.stringify(current.files) === runFiles.current)
        send("thumbnail", { revision: sourceRevision(current) });
    }, 700);
    return () => clearTimeout(timer);
  }, [runState, visualParams, lastRun, send, projectId]);
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

  const navigate = async (next: Project | null): Promise<boolean> => {
    if (navigating.current) return false;
    navigating.current = true;
    setLeaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      const current = projectRef.current;
      if (current) await persistProject(current);
      if (next) await saveProject(next);
      if (!mounted.current) return false;
      router.push(next ? `/studio/${encodeURIComponent(next.id)}` : "/");
      return true;
    } catch {
      navigating.current = false;
      if (mounted.current) {
        setLeaving(false);
        toast.error(
          "Could not save this project. Your studio remains open; export a backup or try again.",
        );
      }
      return false;
    }
  };
  const switchProject = (next: Project) => navigate(next);
  const newSketch = (template: Template) => {
    void switchProject(makeProject(template));
  };
  const openProjects = () => navigate(null);
  useEffect(() => {
    // The route can mount before the router commits its URL to history.
    const studioPath = `/studio/${encodeURIComponent(projectId)}`;
    const studioURL = new URL(studioPath, window.location.origin).href;
    let studioHistory = window.history.state;
    const frame = requestAnimationFrame(() => {
      if (window.location.pathname === studioPath)
        studioHistory = window.history.state;
    });
    const back = (event: PopStateEvent) => {
      const destination =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      if (
        !projectRef.current ||
        window.location.href === studioURL ||
        (window.location.pathname !== "/" &&
          !window.location.pathname.startsWith("/studio/"))
      )
        return;
      // Keep the editor mounted until its final save succeeds, including Back.
      event.stopImmediatePropagation();
      // Bypass the router's patched method: it must not render the destination
      // until the save below commits, or discard the editor on a failed save.
      History.prototype.replaceState.call(
        window.history,
        studioHistory,
        "",
        studioURL,
      );
      if (navigating.current) return;
      navigating.current = true;
      setLeaving(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void persistProject(projectRef.current)
        .then(() => {
          if (mounted.current) router.replace(destination);
        })
        .catch(() => {
          navigating.current = false;
          if (mounted.current) {
            setLeaving(false);
            toast.error(
              "Could not save this project. Your studio remains open; export a backup or try again.",
            );
          }
        });
    };
    const unregister = registerProjectNavigationGuard(back);
    return () => {
      cancelAnimationFrame(frame);
      unregister();
    };
  }, [persistProject, projectId, router]);
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
    try {
      exportProjectZIP(project);
      toast.success("Project exported");
    } catch {
      toast.error("Could not export this project.");
    }
  };
  const onImport = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      if (
        Array.from(files).reduce((sum, f) => sum + f.size, 0) >
        50 * 1024 * 1024
      )
        throw new Error("Choose files totaling less than 50 MB.");
      if (files.length === 1 && /\.zip$/i.test(files[0].name)) {
        const next = await importProjectZIP(files[0]);
        if (await switchProject(next)) toast.success("Project imported");
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
  const changeLibrary = (url: string, remove = false) => {
    try {
      if (!projectRef.current) return;
      const next = editDependency(projectRef.current, url, remove);
      projectRef.current = next;
      setProject(next);
      setSaved("Saving…");
      void run();
      toast.success(
        remove
          ? "Library removed from index.html"
          : "Library included in index.html",
      );
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  const changeVersion = (version: string) => {
    if (!projectRef.current) return;
    try {
      const next = switchP5Version(projectRef.current, version);
      projectRef.current = next;
      setProject(next);
      setSaved("Saving…");
      void run();
      toast.success(
        `p5.js ${version} selected. Sound dependencies updated to match.`,
      );
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  const duplicate = () => {
    if (project) void switchProject(cloneProject(project));
  };
  const actionNames = [
    "Run sketch",
    "Explore starter sketches",
    "Open project library",
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
      case "Open project library":
        void openProjects();
        break;
      case "Format code":
        void formatCode();
        break;
      case "Toggle light and dark mode":
        setDark((d) => !d);
        break;
      case "Canvas focus":
        changeView((v) => (v === "canvas" ? "split" : "canvas"));
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
      if (navigating.current) {
        e.preventDefault();
        return;
      }
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
          persistProject(p)
            .then(() => {
              if (mounted.current && projectRef.current === p)
                toast.success("Sketch saved");
            })
            .catch(() => {
              if (mounted.current)
                toast.error("Could not save. Export a backup.");
            });
      } else if (e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        void formatCode();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [run, formatCode, persistProject, setModal]);
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
    dirty = project && lastRun !== JSON.stringify(project.files),
    previewStale = dirty && runState !== "loading" && runState !== "error",
    controlsChanged =
      project?.params.hue !== DEFAULT_PARAMS.hue ||
      project?.params.density !== DEFAULT_PARAMS.density ||
      project?.params.speed !== DEFAULT_PARAMS.speed;
  const panelCode = (
    <section className="code-panel">
      <div className="panel-bar">
        <div className="file-tab">
          <FileSymbol name={active} />
          <span>{active}</span>
          {dirty && <span className="unsynced">Edited</span>}
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
          lineWrap={!mobile}
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
          <BookOpenIcon size={14} /> Code help
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
          <span
            className={`run-label ${previewStale ? "stale" : runState}`}
            role="status"
            aria-live="polite"
          >
            <i />
            {previewStale
              ? "Preview out of date"
              : runState === "loading"
                ? "Starting"
                : runState === "error"
                  ? "Check messages"
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="icon-button" aria-label="Canvas tools">
                <DotsThreeIcon size={22} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setConsoleOpen(!consoleOpen)}>
                Sketch messages
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={run}>Restart sketch</DropdownMenuItem>
              <DropdownMenuItem onSelect={stop} disabled={!source}>
                Stop sketch
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setModal("settings")}>
                Studio settings
              </DropdownMenuItem>
              <div className="canvas-metadata">
                {stats.width} × {stats.height} ·{" "}
                {runState === "paused" ? 0 : stats.fps} fps
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
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
        ) : !ready || runState === "loading" ? (
          <div className="canvas-loading" role="status" aria-live="polite">
            <span>Opening your canvas…</span>
          </div>
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
      {currentTemplate && supportsControls && controls && (
        <div className="creative-controls">
          <button
            className="controls-heading"
            onClick={() => {
              setControls(false);
              document.getElementById("studio-controls-toggle")?.focus();
            }}
            aria-expanded={controls}
          >
            <span>
              <SlidersHorizontalIcon size={17} /> Controls
            </span>
            <span>
              <CaretDownIcon className="controls-chevron" size={14} />
            </span>
          </button>
          <div
            className={`controls-body ${controls ? "is-open" : ""}`}
            aria-hidden={!controls}
            inert={!controls}
          >
            <div>
              <div
                className={`control-grid ${hasMotion ? "" : "two-controls"}`}
              >
                <div className="control">
                  <label>
                    Color
                    <span className="control-value">
                      <i
                        style={{
                          background: `hsl(${project?.params.hue} 35% 65%)`,
                        }}
                        className="color-dot"
                        aria-hidden="true"
                      />
                      {project?.params.hue}°
                    </span>
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
                    aria-label={
                      project?.template === "brush" ? "Brush size" : "Detail"
                    }
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
              {controlsChanged && (
                <button
                  className="reset-controls"
                  onClick={() =>
                    update((p) => ({ ...p, params: { ...DEFAULT_PARAMS } }))
                  }
                >
                  <ArrowCounterClockwiseIcon size={14} /> Reset controls
                </button>
              )}
              <button className="next-idea" onClick={() => setModal("gallery")}>
                Explore templates <CaretRightIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
      {ready && controls && (!currentTemplate || !supportsControls) && (
        <div className="canvas-companion">
          <h3>Make it yours</h3>
          <p>
            Open the code to add your own shapes, images, motion, and sound.
          </p>
          <button
            className="outline-button"
            onClick={() => changeView(mobile ? "code" : "split")}
          >
            Open code <CodeIcon size={16} />
          </button>
          <button className="next-idea" onClick={() => setModal("gallery")}>
            Explore templates <CaretRightIcon size={14} />
          </button>
        </div>
      )}
      <div
        className={`console-bar ${!consoleOpen && !dirty && !errors ? "quiet" : ""}`}
      >
        <button
          onClick={() => setConsoleOpen(!consoleOpen)}
          aria-expanded={consoleOpen}
        >
          <TerminalIcon size={15} /> Messages{" "}
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
              ? `${logs.length} ${logs.length === 1 ? "message" : "messages"}`
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

  if (!project)
    return (
      <main className={`project-library ${dark ? "dark" : ""}`}>
        <header className="topbar">
          <Link className="brand" href="/">
            <VelograMark className="brand-mark" />
            <strong>velogra</strong>
          </Link>
        </header>
        <section
          className="library-empty project-unavailable"
          role={loadError ? "alert" : "status"}
        >
          <FolderOpenIcon size={36} />
          <h1>
            {loadError === "missing"
              ? "This project is unavailable."
              : loadError === "storage"
                ? "Your project couldn’t be opened."
                : "Opening your project…"}
          </h1>
          {loadError && (
            <p>
              {loadError === "missing"
                ? "It may have been deleted or saved in a different browser."
                : "Device storage is unavailable. Your project has not been changed."}
            </p>
          )}
          {loadError && (
            <div className="library-actions">
              <button
                className="outline-button"
                onClick={() => router.push("/")}
              >
                Back to projects
              </button>
              {loadError === "storage" && (
                <button
                  className="primary-button"
                  onClick={() => {
                    setLoadError(null);
                    setLoadAttempt((attempt) => attempt + 1);
                  }}
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </section>
        <Toaster
          position="bottom-right"
          theme={dark ? "dark" : "light"}
          richColors
        />
      </main>
    );

  return (
    <TooltipProvider delayDuration={350}>
      <main
        aria-busy={leaving}
        onKeyDownCapture={(event) => {
          if (leaving) event.preventDefault();
        }}
        className={`studio art-studio ${filesOpen ? "files-open" : ""} ${leaving ? "is-navigating" : ""} view-${view} ${reduceMotion ? "reduce-motion" : ""} ${runState === "loading" ? "is-loading" : ""} ${dark ? "dark" : ""} ${view === "canvas" && !mobile ? "focus-canvas" : ""}`}
      >
        <a className="skip-link" href="#creative-workspace">
          Skip to workspace
        </a>
        <header className="topbar studio-header">
          <button
            className="brand studio-home"
            onClick={() => void openProjects()}
            aria-label="Open project library"
          >
            <VelograMark className="brand-mark" />
            <strong>velogra</strong>
          </button>
          <div className="sketch-heading">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="icon-button sketch-folder"
                  aria-label="Sketch options"
                >
                  <FolderOpenIcon size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => void openProjects()}>
                  Project library
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => duplicate()}>
                  Duplicate sketch
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setModal("gallery")}>
                  Start a new sketch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="sketch-heading-copy">
              <input
                className="workspace-name"
                aria-label="Sketch name"
                value={project?.name ?? ""}
                placeholder="Your next idea"
                onChange={(e) =>
                  update((p) => ({ ...p, name: e.target.value.slice(0, 80) }))
                }
                onBlur={() => {
                  if (!project?.name.trim())
                    update((p) => ({ ...p, name: "Untitled sketch" }));
                }}
              />
              <div
                className={`workspace-saved ${saved === "Save failed" || saved === "Storage unavailable" ? "save-error" : ""}`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {saved === "Saved on this device" && <CheckIcon size={11} />}
                {mobile && saved === "Saved on this device"
                  ? "Saved locally"
                  : saved}
              </div>
            </div>
          </div>
          <Tabs
            value={view}
            onValueChange={(v) => changeView(v as "canvas" | "split" | "code")}
          >
            <TabsList aria-label="Workspace view">
              <TabsTrigger value="canvas">Canvas</TabsTrigger>
              {!mobile && <TabsTrigger value="split">Split</TabsTrigger>}
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="top-actions">
            <div className="mobile-studio-menu">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="icon-button" aria-label="Studio menu">
                    <DotsThreeIcon size={22} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setModal("gallery")}>
                    Explore templates
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void openProjects()}>
                    Project library
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setModal("reference")}>
                    Reference & first steps
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setModal("settings")}>
                    Editor settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setModal("commands")}>
                    All commands
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
              <span
                className={`theme-icons ${dark ? "is-dark" : ""}`}
                aria-hidden="true"
              >
                <MoonIcon className="theme-moon" size={19} />
                <SunIcon className="theme-sun" size={19} />
              </span>
            </IconButton>
            <div className="toolbar-divider" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="export-button" aria-label="Export sketch">
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
              disabled={!ready || runState === "loading"}
              aria-label={dirty ? "Update preview" : "Run sketch"}
            >
              <PlayIcon size={14} weight="fill" />
              <span>{dirty ? "Update" : "Run"}</span>
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
        <div className="studio-body" id="creative-workspace">
          <SidebarProvider
            className="workspace-provider"
            style={{ "--sidebar-width": "210px" } as React.CSSProperties}
          >
            <Sidebar collapsible="none" className="rail">
              <SidebarContent>
                <SidebarGroup className="file-group">
                  <div className="section-label">
                    Files & assets
                    <button
                      className="icon-button close-files"
                      aria-label="Close files"
                      onClick={() => {
                        setFilesOpen(false);
                        document.getElementById("studio-files-toggle")?.focus();
                      }}
                    >
                      ×
                    </button>
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
                            if (view === "canvas")
                              changeView(mobile ? "code" : "split");
                            if (mobile) setFilesOpen(false);
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
                      setModal("library");
                    }}
                  >
                    <PlusIcon size={14} /> Add a library
                  </button>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter className="rail-footer">
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
                  defaultSize="54%"
                  minSize="32%"
                >
                  {panelCode}
                </ResizablePanel>
                <ResizableHandle className="panel-divider" />
                <ResizablePanel
                  className="preview-resizable"
                  defaultSize="46%"
                  minSize="28%"
                >
                  {panelCanvas}
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </SidebarProvider>
        </div>
        <footer className="statusbar">
          <div className="studio-tool-dock">
            <button
              id="studio-files-toggle"
              aria-pressed={filesOpen}
              onClick={() => setFilesOpen(!filesOpen)}
            >
              <FolderOpenIcon size={17} />
              Files
            </button>
            <button
              id="studio-controls-toggle"
              aria-pressed={controls}
              onClick={() => {
                setControls(!controls);
                if (view === "code") changeView("canvas");
              }}
            >
              <SlidersHorizontalIcon size={17} />
              Controls
            </button>
            <button onClick={() => setModal("library")}>
              <PlusIcon size={17} />
              Toolkit
            </button>
            <button
              className="dock-explore"
              onClick={() => setModal("gallery")}
            >
              <SparkleIcon size={17} />
              Explore
            </button>
          </div>
          <div className="runtime-status">
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
                changeView(
                  view === "canvas" ? (mobile ? "code" : "split") : "canvas",
                )
              }
            >
              <CodeIcon size={14} />
              {view === "canvas"
                ? mobile
                  ? "Show code"
                  : "Show split view"
                : "Focus canvas"}
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
            onCloseAutoFocus={(event) => {
              if (modalTrigger.current?.isConnected) {
                event.preventDefault();
                modalTrigger.current.focus();
              }
            }}
            className={`studio-dialog ${modal === "library" ? "toolkit-dialog" : ""} ${modal === "gallery" ? "gallery-dialog" : ""} ${modal === "commands" ? "command-dialog" : ""}`}
          >
            <DialogHeader>
              <DialogTitle>
                {
                  (
                    {
                      gallery: "Start a sketch",
                      reference: "A little help goes a long way.",
                      settings: "Your studio, your way.",
                      addfile: "Add a file",
                      rename: "Rename file",
                      library: "A few more possibilities.",
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
                        "Choose a template. Your current sketch stays saved on this device.",
                      reference:
                        "You don’t need to know everything. Start with one small change.",
                      settings: "Make room for the way you like to create.",
                      addfile:
                        "JavaScript, CSS, data, shaders. Give your file a name.",
                      rename:
                        "Update references to this file in your sketch after renaming.",
                      library:
                        "Choose a tool. Give your idea another dimension.",
                      commands:
                        "Search actions or use the shortcuts you already know.",
                    } as Record<string, string>
                  )[modal ?? ""]
                }
              </DialogDescription>
            </DialogHeader>
            {modal === "gallery" && (
              <StarterGallery expanded busy={leaving} onSelect={newSketch} />
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
                    appearance="studio"
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
                    appearance="studio"
                    aria-label="Dark mode"
                    checked={dark}
                    onCheckedChange={setDark}
                  />
                </label>
                <label>
                  <span>
                    Reduce motion
                    <small>Keep interface changes still and immediate.</small>
                  </span>
                  <Switch
                    appearance="studio"
                    aria-label="Reduce interface motion"
                    checked={reduceMotion}
                    onCheckedChange={(value) => {
                      setReduceMotion(value);
                      try {
                        localStorage.setItem(
                          "velogra-reduce-motion",
                          String(value),
                        );
                      } catch {}
                    }}
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
                  aria-invalid={Boolean(fileError)}
                  aria-describedby={fileError ? "filename-error" : undefined}
                  autoFocus
                  value={fileName}
                  placeholder="helpers.js"
                  onChange={(e) => {
                    setFileName(e.target.value);
                    setFileError("");
                  }}
                />
                {fileError && (
                  <p id="filename-error" className="form-error" role="alert">
                    {fileError}
                  </p>
                )}
                <button className="primary-button" type="submit">
                  {modal === "rename" ? "Rename" : "Create file"}
                </button>
              </form>
            )}
            {modal === "library" && project && (
              <ToolkitPanel
                project={project}
                onChange={changeLibrary}
                onExample={(id) =>
                  newSketch(templates.find((template) => template.id === id)!)
                }
              />
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
