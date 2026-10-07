// Ponte mínima entre o jogo e a janela do Windows: sair e tela cheia.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  sair: () => ipcRenderer.send('desktop:sair'),
  telaCheia: (ligar) => ipcRenderer.send('desktop:telaCheia', ligar),
  estaEmTelaCheia: () => ipcRenderer.invoke('desktop:estaEmTelaCheia'),
});
