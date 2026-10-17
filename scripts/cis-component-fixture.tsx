// Test-only public component contract fixture. Never imported by the product.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ProtoMultiMenu } from "./src/components/ProtoMultiMenu";
import "./src/styles/app.css";
import "./src/styles/shell-patch.css";

const options = [
  { v: "\x00", name: "Read-only note", literalName: true },
  { v: "", name: "All", literalName: true },
  { v: "a", name: "Alpha", literalName: true },
  { v: "b", name: "Beta", literalName: true },
  { v: "c", name: "Gamma", literalName: true },
];
function Fixture() {
  const [live, setLive] = useState(false);
  const [value, setValue] = useState<string[]>(["b"]);
  const [commits, setCommits] = useState<string[][]>([]);
  const [closes, setCloses] = useState(0);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const mode = (next: boolean) => {
    setAnchor(null); setLive(next); setValue(["b"]); setCommits([]); setCloses(0);
  };
  return <div style={{ padding: 60 }}>
    <h1>CIS isolated component contract</h1>
    <p>Only local mock values; no API calls or browser preferences.</p>
    <button onClick={() => mode(false)}>Deferred mode</button>{" "}
    <button onClick={() => mode(true)}>Live mode</button>{" "}
    <button id="fixture-anchor" aria-haspopup="menu" aria-expanded={!!anchor}
      onClick={e => setAnchor(e.currentTarget)}>Open menu</button>{" "}
    <button id="fixture-outside">Outside</button>
    <pre id="component-evidence">{JSON.stringify({ live, value, commits, closes })}</pre>
    {anchor ? <ProtoMultiMenu open anchor={anchor} live={live} value={value}
      align="left" head="Contract options" options={options}
      onChange={next => {
        const selected = Array.isArray(next) ? next : [next];
        setValue(selected); setCommits(previous => [...previous, selected]);
      }} onClose={() => { setAnchor(null); setCloses(previous => previous + 1); }} /> : null}
  </div>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
