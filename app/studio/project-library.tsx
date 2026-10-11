"use client";

import { AppearanceSelect, useAppearance } from "./appearance";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
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
import { templates, makeProject, type Template } from "./templates";
import { StarterArt, StarterGallery } from "./starter-gallery";
import Image from "next/image";
import { exportProjectZIP, importProjectZIP } from "./project-archive";

type ProjectDialog = { kind: "rename"; project: Project } | null;

export default function ProjectLibrary() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const { dark } = useAppearance();
  const opening = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<ProjectDialog>(null);
  const [name, setName] = useState("");
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
    return () => {
      alive.current = false;
    };
  }, [load]);

  useEffect(() => {
    try {
      document.documentElement.classList.toggle(
        "reduce-motion",
        localStorage.getItem("velogra-reduce-motion") === "true",
      );
    } catch {}
  }, []);

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

  const start = (template: Template) =>
    void perform(async () => {
      const project = makeProject(template);
      if (template.id === "blank") project.name = "Untitled sketch";
      await saveProject(project);
      opening.current = true;
      router.push(`/studio/${encodeURIComponent(project.id)}`);
    });
  const create = () =>
    start(templates.find((template) => template.id === "blank")!);
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

  return (
    <main
      className={`project-library art-library ${projects.length ? "has-projects" : ""} ${dark ? "dark" : ""}`}
      aria-busy={busy}
    >
      <a className="skip-link" href="#projects-heading">
        Skip to studio
      </a>
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
          <AppearanceSelect />
        </div>
      </header>
      <section className="library-content" aria-labelledby="projects-heading">
        <div className="library-heading">
          <div>
            <span className="library-eyebrow">
              A SPACE FOR CREATIVE CURIOSITY
            </span>
            <h1 id="projects-heading">
              {projects.length ? (
                "Back to your studio."
              ) : (
                <>
                  Make something
                  <br />
                  <em>unexpected.</em>
                </>
              )}
            </h1>
            <p>
              {projects.length
                ? "Pick up a thread, or follow a new one."
                : "A little code. A new perspective. Follow an idea and see where it takes you."}
            </p>
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
                <PlusIcon size={17} /> Blank sketch
              </button>
            </div>
          </div>
          <button
            className="welcome-art"
            onClick={() => start(templates[0])}
            disabled={busy || status !== "ready"}
            aria-label="Start featured Chromatic orbit"
          >
            <StarterArt template={templates[0]} />
            <span>
              <span>STUDY 001 / CHROMATIC ORBIT</span>
              <ArrowUpRightIcon size={18} />
            </span>
          </button>
        </div>
        {status === "ready" && projects.length === 0 && (
          <StarterGallery onSelect={start} busy={busy} />
        )}
        {status === "ready" && projects.length > 0 && (
          <div className="collection-heading projects-title">
            <div>
              <span className="eyebrow">PICK UP A THREAD</span>
              <h2>Your sketches</h2>
            </div>
            <span className="device-note">Saved in this browser</span>
          </div>
        )}
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
          <div className="first-studio-note">
            <FolderOpenIcon size={18} />
            <p>
              Your sketches will live here. Start with a study above, or open a
              blank canvas.
            </p>
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
                  <button
                    className="project-art"
                    disabled={busy}
                    onClick={() =>
                      router.push(`/studio/${encodeURIComponent(project.id)}`)
                    }
                    aria-label={`Open artwork ${project.name}`}
                  >
                    {project.thumbnail ? (
                      <Image
                        src={project.thumbnail.data}
                        alt={`Last captured artwork for ${project.name}`}
                        fill
                        unoptimized
                        sizes="(max-width: 600px) 90vw, 33vw"
                      />
                    ) : (
                      <span className="project-art-placeholder">
                        <VelograMark />
                        <span>Ready for your next idea</span>
                      </span>
                    )}
                  </button>
                  <div className="library-card-heading">
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
        {status === "ready" && projects.length > 0 && (
          <StarterGallery onSelect={start} busy={busy} />
        )}
        <footer className="library-footer">
          <span>velogra / code becomes form</span>
          <span>
            Your work stays on this device. Export a ZIP to take it with you.
          </span>
        </footer>
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
          className="studio-dialog"
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
            <DialogTitle>Rename sketch</DialogTitle>
            <DialogDescription>
              Choose a name that makes this sketch easy to find.
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
                {busy ? "Saving…" : "Save name"}
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
