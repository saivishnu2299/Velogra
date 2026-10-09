import Studio from "../studio";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <Studio key={projectId} projectId={projectId} />;
}
