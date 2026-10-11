"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ArrowUpRightIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { templates, makeStarterPreview, type Template } from "./templates";
import { featuredStarters, nextFeaturedOffset } from "./featured-starters";
import { compileProject, prepareRuntime } from "./runtime";

function subscribeMotion(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => {
    media.removeEventListener("change", listener);
    observer.disconnect();
  };
}
function motionReduced() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("reduce-motion")
  );
}

export function StarterArt({
  template,
  active = false,
}: {
  template: Template;
  active?: boolean;
}) {
  const [source, setSource] = useState("");
  const reduced = useSyncExternalStore(
    subscribeMotion,
    motionReduced,
    () => true,
  );
  useEffect(() => {
    if (!active || reduced) return;
    let alive = true;
    const project = makeStarterPreview(template);
    prepareRuntime(project)
      .then(() => {
        if (alive) setSource(compileProject(project, `starter-${template.id}`));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [active, reduced, template]);
  return (
    <span className="starter-art">
      <Image
        src={`/starters/${template.id}.webp`}
        alt=""
        fill
        sizes="(max-width: 600px) 90vw, 30vw"
      />
      {active && !reduced && source && (
        <iframe
          title={`${template.name} animated preview`}
          srcDoc={source}
          sandbox="allow-scripts"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

export function StarterGallery({
  onSelect,
  busy = false,
  expanded = false,
}: {
  onSelect: (template: Template) => void;
  busy?: boolean;
  expanded?: boolean;
}) {
  const [all, setAll] = useState(expanded);
  const [category, setCategory] = useState("All");
  const [active, setActive] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (expanded) return;
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      let start = 0;
      try {
        start = Number(localStorage.getItem("velogra-featured-offset") ?? 0);
      } catch {}
      if (!Number.isSafeInteger(start) || start < 0) start = 0;
      setOffset(start);
      try {
        localStorage.setItem(
          "velogra-featured-offset",
          String(nextFeaturedOffset(start)),
        );
      } catch {}
    });
    return () => {
      alive = false;
    };
  }, [expanded]);
  const cycleFeatured = () => {
    const next = nextFeaturedOffset(offset);
    setOffset(next);
    setActive(null);
    try {
      localStorage.setItem(
        "velogra-featured-offset",
        String(nextFeaturedOffset(next)),
      );
    } catch {}
  };
  const visible = all
    ? templates.filter(
        (template) => category === "All" || template.category === category,
      )
    : featuredStarters(offset);
  return (
    <section className="starter-collection" aria-label="Starter sketches">
      <div className="collection-heading">
        <div>
          <span className="eyebrow">A FEW POSSIBILITIES</span>
          <h2>Start somewhere.</h2>
        </div>
        {!all && (
          <button
            className="text-action"
            onClick={cycleFeatured}
            disabled={busy}
          >
            More inspiration <ArrowRightIcon size={16} />
          </button>
        )}
        {!expanded && (
          <button
            className="text-action"
            onClick={() => {
              setAll(!all);
              setCategory("All");
            }}
            aria-expanded={all}
          >
            {all ? "Show featured" : `Browse all ${templates.length}`}
            <ArrowRightIcon size={16} />
          </button>
        )}
      </div>
      {all && (
        <div className="category-filters" aria-label="Filter starters">
          {[
            "All",
            ...new Set(templates.map((template) => template.category)),
          ].map((item) => (
            <button
              key={item}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item === "All" ? "All" : item.toLowerCase()}
            </button>
          ))}
        </div>
      )}
      <div className="art-grid">
        {visible.map((template) => (
          <button
            className="starter-card"
            key={template.id}
            disabled={busy}
            onClick={() => onSelect(template)}
            onMouseEnter={() => setActive(template.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(template.id)}
            onBlur={() => setActive(null)}
            aria-label={`Start ${template.name}`}
          >
            <StarterArt template={template} active={active === template.id} />
            <span className="starter-caption">
              <span className="eyebrow">{template.category}</span>
              <ArrowUpRightIcon size={19} />
              <strong>{template.name}</strong>
              <span className="starter-description">
                {template.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
