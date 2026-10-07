@echo off
title PAVIO - gerar o instalador
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
if not exist node_modules\electron\dist\electron.exe (
    echo Baixando o Electron...
    call node node_modules\electron\install.js
)

echo.
echo  Gerando o instalador do PAVIO (leva uns minutos)...
echo.
call npm run dist
if errorlevel 1 (
    echo.
    echo  Deu erro ao gerar o instalador. Veja as mensagens acima.
    pause
    exit /b
)

echo.
echo  Pronto! O instalador esta na pasta "release".
start "" "%~dp0release"
pause
