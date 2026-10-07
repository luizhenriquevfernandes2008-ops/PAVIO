// PAVIO para desktop: abre o jogo numa janela própria (Electron), 100% offline.
// O jogo já compilado (pasta dist, feita pelo "vite build") é servido por um protocolo interno
// (app://pavio/), assim tudo funciona igual no navegador e o save (localStorage) fica guardado no PC.
const { app, BrowserWindow, protocol, net, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const RAIZ = path.join(__dirname, '..', 'dist');
const HOST = 'pavio';

// gráficos: usa a placa de vídeo dedicada nos notebooks e não deixa o Chromium recusar a GPU
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
// a música e os efeitos tocam sem precisar de clique antes
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// só uma janela do jogo aberta por vez (o save é um só)
if (!app.requestSingleInstanceLock()) app.quit();

// tamanho/posição da janela e tela cheia ficam guardados entre as sessões
const arquivoJanela = () => path.join(app.getPath('userData'), 'janela.json');
function lerJanela() {
  try {
    return JSON.parse(fs.readFileSync(arquivoJanela(), 'utf8').trim());
  } catch {
    return { telaCheia: true };
  }
}
function salvarJanela(win) {
  try {
    const b = win.getNormalBounds();
    fs.writeFileSync(arquivoJanela(), JSON.stringify({ telaCheia: win.isFullScreen(), maximizada: win.isMaximized(), bounds: b }));
  } catch {
    // sem problema: abre no padrão da próxima vez
  }
}

let win = null;
function criarJanela() {
  const st = lerJanela();
  win = new BrowserWindow({
    title: 'PAVIO',
    width: st.bounds?.width || 1280,
    height: st.bounds?.height || 832,
    x: st.bounds?.x,
    y: st.bounds?.y,
    minWidth: 960,
    minHeight: 624,
    backgroundColor: '#07050b',
    fullscreen: !!st.telaCheia,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
  });
  if (st.maximizada && !st.telaCheia) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.on('close', () => salvarJanela(win));
  // F11 ou Alt+Enter: tela cheia · Ctrl+Shift+I só funciona rodando pelo código (npm run app)
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
    if (!app.isPackaged && input.control && input.shift && input.key.toLowerCase() === 'i') win.webContents.toggleDevTools();
  });
  // links para fora abrem no navegador do jogador
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith(`app://${HOST}/`)) return;
    e.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });
  win.loadURL(`app://${HOST}/index.html`);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  // app://pavio/<arquivo> -> arquivo do jogo dentro do pacote (nunca sai da pasta do jogo)
  protocol.handle('app', (req) => {
    const u = new URL(req.url);
    let rel = decodeURIComponent(u.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const arquivo = path.normalize(path.join(RAIZ, rel));
    if (u.host !== HOST || !arquivo.startsWith(RAIZ + path.sep)) return new Response('proibido', { status: 403 });
    return net.fetch(pathToFileURL(arquivo).toString());
  });
  ipcMain.on('desktop:sair', () => app.quit());
  ipcMain.on('desktop:telaCheia', (_e, ligar) => {
    if (win) win.setFullScreen(ligar == null ? !win.isFullScreen() : !!ligar);
  });
  ipcMain.handle('desktop:estaEmTelaCheia', () => !!win?.isFullScreen());
  criarJanela();
});
app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
app.on('window-all-closed', () => app.quit());
