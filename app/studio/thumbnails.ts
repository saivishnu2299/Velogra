import type { Project } from "./projects";

export function sourceRevision(project: Project): string {
  const source = JSON.stringify([
    project.files,
    project.params,
    project.version,
  ]);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++)
    hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

export function acceptThumbnail(
  project: Project,
  revision: string,
  data: unknown,
): Project {
  if (
    revision !== sourceRevision(project) ||
    typeof data !== "string" ||
    data.length > 133000 ||
    !/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(data)
  )
    return project;
  return { ...project, thumbnail: { data, revision } };
}
