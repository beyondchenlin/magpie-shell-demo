import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Segs } from "../../src/components/Segs";
import { RespectReducedMotion } from "../../src/components/SegThumb";
import "../../src/styles/app.css";
const root = createRoot(document.getElementById("root")!);
function Fixture({ product }: { product: boolean }) {
  const [value, setValue] = useState("a");
  return <RespectReducedMotion.Provider value={product}><Segs id={product ? "product" : "reference"} value={value} items={[{id:"a", label:"First"},{id:"b",label:"Second with longer text"}]} onChange={setValue}/></RespectReducedMotion.Provider>;
}
root.render(<StrictMode><Fixture product/><Fixture product={false}/></StrictMode>);
(window as any).unmountFixture=()=>root.unmount();
