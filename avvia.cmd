@echo off
rem Avvia il server locale e apre l'applicazione nel browser predefinito.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non trovato: installalo da https://nodejs.org/ oppure servi la cartella con un altro server web.
  pause
  exit /b 1
)
start "" http://localhost:8080/
node server.js 8080
