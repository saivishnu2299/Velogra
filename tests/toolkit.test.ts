import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addScript,
  removeScript,
  scriptSources,
  creativeTools,
  toolSource,
  editDependency,
  switchP5Version,
} from "../app/studio/toolkit";
import {
  makeProject,
  templates,
  P5_LATEST,
  P5_LEGACY,
} from "../app/studio/templates";
import { acceptThumbnail, sourceRevision } from "../app/studio/thumbnails";
import { readProject, saveProject, cloneProject } from "../app/studio/projects";
import { projectZIP, importProjectZIP } from "../app/studio/project-archive";

test("adding dependencies preserves code, loads after p5 and before sketch, and is idempotent", () => {
  const project = makeProject();
  const source = creativeTools.find((tool) => tool.id === "matter")!.source!;
  const next = editDependency(project, source);
  assert.deepEqual(
    next.files.find((file) => file.name === "sketch.js"),
    project.files.find((file) => file.name === "sketch.js"),
  );
  const html = next.files.find((file) => file.name === "index.html")!.content;
  assert.deepEqual(scriptSources(html), [
    `https://cdn.jsdelivr.net/npm/p5@${P5_LATEST}/lib/p5.min.js`,
    source,
    "sketch.js",
  ]);
  assert.equal(addScript(html, source), html);
  assert.equal(scriptSources(removeScript(html, source)).length, 2);
  assert.ok(
    removeScript(html, source).includes('<script src="sketch.js"></script>'),
  );
});

test("script matching ignores comments and inline code and supports escaped URL queries", () => {
  const url = "https://example.com/lib.js?a=1&b=2";
  const html = makeProject().files.find(
    (file) => file.name === "index.html",
  )!.content;
  const decorated = `<!-- <script src="${url}"></script> -->\n${html}`;
  const added = addScript(decorated, url);
  assert.ok(added.includes("&amp;b=2"));
  assert.ok(scriptSources(added).includes(url));
  assert.ok(
    removeScript(added, url).includes(
      `<!-- <script src="${url}"></script> -->`,
    ),
  );
  assert.deepEqual(
    scriptSources(
      `<script>const example = '<script src="x">';</script><script src='y'></script>`,
    ),
    ["y"],
  );
});

test("invalid dependencies fail without changing projects", () => {
  const project = makeProject();
  assert.throws(() => editDependency(project, "javascript:alert(1)"), /HTTPS/);
  assert.throws(
    () => editDependency({ ...project, files: [] }, "https://example.com/a.js"),
    /index.html/,
  );
  assert.throws(
    () => addScript("<head></head>", "https://example.com/a.js"),
    /p5.js/,
  );
});

test("ten starters declare the appropriate dependencies and audio version", () => {
  assert.equal(templates.length, 10);
  assert.equal(new Set(templates.map((template) => template.id)).size, 10);
  for (const template of templates) {
    const project = makeProject(template);
    assert.equal(project.version, template.sound ? P5_LEGACY : P5_LATEST);
    if (template.tool)
      assert.ok(
        scriptSources(project.files[1].content).includes(
          creativeTools.find((tool) => tool.id === template.tool)!.source!,
        ),
      );
  }
  const sound = creativeTools.find((tool) => tool.id === "sound")!;
  assert.ok(toolSource(sound, P5_LEGACY)!.includes("p5@1.11.11/lib/addons/"));
  assert.ok(toolSource(sound, P5_LATEST)!.includes("p5.sound@0.4.1/"));
});

test("explicit p5 version changes retain sound with the matching build and preserve other libraries", () => {
  const sound = makeProject(
    templates.find((template) => template.id === "sound")!,
  );
  const source = creativeTools.find((tool) => tool.id === "matter")!.source!;
  const upgraded = switchP5Version(editDependency(sound, source), P5_LATEST);
  const html = upgraded.files.find(
    (file) => file.name === "index.html",
  )!.content;
  assert.ok(html.includes("p5.sound@0.4.1/dist/p5.sound.min.js"));
  assert.ok(html.includes(source));
  assert.equal(upgraded.files[0].content, sound.files[0].content);
  const downgraded = switchP5Version(upgraded, P5_LEGACY);
  assert.ok(
    downgraded.files[1].content.includes(
      "p5@1.11.11/lib/addons/p5.sound.min.js",
    ),
  );
  assert.equal(
    scriptSources(downgraded.files[1].content).filter((src) =>
      src.includes("p5.sound"),
    ).length,
    1,
  );
});

test("thumbnail acceptance rejects stale and oversized captures, survives storage, and does not change edit time", async () => {
  const project = makeProject();
  const revision = sourceRevision(project);
  const data = "data:image/webp;base64,aGVsbG8=";
  const captured = acceptThumbnail(project, revision, data);
  assert.equal(captured.updated, project.updated);
  assert.equal(captured.thumbnail?.revision, revision);
  assert.equal(sourceRevision(captured), revision);
  assert.equal(acceptThumbnail(project, "stale", data), project);
  assert.equal(
    acceptThumbnail(
      project,
      revision,
      "data:image/webp;base64," + "a".repeat(140000),
    ),
    project,
  );
  assert.equal(
    acceptThumbnail(project, revision, "https://example.com/image.png"),
    project,
  );
  const edited = { ...project, params: { ...project.params, hue: 22 } };
  assert.equal(acceptThumbnail(edited, revision, data), edited);
  await saveProject(captured);
  assert.deepEqual(
    (await readProject(project.id))?.thumbnail,
    captured.thumbnail,
  );
  assert.deepEqual(cloneProject(captured).thumbnail, captured.thumbnail);
});

test("toolkit dependencies survive archive round trips while regeneratable thumbnails do not", async () => {
  const project = makeProject(
    templates.find((template) => template.id === "gravity")!,
  );
  project.thumbnail = {
    data: "data:image/webp;base64,aGVsbG8=",
    revision: sourceRevision(project),
  };
  const next = await importProjectZIP(
    new File([projectZIP(project)], "garden.zip"),
  );
  assert.ok(
    next.files
      .find((file) => file.name === "index.html")!
      .content.includes("matter-js@0.20.0"),
  );
  assert.equal(next.thumbnail, undefined);
  const index = next.files.find((file) => file.name === "index.html")!.content;
  assert.ok(
    index.includes("window.studio ??="),
    "standalone defaults leave imported control values authoritative",
  );
});
