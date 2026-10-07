@echo off
title PAVIO
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo  Node.js nao encontrado. Instale em https://nodejs.org e rode de novo.
    echo.
    pause
    exit /b
)

if not exist node_modules (
    echo Instalando dependencias, so na primeira vez...
    call npm install
)

echo.
echo  PAVIO rodando! O navegador vai abrir sozinho.
echo  Para fechar o jogo, feche esta janela.
echo.
call npm run dev
