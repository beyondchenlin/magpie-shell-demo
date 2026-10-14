const { app, BrowserWindow } = require("electron");
const path = require("path");

/* Native Magpie Linux measured ~712×652; Magpie window_rule default ~660×600.
   Prefer measured native size for desktop 1:1 chrome. */
const W = 712;
const H = 652;
const MIN_W = 560;
const MIN_H = 420;

function create() {
  const win = new BrowserWindow({
    width: W,
    height: H,
    minWidth: MIN_W,
    minHeight: MIN_H,
    title: "magpie",
    backgroundColor: "#f4f4f6",
    frame: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(create);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) create();
});
