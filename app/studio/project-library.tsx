"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlusIcon,
  UploadSimpleIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  CopyIcon,
  DownloadSimpleIcon,
  TrashIcon,
  ArrowUpRightIcon,
  SparkleIcon,
  MoonIcon,
  SunIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Toaster, toast } from "sonner";
import { VelograMark } from "./brand";
import {
  cloneProject,
  deleteProject,
  readProjects,
  saveProject,
  type Project,
} from "./projects";
import { templates, makeProject } from "./templates";
import { exportProjectZIP, importProjectZIP } from "./project-archive";

type ProjectDialog =
  { kind: "create" } | { kind: "rename"; project: Project } | null;

export default function ProjectLibrary() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [dark, setDark] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const opening = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<ProjectDialog>(null);
  const [name, setName] = useState("");
  const [starter, setStarter] = useState("blank");
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const upload = useRef<HTMLInputElement>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const items = await readProjects();
      if (alive.current) {
        setProjects(items);
        setStatus("ready");
      }
    } catch {
      if (alive.current) setStatus("error");
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    queueMicrotask(() => {
      if (alive.current) void load();
    });
    queueMicrotask(() => {
      if (!alive.current) return;
      try {
        setDark(localStorage.getItem("canvas-theme") === "dark");
      } catch {}
      setThemeReady(true);
    });
    return () => {
      alive.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("canvas-theme", dark ? "dark" : "light");
      document.documentElement.classList.toggle(
        "reduce-motion",
        localStorage.getItem("velogra-reduce-motion") === "true",
      );
    } catch {}
  }, [dark, themeReady]);

  const perform = async (operation: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setFormError("");
    try {
      await operation();
    } catch (error) {
      opening.current = false;
      const message =
        error instanceof Error
          ? error.message
          : "Could not update your projects. Try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      // Keep creation/import locked while the saved project's route loads.
      if (!opening.current) {
        pending.current = false;
        if (alive.current) setBusy(false);
      }
    }
  };

  const create = (event: MouseEvent<HTMLButtonElement>) => {
    returnFocus.current = event.currentTarget;
    setName("Untitled project");
    setStarter("blank");
    setFormError("");
    setDialog({ kind: "create" });
  };
  const rename = (project: Project) => {
    returnFocus.current = document.getElementById(
      `project-options-${project.id}`,
    );
    setName(project.name);
    setFormError("");
    setDialog({ kind: "rename", project });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 80) {
      setFormError("Enter a project name between 1 and 80 characters.");
      return;
    }
    if (!dialog) return;
    void perform(async () => {
      if (dialog.kind === "create") {
        const project = makeProject(
          templates.find((template) => template.id === starter)!,
        );
        project.name = trimmed;
        await saveProject(project);
        opening.current = true;
        router.push(`/studio/${encodeURIComponent(project.id)}`);
      } else {
        const project = {
          ...dialog.project,
          name: trimmed,
          updated: Date.now(),
        };
        await saveProject(project);
        setProjects((items) =>
          items.map((item) => (item.id === project.id ? project : item)),
        );
        setDialog(null);
        toast.success("Project renamed");
      }
    });
  };
  const duplicate = (project: Project) =>
    void perform(async () => {
      const copy = cloneProject(project);
      await saveProject(copy);
      setProjects((items) => [copy, ...items]);
      toast.success("Project duplicated");
    });
  const importZIP = (file: File | undefined) => {
    if (!file) return;
    void perform(async () => {
      const project = await importProjectZIP(file);
      await saveProject(project);
      opening.current = true;
      router.push(`/studio/${encodeURIComponent(project.id)}`);
    });
  };
  const remove = () => {
    if (!deleting) return;
    const project = deleting;
    void perform(async () => {
      await deleteProject(project.id);
      setProjects((items) => items.filter((item) => item.id !== project.id));
      setDeleting(null);
      toast.success("Project deleted");
    });
  };
  const visible = projects
    .filter((project) =>
      project.name
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : b.updated - a.updated,
    );
  const starters = [...templates].sort(
    (a, b) => Number(b.id === "blank") - Number(a.id === "blank"),
  );

  return (
    <main className={`project-library ${dark ? "dark" : ""}`} aria-busy={busy}>
      <header className="topbar library-topbar">
        <Link href="/" className="brand" aria-label="Velogra projects">
          <VelograMark className="brand-mark" />
          <strong>velogra</strong>
          <span className="brand-meta">creative coding studio</span>
        </Link>
        <div className="top-actions">
          <span className="library-local">
            <CheckIcon size={14} /> On this device
          </span>
          <button
            className="icon-button"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <SunIcon size={19} /> : <MoonIcon size={19} />}
          </button>
        </div>
      </header>
      <section className="library-content" aria-labelledby="projects-heading">
        <div className="library-heading">
          <div>
            <span className="library-eyebrow">YOUR STUDIO</span>
            <h1 id="projects-heading">Your projects</h1>
            <p>
              A place for your ideas to take shape. Saved in this browser, on
              this device.
            </p>
          </div>
          <div className="library-actions">
            <button
              className="outline-button"
              disabled={busy || status !== "ready"}
              onClick={() => upload.current?.click()}
            >
              <UploadSimpleIcon size={17} /> Import ZIP
            </button>
            <button
              id="new-project"
              className="primary-button"
              disabled={busy || status !== "ready"}
              onClick={create}
            >
              <PlusIcon size={17} /> New project
            </button>
          </div>
        </div>
        {status === "ready" && projects.length > 0 && (
          <div className="library-toolbar">
            <div className="library-search">
              <MagnifyingGlassIcon size={18} aria-hidden="true" />
              <input
                aria-label="Search projects"
                placeholder="Search your projects…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <label className="library-sort">
              Sort by
              <select
                aria-label="Sort projects"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="recent">Recently edited</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        )}
        <p className="library-count" role="status" aria-live="polite">
          {status === "ready" && projects.length > 0
            ? `${visible.length} ${visible.length === 1 ? "project" : "projects"}${search.trim() ? ` matching “${search.trim()}”` : ""}`
            : ""}
        </p>
        {status === "loading" ? (
          <div className="library-empty" role="status">
            <FolderOpenIcon size={36} />
            <h2>Opening your library…</h2>
          </div>
        ) : status === "error" ? (
          <div className="library-empty" role="alert">
            <FolderOpenIcon size={36} />
            <h2>Your library couldn’t be opened.</h2>
            <p>
              Device storage is unavailable. Your projects have not been
              changed.
            </p>
            <button
              className="outline-button"
              onClick={() => {
                setStatus("loading");
                void load();
              }}
            >
              Try again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="library-empty">
            <div className="library-empty-mark">
              <VelograMark />
            </div>
            <h2>Your next idea starts here.</h2>
            <p>
              Create a project from a blank canvas or a starter sketch.
              <br />
              Already have something? Import a project ZIP.
            </p>
            <button className="primary-button" onClick={create} disabled={busy}>
              <PlusIcon size={17} /> Create your first project
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="library-empty">
            <MagnifyingGlassIcon size={36} />
            <h2>No projects found.</h2>
            <p>Try a different name or clear your search.</p>
            <button className="outline-button" onClick={() => setSearch("")}>
              Clear search
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {visible.map((project) => {
              const template = templates.find(
                (item) => item.id === project.template,
              );
              return (
                <article className="library-card" key={project.id}>
                  <div className="library-card-heading">
                    <span
                      className="library-project-icon"
                      style={
                        {
                          "--project-accent": template?.color ?? "#b4b8be",
                        } as React.CSSProperties
                      }
                    >
                      <SparkleIcon size={22} />
                    </span>
                    <span className="library-template">
                      {template?.category ?? "IMPORTED"}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          id={`project-options-${project.id}`}
                          className="icon-button"
                          disabled={busy}
                          aria-label={`Options for ${project.name}`}
                        >
                          <DotsThreeIcon size={23} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() =>
                            router.push(
                              `/studio/${encodeURIComponent(project.id)}`,
                            )
                          }
                        >
                          <FolderOpenIcon /> Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => rename(project)}>
                          <PencilSimpleIcon /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => duplicate(project)}>
                          <CopyIcon /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            try {
                              exportProjectZIP(project);
                              toast.success("Project exported");
                            } catch {
                              toast.error("Could not export this project.");
                            }
                          }}
                        >
                          <DownloadSimpleIcon /> Export ZIP
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            returnFocus.current = document.getElementById(
                              `project-options-${project.id}`,
                            );
                            setFormError("");
                            setDeleting(project);
                          }}
                        >
                          <TrashIcon /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <button
                    className="library-card-open"
                    disabled={busy}
                    aria-label={`Open ${project.name}`}
                    onClick={() =>
                      router.push(`/studio/${encodeURIComponent(project.id)}`)
                    }
                  >
                    <h2 title={project.name}>{project.name}</h2>
                    <p>
                      {template?.name ?? "Custom sketch"}{" "}
                      <ArrowUpRightIcon size={16} />
                    </p>
                  </button>
                  <div className="library-card-meta">
                    <span>
                      {project.files.length}{" "}
                      {project.files.length === 1 ? "file" : "files"}
                    </span>
                    <time
                      dateTime={new Date(project.updated).toISOString()}
                      title={new Date(project.updated).toLocaleString()}
                    >
                      Edited{" "}
                      {new Date(project.updated).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <input
        ref={upload}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        aria-label="Import project ZIP"
        tabIndex={-1}
        onChange={(event) => {
          importZIP(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open && !pending.current) setDialog(null);
        }}
      >
        <DialogContent
          className={`studio-dialog ${dialog?.kind === "create" ? "new-project-dialog" : ""}`}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "create"
                ? "Start something new."
                : "Rename project"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.kind === "create"
                ? "Give your idea a name and a place to begin."
                : "Choose a name that makes this project easy to find."}
            </DialogDescription>
          </DialogHeader>
          <form className="project-form" onSubmit={submit}>
            <label htmlFor="project-name">Project name</label>
            <input
              id="project-name"
              value={name}
              maxLength={80}
              disabled={busy}
              aria-invalid={!!formError}
              aria-describedby={formError ? "project-form-error" : undefined}
              onChange={(event) => {
                setName(event.target.value);
                setFormError("");
              }}
              autoFocus
            />
            {dialog?.kind === "create" && (
              <fieldset className="project-starters" disabled={busy}>
                <legend>Start with</legend>
                <div className="starter-grid">
                  {starters.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      aria-pressed={starter === template.id}
                      onClick={() => setStarter(template.id)}
                    >
                      <span className="starter-heading">
                        <strong>
                          {template.id === "blank"
                            ? "Blank sketch"
                            : template.name}
                        </strong>
                        {starter === template.id && <CheckIcon size={17} />}
                      </span>
                      <small>{template.description}</small>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {formError && (
              <p id="project-form-error" className="form-error" role="alert">
                {formError}
              </p>
            )}
            <div className="project-form-actions">
              <button
                type="button"
                className="outline-button"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={busy}>
                {busy
                  ? "Saving…"
                  : dialog?.kind === "create"
                    ? "Create project"
                    : "Save name"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !pending.current) setDeleting(null);
        }}
      >
        <AlertDialogContent
          className="studio-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = returnFocus.current;
            if (target?.isConnected) target.focus();
            else document.getElementById("new-project")?.focus();
          }}
        >
          <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes this project and its files from this
            browser. Export a ZIP first if you want to keep a copy.
          </AlertDialogDescription>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep project</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
            >
              {busy ? "Deleting…" : "Delete project"}
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
  );
}
