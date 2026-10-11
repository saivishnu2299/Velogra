import { templates } from "./templates";

const examples = templates.filter((template) => template.id !== "blank");
export function featuredStarters(offset: number) {
  const start =
    Number.isSafeInteger(offset) && offset >= 0 ? offset % examples.length : 0;
  return Array.from(
    { length: Math.min(4, examples.length) },
    (_, index) => examples[(start + index) % examples.length],
  );
}
export function nextFeaturedOffset(offset: number) {
  return (
    ((Number.isSafeInteger(offset) && offset >= 0 ? offset : 0) + 4) %
    examples.length
  );
}
