import { DEFAULT_PARAMS, type Project } from "./projects";
export const P5_LATEST = "2.3.4";
export const P5_LEGACY = "1.11.11";
export const html = (version = P5_LATEST) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My canvas</title>
    <link rel="stylesheet" href="style.css" />
    <script src="https://cdn.jsdelivr.net/npm/p5@${version}/lib/p5.min.js"></script>
  </head>
  <body>
    <main></main>
    <script src="sketch.js"></script>
  </body>
</html>`;
export const css = `html, body {
  margin: 0;
  padding: 0;
  background: #12151a;
}

body {
  min-height: 100vh;
  display: grid;
  place-items: center;
}

canvas {
  display: block;
}
`;
export const orbit = `// Your first idea: a circle made of circles.
// Try the color, detail, and motion controls below.
// Move your pointer over the canvas to bend the orbit.
let time = 0;

function setup() {
  createCanvas(640, 640);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(220, 26, 10);
  translate(width / 2, height / 2);
  noFill();

  // studio values come from the visual controls.
  const { hue, density, speed } = window.studio;
  const bend = map(mouseX, 0, width, -0.3, 0.3);

  for (let i = 0; i < density; i++) {
    const angle = i * TWO_PI / density;
    const radius = 138 + 18 * sin(angle * 3 + time);
    const x = cos(angle) * radius;
    const y = sin(angle) * radius;

    stroke((hue + i * 1.5) % 360, 36, 96, 65);
    strokeWeight(0.8);
    push();
    translate(x, y);
    rotate(angle + time * 0.2 + bend);
    ellipse(0, 0, 205, 116);
    pop();
  }

  time += speed * 0.00025;
}
`;
export type Template = {
  id: string;
  name: string;
  category: string;
  description: string;
  tip: string;
  color: string;
  code: string;
  sound?: boolean;
};
export const templates: Template[] = [
  {
    id: "orbit",
    name: "Chromatic orbit",
    category: "GENERATIVE",
    description: "Circles, layered into something unexpected.",
    tip: "Move your pointer across the canvas. Try a new color or slow the motion.",
    color: "#acd8cd",
    code: orbit,
  },
  {
    id: "brush",
    name: "A line of thought",
    category: "DRAWING",
    description: "Let your hand lead. Paint with your pointer.",
    tip: "Click and drag to paint. Press C to clear the canvas. Change color below.",
    color: "#d7af92",
    code: `// Click and drag to leave your mark.
// Press C to clear and begin again.
function setup() {
  createCanvas(640, 640);
  colorMode(HSB, 360, 100, 100, 100);
  background(220, 4, 96);
}

function draw() {
  if (mouseIsPressed && mouseX >= 0 && mouseX <= width) {
    const { hue, density } = window.studio;
    stroke(hue, 48, 68, 85);
    strokeWeight(density / 6);
    line(pmouseX, pmouseY, mouseX, mouseY);
  }
}

function keyPressed() {
  if (key === 'c' || key === 'C') background(220, 4, 96);
}
`,
  },
  {
    id: "waves",
    name: "Tidal lines",
    category: "MOTION",
    description: "A quiet landscape of flowing sine waves.",
    tip: "Change detail to add more waves. Slow the motion to find a still moment.",
    color: "#9aaaca",
    code: `// A landscape drawn with just a sine wave.
let time = 0;

function setup() {
  createCanvas(640, 640);
  colorMode(HSB, 360, 100, 100);
}

function draw() {
  background(220, 26, 10);
  const { hue, density, speed } = window.studio;
  noFill();
  strokeWeight(1.2);

  for (let row = 0; row < density; row++) {
    stroke((hue + row * 1.4) % 360, 35, 90);
    beginShape();
    for (let x = 40; x <= width - 40; x += 4) {
      const y = 80 + row * 480 / density;
      const wave = sin(x * 0.012 + time + row * 0.1);
      vertex(x, y + wave * 36);
    }
    endShape();
  }
  time += speed * 0.0005;
}
`,
  },
  {
    id: "space",
    name: "Another dimension",
    category: "3D · WEBGL",
    description: "A sculptural form you can turn in your hands.",
    tip: "Drag to rotate. Scroll to zoom. WEBGL opens up three dimensions.",
    color: "#b5bbd5",
    code: `// WEBGL turns the canvas into a 3D space.
let time = 0;

function setup() {
  createCanvas(640, 640, WEBGL);
  colorMode(HSB, 360, 100, 100);
}

function draw() {
  background(220, 26, 10);
  orbitControl(); // drag to look around
  const { hue, density, speed } = window.studio;
  rotateX(-0.5);
  rotateY(time);
  noFill();
  strokeWeight(0.8);
  stroke(hue, 30, 90);
  torus(145, 58, round(map(density, 12, 120, 12, 24)), 16);
  time += speed * 0.0002;
}
`,
  },
  {
    id: "sound",
    name: "Something to hear",
    category: "SOUND",
    description: "Play a tone and give it a shape.",
    tip: "Click and hold the canvas to play a tone. Move left or right to change its pitch.",
    color: "#c7c594",
    sound: true,
    code: `// Click and hold to play. Your pointer sets the pitch.
let oscillator;
let playing = false;

function setup() {
  createCanvas(640, 640);
  colorMode(HSB, 360, 100, 100);
  oscillator = new p5.Oscillator('sine');
  oscillator.amp(0);
}

function draw() {
  const { hue, density } = window.studio;
  background(220, 26, 10);
  noFill();
  stroke(hue, 38, 92);
  strokeWeight(1.5);
  for (let i = 0; i < density / 3; i++) {
    const pulse = playing ? sin(frameCount * 0.12 + i) * 10 : 0;
    circle(width / 2, height / 2, 40 + i * 14 + pulse);
  }
  if (playing) oscillator.freq(map(mouseX, 0, width, 110, 880));
  noStroke();
  fill(220, 8, 80);
  textAlign(CENTER);
  text('Click and hold to play a tone', width / 2, height - 55);
}

function mousePressed() {
  userStartAudio();
  if (!playing) oscillator.start();
  oscillator.amp(0.12, 0.1);
  playing = true;
}

function mouseReleased() {
  oscillator.amp(0, 0.1);
  playing = false;
}
`,
  },
  {
    id: "blank",
    name: "An open canvas",
    category: "FROM SCRATCH",
    description: "A few lines. The rest is yours.",
    tip: "Change the circle to a rect, add color, or try a new shape. The Reference panel can help.",
    color: "#b4b8be",
    code: `// A blank page for your next idea.
// setup() runs once. draw() runs again and again.
function setup() {
  createCanvas(640, 640);
  colorMode(HSB, 360, 100, 100);
}

function draw() {
  background(220, 4, 96);

  // Draw something here.
  const { hue, density } = window.studio;
  fill(hue, 40, 65);
  noStroke();
  circle(mouseX, mouseY, density);
}
`,
  },
];
export function makeProject(template = templates[0]): Project {
  const version = template.sound ? P5_LEGACY : P5_LATEST;
  let index = html(version);
  if (template.sound)
    index = index.replace(
      "  </head>",
      `    <script src="https://cdn.jsdelivr.net/npm/p5@${version}/lib/addons/p5.sound.min.js"></script>\n  </head>`,
    );
  return {
    id: crypto.randomUUID(),
    name: template.name,
    template: template.id,
    version,
    params: { ...DEFAULT_PARAMS },
    updated: Date.now(),
    files: [
      { name: "sketch.js", content: template.code },
      { name: "index.html", content: index },
      { name: "style.css", content: css },
    ],
  };
}
