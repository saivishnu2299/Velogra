"use client";
import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { indentWithTab } from "@codemirror/commands";
import { javascript, scopeCompletionSource } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { autocompletion, completeFromList } from "@codemirror/autocomplete";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const p5Names =
  "setup draw preload windowResized mousePressed mouseReleased mouseMoved mouseDragged keyPressed keyReleased createCanvas resizeCanvas background clear fill noFill stroke noStroke strokeWeight color colorMode rect square circle ellipse arc line point triangle quad beginShape endShape vertex curveVertex bezier text textSize textFont textAlign textWidth image loadImage loadFont loadJSON loadStrings loadTable loadSound createVideo createCapture createButton createSlider createInput select selectAll random randomSeed noise noiseSeed map lerp constrain dist sin cos tan atan2 sqrt pow abs floor ceil round min max push pop translate rotate rotateX rotateY rotateZ scale resetMatrix frameRate noLoop loop redraw saveCanvas saveGif pixelDensity loadPixels updatePixels get set filter blend createGraphics createVector box sphere torus cone cylinder plane ambientLight directionalLight pointLight lights normalMaterial texture shader createShader loadShader orbitControl perspective camera userStartAudio width height mouseX mouseY pmouseX pmouseY mouseIsPressed key keyCode frameCount deltaTime windowWidth windowHeight PI TWO_PI HALF_PI WEBGL P2D HSB RGB CENTER CORNER CLOSE DEGREES RADIANS".split(
    " ",
  );
const highlight = HighlightStyle.define([
  { tag: tags.comment, color: "var(--code-comment)" },
  { tag: [tags.keyword, tags.operator], color: "var(--code-keyword)" },
  {
    tag: [tags.string, tags.special(tags.string)],
    color: "var(--code-string)",
  },
  { tag: tags.number, color: "var(--code-number)" },
  {
    tag: [tags.function(tags.variableName), tags.definition(tags.variableName)],
    color: "var(--code-function)",
  },
  { tag: tags.variableName, color: "var(--foreground)" },
]);
export function CodeEditor({
  fileKey,
  name,
  value,
  dark,
  onChange,
  onCursor,
  onRun,
  fontSize = 14,
}: {
  fileKey: string;
  name: string;
  value: string;
  dark: boolean;
  onChange: (v: string) => void;
  onCursor: (l: number, c: number) => void;
  onRun: () => void;
  fontSize?: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    states = useRef(new Map<string, EditorState>());
  const callbacks = useRef({ onChange, onCursor, onRun });
  useEffect(() => {
    callbacks.current = { onChange, onCursor, onRun };
  }, [onChange, onCursor, onRun]);
  const theme = useRef(new Compartment()),
    size = useRef(new Compartment());
  useEffect(() => {
    if (!host.current) return;
    const language = name.endsWith(".html")
      ? html()
      : name.endsWith(".css")
        ? css()
        : javascript({ jsx: true });
    const cache = states.current;
    const state = cache.get(fileKey);
    const v = new EditorView({
      parent: host.current,
      state:
        state ??
        EditorState.create({
          doc: value,
          extensions: [
            basicSetup,
            language,
            syntaxHighlighting(highlight),
            autocompletion(
              name.endsWith(".js")
                ? {
                    override: [
                      scopeCompletionSource(globalThis),
                      completeFromList(
                        p5Names.map((label) => ({
                          label,
                          type: /^[A-Z_]+$/.test(label)
                            ? "constant"
                            : "function",
                        })),
                      ),
                    ],
                  }
                : {},
            ),
            EditorState.tabSize.of(2),
            EditorView.lineWrapping,
            keymap.of([
              indentWithTab,
              {
                key: "Mod-Enter",
                run: () => {
                  callbacks.current.onRun();
                  return true;
                },
              },
            ]),
            theme.current.of(EditorView.theme({}, { dark })),
            size.current.of(
              EditorView.theme({ "&": { fontSize: `${fontSize}px` } }),
            ),
            EditorView.updateListener.of((update) => {
              if (update.docChanged)
                callbacks.current.onChange(update.state.doc.toString());
              if (update.selectionSet || update.docChanged) {
                const pos = update.state.selection.main.head,
                  line = update.state.doc.lineAt(pos);
                callbacks.current.onCursor(line.number, pos - line.from + 1);
              }
            }),
          ],
        }),
    });
    view.current = v;
    return () => {
      cache.set(fileKey, v.state);
      v.destroy();
      view.current = null;
    };
    // Each file keeps its own undo and selection history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey, name]);
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value)
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: value },
      });
  }, [value]);
  useEffect(() => {
    view.current?.dispatch({
      effects: [
        theme.current.reconfigure(EditorView.theme({}, { dark })),
        size.current.reconfigure(
          EditorView.theme({ "&": { fontSize: `${fontSize}px` } }),
        ),
      ],
    });
  }, [dark, fontSize]);
  return (
    <div
      className="editor-host"
      ref={host}
      aria-label={`Code editor: ${name}`}
    />
  );
}
