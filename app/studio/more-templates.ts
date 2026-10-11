import type { Template } from "./templates";

// Self-contained p5 sketches: every example works without another dependency.
export const moreTemplates: Template[] = [
  {
    id: "flow",
    name: "Quiet currents",
    category: "GENERATIVE",
    description: "A thousand small journeys through a field of noise.",
    tip: "Move the pointer to bend the currents. Click to start a new field.",
    color: "#83cfc3",
    code: `let particles = [];
function setup() {
  createCanvas(640, 640); colorMode(HSB, 360, 100, 100, 100);
  background(225, 35, 9);
  for (let i = 0; i < 700; i++) particles.push(createVector(random(width), random(height)));
}
function draw() {
  const { hue, speed, density } = window.studio;
  strokeWeight(0.7);
  for (let i = 0; i < min(particles.length, density * 8); i++) {
    const p = particles[i], x = p.x, y = p.y;
    const a = noise(x * 0.004, y * 0.004, frameCount * 0.001) * TWO_PI * 2 + mouseX * 0.001;
    p.x += cos(a) * (0.4 + speed / 30); p.y += sin(a) * (0.4 + speed / 30);
    stroke((hue + i / 15) % 360, 45, 90, 22); line(x, y, p.x, p.y);
    if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) p.set(random(width), random(height));
  }
}
function mousePressed() { noiseSeed(floor(random(10000))); background(225, 35, 9); }
`,
  },
  {
    id: "spirograph",
    name: "Thread choreography",
    category: "GEOMETRY",
    description: "Fine threads trace a slowly changing mathematical flower.",
    tip: "Move your pointer to change the flower's frequency. Try reducing Detail.",
    color: "#e5b5be",
    code: `function setup() { createCanvas(640, 640); colorMode(HSB, 360, 100, 100, 100); }
function draw() {
  background(240, 25, 9); translate(width / 2, height / 2); noFill();
  const { hue, speed, density } = window.studio;
  const t = frameCount * speed * 0.0001, ratio = 3 + mouseX / width;
  for (let j = 0; j < max(8, density / 2); j++) {
    stroke((hue + j * 3) % 360, 40, 95, 55); strokeWeight(0.65); beginShape();
    for (let i = 0; i <= 500; i++) {
      const a = i * TWO_PI / 500;
      const r = 170 + 65 * cos(ratio * a + t + j * 0.09);
      vertex(r * cos(a + j * 0.025), r * sin(a + j * 0.025));
    }
    endShape(CLOSE);
  }
}
`,
  },
  {
    id: "terrain",
    name: "Paper mountains",
    category: "3D · WEBGL",
    description: "Fly above a folded landscape drawn in luminous wire.",
    tip: "Drag to orbit the landscape. Speed controls the passing terrain.",
    color: "#9cc1a0",
    code: `function setup() { createCanvas(640, 640, WEBGL); colorMode(HSB, 360, 100, 100); }
function draw() {
  background(225, 30, 10); orbitControl(); rotateX(PI / 3); translate(-300, -250);
  const { hue, speed, density } = window.studio;
  const step = 600 / floor(map(density, 1, 150, 12, 40));
  noFill(); strokeWeight(1);
  for (let y = 0; y < 500; y += step) {
    stroke((hue + y / 10) % 360, 45, 85); beginShape(TRIANGLE_STRIP);
    for (let x = 0; x <= 600; x += step) {
      for (const dy of [0, step]) vertex(x, y + dy, noise(x * 0.006, (y + dy) * 0.006 + frameCount * speed * 0.0002) * 150);
    }
    endShape();
  }
}
`,
  },
  {
    id: "bloom",
    name: "Recursive bloom",
    category: "GENERATIVE",
    description: "Branches divide into a living, delicate canopy.",
    tip: "Move left and right to open the branches. Detail changes the depth.",
    color: "#dec292",
    code: `function setup() { createCanvas(640, 640); colorMode(HSB, 360, 100, 100); }
function branch(length, depth, angle) {
  const { hue } = window.studio;
  stroke((hue + depth * 8) % 360, 35, 80); strokeWeight(max(0.6, depth * 0.65));
  line(0, 0, 0, -length); translate(0, -length);
  if (depth <= 0) { noStroke(); fill((hue + 70) % 360, 40, 95); circle(0, 0, 4); return; }
  for (const sign of [-1, 1]) { push(); rotate(sign * angle); branch(length * 0.72, depth - 1, angle); pop(); }
}
function draw() {
  background(40, 8, 96); translate(width / 2, height - 40);
  const { density, speed } = window.studio;
  const angle = 0.35 + constrain(mouseX / width, 0, 1) * 0.5 + sin(frameCount * speed * 0.0005) * 0.08;
  branch(135, constrain(floor(density / 18), 3, 8), angle);
}
`,
  },
  {
    id: "halftone",
    name: "Dot atmosphere",
    category: "COLOR",
    description: "A breathing field of dots becomes a soft optical illusion.",
    tip: "Move the pointer to ripple the dots. Detail changes their spacing.",
    color: "#dfa480",
    code: `function setup() { createCanvas(640, 640); colorMode(HSB, 360, 100, 100); noStroke(); }
function draw() {
  background(40, 9, 96);
  const { hue, speed, density } = window.studio;
  const step = map(density, 1, 150, 42, 12), t = frameCount * speed * 0.001;
  for (let y = step; y < height; y += step) for (let x = step; x < width; x += step) {
    const wave = sin(dist(x, y, mouseX, mouseY) * 0.025 - t);
    fill((hue + x / 8 + y / 12) % 360, 55, 65);
    circle(x, y, step * (0.15 + (wave + 1) * 0.33));
  }
}
`,
  },
  {
    id: "constellation",
    name: "Near and far",
    category: "INTERACTIVE",
    description: "Wandering points find fleeting connections in the dark.",
    tip: "Move your pointer to draw connections. Detail changes the number of stars.",
    color: "#bcc5ed",
    code: `let stars = [];
function setup() {
  createCanvas(640, 640); colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 150; i++) stars.push({ x: random(width), y: random(height), a: random(TWO_PI) });
}
function draw() {
  background(235, 35, 8); const { hue, speed, density } = window.studio;
  const points = stars.slice(0, constrain(density, 10, 150));
  for (const p of points) { p.x = (p.x + cos(p.a) * speed / 40 + width) % width; p.y = (p.y + sin(p.a) * speed / 40 + height) % height; }
  points.push({ x: mouseX, y: mouseY });
  for (let i = 0; i < points.length; i++) {
    const p = points[i]; noStroke(); fill(hue, 25, 95); circle(p.x, p.y, 3);
    for (let j = i + 1; j < points.length; j++) {
      const q = points[j], d = dist(p.x, p.y, q.x, q.y);
      if (d < 110) { stroke(hue, 35, 90, (1 - d / 110) * 60); strokeWeight(0.7); line(p.x, p.y, q.x, q.y); }
    }
  }
}
`,
  },
  {
    id: "tiles",
    name: "Chance of a curve",
    category: "GEOMETRY",
    description: "Simple quarter circles assemble into an endless maze.",
    tip: "Click to rearrange the tiles. Detail changes the grid size.",
    color: "#d2afcd",
    code: `let seed = 12;
function setup() { createCanvas(640, 640); colorMode(HSB, 360, 100, 100); }
function draw() {
  background(40, 8, 94); randomSeed(seed); noFill();
  const { hue, density, speed } = window.studio;
  const count = floor(map(density, 1, 150, 4, 18)), tile = width / count;
  strokeWeight(tile * 0.12);
  for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) {
    push(); translate((x + 0.5) * tile, (y + 0.5) * tile); rotate(floor(random(4)) * HALF_PI);
    stroke((hue + x * 5 + y * 3 + sin(frameCount * speed * 0.0003) * 15) % 360, 40, 55);
    arc(-tile / 2, -tile / 2, tile, tile, 0, HALF_PI);
    arc(tile / 2, tile / 2, tile, tile, PI, PI + HALF_PI); pop();
  }
}
function mousePressed() { seed++; }
`,
  },
  {
    id: "type",
    name: "Words in motion",
    category: "TYPOGRAPHY",
    description: "A single word becomes a rolling typographic landscape.",
    tip: "Type letters to change the word. Backspace removes a letter.",
    color: "#b5d494",
    code: `let word = 'PLAY';
function setup() { createCanvas(640, 640); colorMode(HSB, 360, 100, 100); textAlign(CENTER, CENTER); textStyle(BOLD); }
function draw() {
  background(240, 20, 10); const { hue, speed, density } = window.studio;
  const rows = constrain(floor(density / 9), 4, 16), gap = height / rows;
  textSize(min(gap * 0.95, 520 / max(1, word.length) * 1.5));
  for (let i = 0; i < rows; i++) {
    const phase = frameCount * speed * 0.001 + i * 0.45;
    fill((hue + i * 8) % 360, 45, 90); noStroke();
    text(word || ' ', width / 2 + sin(phase) * 60, (i + 0.5) * gap);
  }
}
function keyPressed() {
  if (keyCode === BACKSPACE) { word = word.slice(0, -1); return false; }
  if (/^[a-zA-Z]$/.test(key) && word.length < 10) word += key.toUpperCase();
}
`,
  },
  {
    id: "pendulum",
    name: "Falling into rhythm",
    category: "MOTION",
    description: "Different tempos gather into mesmerizing pendulum waves.",
    tip: "Speed changes the tempo; Detail adds more pendulums.",
    color: "#e0b69f",
    code: `function setup() { createCanvas(640, 640); colorMode(HSB, 360, 100, 100, 100); }
function draw() {
  background(225, 25, 9); const { hue, speed, density } = window.studio;
  const n = constrain(floor(density / 4), 8, 36), t = frameCount * speed * 0.0004;
  for (let i = 0; i < n; i++) {
    const y = 80 + i * 480 / n, x = width / 2 + sin(t * (1 + i * 0.035)) * 230;
    stroke(hue, 20, 75, 22); strokeWeight(1); line(width / 2, 30, x, y);
    noStroke(); fill((hue + i * 5) % 360, 45, 95); circle(x, y, 10 + i * 0.25);
  }
}
`,
  },
  {
    id: "ribbons",
    name: "Silk in space",
    category: "3D · WEBGL",
    description: "Sculptural ribbons turn through an imaginary gallery.",
    tip: "Drag to orbit. Detail adds ribbons; Speed sets their rotation.",
    color: "#aeb8df",
    code: `function setup() { createCanvas(640, 640, WEBGL); colorMode(HSB, 360, 100, 100); }
function draw() {
  background(235, 22, 10); orbitControl(); rotateY(frameCount * window.studio.speed * 0.0002); rotateX(-0.35);
  const { hue, density } = window.studio;
  ambientLight(0, 0, 65); directionalLight(0, 0, 100, 0.4, 0.3, -1); noStroke();
  const n = constrain(floor(density / 12), 3, 12);
  for (let j = 0; j < n; j++) {
    fill((hue + j * 14) % 360, 38, 85); beginShape(TRIANGLE_STRIP);
    for (let i = 0; i <= 100; i++) {
      const a = i * TWO_PI / 100, r = 140 + j * 6;
      for (const edge of [-1, 1]) vertex(cos(a) * (r + edge * 8), sin(a * 3 + j * 0.5) * 60 + (j - n / 2) * 16, sin(a) * (r + edge * 8));
    }
    endShape();
  }
}
`,
  },
];
