const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

app.setName("KaniDojo");
app.setPath("userData", path.join(app.getPath("appData"), "KaniDojo"));

let mainWindow = null;
let splashWindow = null;

function createWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 260,
    frame: false,
    resizable: false,
    show: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#fbf9ff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  splashWindow.loadFile(path.join(__dirname, "app", "splash.html"));

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1000,
    minWidth: 820,
    minHeight: 620,
    show: false,
    backgroundColor: "#fbf9ff",
    icon: path.join(__dirname, "electron", "assets", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      v8CacheOptions: "code"
    }
  });

  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  };

  mainWindow.loadFile(path.join(__dirname, "app", "index.html"));
  mainWindow.once("ready-to-show", reveal);
  mainWindow.webContents.once("did-finish-load", reveal);
  mainWindow.webContents.on("did-fail-load", reveal);
  setTimeout(reveal, 12000);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  });
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

app.setAppUserModelId("com.kanidojo.v2");
Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
