export type SketchFile = {
  name: string;
  content: string;
  binary?: boolean;
  mime?: string;
};
export type Project = {
  id: string;
  name: string;
  files: SketchFile[];
  params: { hue: number; density: number; speed: number };
  template: string;
  version: string;
  updated: number;
};
export const DEFAULT_PARAMS = { hue: 165, density: 72, speed: 35 };
let operations: Promise<unknown> = Promise.resolve();
const deletedProjects = new Set<string>();

// Include reads in the queue so the library sees the final save on studio exit.
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation);
  operations = result.catch(() => {});
  return result;
}

export function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("canvas-studio", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Close other Velogra tabs and try again."));
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  request: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("projects", mode);
      const operation = request(tx.objectStore("projects"));
      tx.oncomplete = () => resolve(operation.result);
      tx.onabort = () =>
        reject(
          tx.error ?? operation.error ?? new Error("Storage operation failed."),
        );
      tx.onerror = () =>
        reject(
          tx.error ?? operation.error ?? new Error("Storage operation failed."),
        );
    });
  } finally {
    db.close();
  }
}

export function readProjects(): Promise<Project[]> {
  return enqueue(async () => {
    const projects = await transaction<Project[]>("readonly", (store) =>
      store.getAll(),
    );
    return projects.sort((a, b) => b.updated - a.updated);
  });
}

export function readProject(id: string): Promise<Project | undefined> {
  return enqueue(() =>
    transaction<Project | undefined>("readonly", (store) => store.get(id)),
  );
}

export function saveProject(project: Project): Promise<void> {
  if (deletedProjects.has(project.id)) {
    return Promise.reject(new Error("This project has been deleted."));
  }
  const snapshot = structuredClone(project);
  return enqueue(async () => {
    await transaction("readwrite", (store) => store.put(snapshot));
  });
}

export function deleteProject(id: string): Promise<void> {
  // Reject any late autosave immediately; previously queued saves finish first.
  deletedProjects.add(id);
  return enqueue(async () => {
    try {
      await transaction("readwrite", (store) => store.delete(id));
    } catch (error) {
      deletedProjects.delete(id);
      throw error;
    }
    try {
      if (localStorage.getItem("canvas-active") === id) {
        localStorage.removeItem("canvas-active");
      }
    } catch {}
  });
}
export function validName(name: string) {
  return (
    name.length > 0 &&
    name.length < 180 &&
    !name.startsWith("/") &&
    !name.split("/").some((p) => p === ".." || p === ".") &&
    !/[\\\x00-\x1f]/.test(name)
  );
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function cloneProject(project: Project): Project {
  return {
    ...project,
    id: crypto.randomUUID(),
    name: project.name.slice(0, 75) + " copy",
    files: project.files.map((file) => ({ ...file })),
    params: { ...project.params },
    updated: Date.now(),
  };
}
