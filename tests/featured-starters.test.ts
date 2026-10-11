import { test } from "node:test";
import assert from "node:assert/strict";
import {
  featuredStarters,
  nextFeaturedOffset,
} from "../app/studio/featured-starters";
import { templates } from "../app/studio/templates";

test("featured rotation shows four unique examples and reaches every example", () => {
  let offset = 0;
  const seen = new Set<string>();
  for (let page = 0; page < templates.length; page++) {
    const group = featuredStarters(offset);
    assert.equal(group.length, 4);
    assert.equal(new Set(group.map((t) => t.id)).size, 4);
    for (const template of group) {
      assert.notEqual(template.id, "blank");
      seen.add(template.id);
    }
    const next = nextFeaturedOffset(offset);
    assert.equal(
      group.filter((t) => featuredStarters(next).some((n) => n.id === t.id))
        .length,
      0,
    );
    offset = next;
  }
  assert.equal(seen.size, templates.length - 1);
});
test("invalid saved rotation offsets recover safely", () => {
  for (const offset of [NaN, Infinity, -2, 1.5]) {
    assert.deepEqual(featuredStarters(offset), featuredStarters(0));
    assert.equal(nextFeaturedOffset(offset), 4);
  }
});
