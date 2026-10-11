"use client";

import { useState } from "react";
import {
  ArrowUpRightIcon,
  CheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import {
  creativeTools,
  scriptSources,
  toolIncluded,
  toolSource,
} from "./toolkit";
import type { Project } from "./projects";

export function ToolkitPanel({
  project,
  onChange,
  onExample,
}: {
  project: Project;
  onChange: (source: string, remove?: boolean) => void;
  onExample: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [url, setURL] = useState("");
  const index =
    project.files.find((file) => file.name === "index.html")?.content ?? "";
  const tools = creativeTools.filter((tool) =>
    `${tool.name} ${tool.category} ${tool.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const sources = scriptSources(index);
  const custom = sources.filter(
    (source) =>
      /^https:/.test(source) &&
      !/\/p5@[^/]+\/lib\/p5(?:\.min)?\.js/.test(source) &&
      !creativeTools.some(
        (tool) =>
          source === toolSource(tool, project.version) ||
          source === tool.source,
      ) &&
      !/p5\.sound/.test(source),
  );
  return (
    <div className="toolkit-panel">
      <label className="toolkit-search">
        <MagnifyingGlassIcon size={18} />
        <input
          placeholder="Sound, physics, color…"
          aria-label="Search toolkit"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="toolkit-grid">
        {tools.map((tool) => {
          const source = toolSource(tool, project.version);
          const included = toolIncluded(index, tool);
          return (
            <article className="toolkit-card" key={tool.id}>
              <div className="toolkit-card-top">
                <span className="eyebrow">{tool.category}</span>
                <span className="toolkit-version">
                  {tool.id === "sound"
                    ? project.version === "1.11.11"
                      ? "1.11.11"
                      : "0.4.1"
                    : tool.version}
                </span>
              </div>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              <div className="toolkit-actions">
                {source ? (
                  <button
                    className={included ? "outline-button" : "primary-button"}
                    onClick={() => {
                      const actual =
                        tool.id === "sound" && included
                          ? sources.find((src) => /p5\.sound/.test(src))!
                          : source;
                      onChange(actual, included);
                    }}
                  >
                    {included ? (
                      <CheckIcon size={14} />
                    ) : (
                      <PlusIcon size={14} />
                    )}
                    {included ? "Included · remove" : "Add to sketch"}
                  </button>
                ) : (
                  <span className="built-in">
                    <CheckIcon size={14} /> Built in
                  </span>
                )}
                <button
                  className="text-action"
                  onClick={() => onExample(tool.example)}
                >
                  Try example <ArrowUpRightIcon size={14} />
                </button>
              </div>
              <a href={tool.docs} target="_blank" rel="noreferrer">
                Documentation <ArrowUpRightIcon size={12} />
              </a>
            </article>
          );
        })}
      </div>
      {!tools.length && (
        <p className="toolkit-empty">
          No tools match “{search}”. Try sound, motion, or color.
        </p>
      )}
      <details className="custom-library">
        <summary>Custom library · advanced</summary>
        <p>
          Include a browser-ready HTTPS script. Module libraries can be
          configured in index.html.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onChange(url);
          }}
        >
          <input
            type="url"
            required
            placeholder="https://…/library.min.js"
            aria-label="JavaScript library URL"
            value={url}
            onChange={(event) => setURL(event.target.value)}
          />
          <button className="outline-button" type="submit">
            Add script
          </button>
        </form>
        {custom.map((source) => (
          <div className="custom-source" key={source}>
            <code>{source}</code>
            <button onClick={() => onChange(source, true)}>Remove</button>
          </div>
        ))}
      </details>
      <p className="toolkit-note">
        For p5.js {project.version}. Adding a library keeps your code intact.
        Examples open as new sketches.
      </p>
    </div>
  );
}
