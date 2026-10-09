import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cloneProject,
  database,
  deleteProject,
  readProject,
  readProjects,
  saveProject,
} from "../app/studio/projects";
import { makeProject, templates } from "../app/studio/templates";
import { importProjectZIP, projectZIP } from "../app/studio/project-archive";
import { strToU8, zipSync } from "fflate";

test("project library persistence and archive workflows", async (suite) => {
  await suite.test(
    "reads existing v1 records without a migration",
    async () => {
      const project = makeProject();
      const db = await database();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("projects", "readwrite");
        tx.objectStore("projects").put(project);
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
      });
      assert.equal(db.version, 1);
      db.close();
      assert.deepEqual(await readProject(project.id), project);
      assert.equal(await readProject("missing-project"), undefined);
    },
  );

  await suite.test(
    "saves immutable snapshots and exposes final writes to reads",
    async () => {
      const project = makeProject();
      const save = saveProject(project);
      project.files[0].content = "changed after enqueue";
      project.params.hue = 42;
      await save;
      const stored = await readProject(project.id);
      assert.notEqual(stored?.files[0].content, project.files[0].content);
      assert.equal(stored?.params.hue, 165);
      const final = {
        ...project,
        name: "Final edit",
        updated: Date.now() + 1000,
      };
      const pending = saveProject(final);
      assert.equal((await readProjects())[0].name, "Final edit");
      await pending;
    },
  );

  await suite.test(
    "duplicate has its own identity, files, and parameters",
    async () => {
      const original = makeProject();
      const copy = cloneProject(original);
      assert.notEqual(copy.id, original.id);
      copy.files[0].content = "copy only";
      copy.params.hue = 12;
      assert.notEqual(copy.files[0].content, original.files[0].content);
      assert.notEqual(copy.params.hue, original.params.hue);
      await saveProject(original);
      await saveProject(copy);
      assert.deepEqual(await readProject(original.id), original);
      assert.equal(
        cloneProject({ ...original, name: "x".repeat(80) }).name.length,
        80,
      );
    },
  );

  await suite.test(
    "pending autosaves cannot resurrect a deleted project",
    async () => {
      const project = makeProject();
      const keep = makeProject();
      await saveProject(keep);
      const queued = saveProject(project);
      const deletion = deleteProject(project.id);
      await assert.rejects(saveProject(project), /deleted/);
      await Promise.all([queued, deletion]);
      assert.equal(await readProject(project.id), undefined);
      assert.deepEqual(await readProject(keep.id), keep);
    },
  );

  await suite.test(
    "failed writes and deletes reject, then the queue recovers",
    async (context) => {
      const project = makeProject();
      await saveProject(project);
      const failure = context.mock.method(indexedDB, "open", () => {
        throw new Error("Storage unavailable");
      });
      await assert.rejects(readProjects(), /Storage unavailable/);
      await assert.rejects(saveProject(project), /Storage unavailable/);
      await assert.rejects(deleteProject(project.id), /Storage unavailable/);
      failure.mock.restore();
      await saveProject({ ...project, name: "Recovered" });
      assert.equal((await readProject(project.id))?.name, "Recovered");
    },
  );

  await suite.test(
    "clears only the deleted project's last-opened marker",
    async () => {
      const project = makeProject();
      let active: string | null = project.id;
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: {
          getItem: () => active,
          removeItem: () => {
            active = null;
          },
        },
      });
      await saveProject(project);
      await deleteProject(project.id);
      assert.equal(active, null);
      active = "another-project";
      await deleteProject(crypto.randomUUID());
      assert.equal(active, "another-project");
      Reflect.deleteProperty(globalThis, "localStorage");
    },
  );

  await suite.test(
    "ZIP round trip preserves binary files and project settings",
    async () => {
      const project = makeProject(
        templates.find((template) => template.sound)!,
      );
      project.name = "Sound project";
      project.params = { hue: 90, density: 30, speed: 15 };
      project.files.push({
        name: "assets/bytes.bin",
        binary: true,
        mime: "application/octet-stream",
        content: "data:application/octet-stream;base64,AAECAw==",
      });
      const imported = await importProjectZIP(
        new File([projectZIP(project)], "project.zip"),
      );
      assert.notEqual(imported.id, project.id);
      assert.equal(imported.name, project.name);
      assert.equal(imported.version, project.version);
      assert.equal(imported.template, project.template);
      assert.deepEqual(imported.params, project.params);
      assert.deepEqual(
        imported.files.find((file) => file.binary),
        project.files.find((file) => file.binary),
      );
      assert.equal(
        imported.files.find((file) => file.name === "sketch.js")?.content,
        project.files[0].content,
      );
    },
  );

  await suite.test(
    "ZIP validates empty, invalid, oversized, and duplicate paths",
    async () => {
      const archive = (files: Record<string, Uint8Array>) =>
        new File([zipSync(files) as Uint8Array<ArrayBuffer>], "test.zip");
      await assert.rejects(importProjectZIP(archive({})), /does not contain/);
      await assert.rejects(importProjectZIP(new File(["bad"], "test.zip")));
      await assert.rejects(
        importProjectZIP(archive({ "bad\\path.js": strToU8("test") })),
        /unsupported/,
      );
      await assert.rejects(
        importProjectZIP(
          archive({
            "folder/index.html": strToU8("a"),
            "index.html": strToU8("b"),
          }),
        ),
        /duplicate/,
      );
      const many = Object.fromEntries(
        Array.from({ length: 201 }, (_, index) => [`${index}.js`, strToU8("")]),
      );
      await assert.rejects(importProjectZIP(archive(many)), /200 files/);
      await assert.rejects(
        importProjectZIP(
          archive({ "large.bin": new Uint8Array(50 * 1024 * 1024 + 1) }),
        ),
        /50 MB/,
      );
    },
  );

  await suite.test(
    "deleting the final projects leaves an empty library",
    async () => {
      for (const project of await readProjects())
        await deleteProject(project.id);
      assert.deepEqual(await readProjects(), []);
    },
  );
});
