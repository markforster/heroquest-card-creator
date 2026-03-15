@echo off
setlocal

set ROOT_DIR=%~dp0
set MINISERVE_DIR=%ROOT_DIR%miniserve

if not exist "%MINISERVE_DIR%" (
  echo miniserve directory not found at %MINISERVE_DIR%
  exit /b 1
)

for %%F in ("%MINISERVE_DIR%\miniserve-hqcc-*-windows-msvc.exe") do (
  set BIN=%%~fF
  goto :FOUND
)

echo miniserve binary not found for Windows.
exit /b 1

:FOUND
"%BIN%" --index index.html --spa %*
endlocal
