@echo off
node "%~dp0tools\serve.mjs" --open
if errorlevel 1 pause
