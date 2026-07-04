@echo off
title SmoothMotion Web - Servidor local
echo.
echo   Iniciando SmoothMotion Web...
echo.
start "" http://localhost:8080
node "%~dp0serve.js"
pause
