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
export function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("canvas-studio", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readProjects(): Promise<Project[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readonly");
    const request = tx.objectStore("projects").getAll();
    request.onsuccess = () =>
      resolve(
        (request.result as Project[]).sort((a, b) => b.updated - a.updated),
      );
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
export async function saveProject(project: Project) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").put(project);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
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
    name: project.name + " copy",
    updated: Date.now(),
  };
}
