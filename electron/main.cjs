const { app, BrowserWindow } = require("electron");
const path = require("path");

const W = 660;
const H = 600;
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
