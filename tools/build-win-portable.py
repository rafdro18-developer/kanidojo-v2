from pathlib import Path
import shutil
import zipfile

root = Path(__file__).resolve().parent.parent
src = root / "dist" / "win-unpacked"
out = root / "windows" / "KaniDojo-2.0.0-win-x64-portable.zip"
installer = root / "dist" / "KaniDojo-Setup-2.0.0.exe"
installer_out = root / "windows" / "KaniDojo-Setup-2.0.0.exe"

if not src.exists():
    raise SystemExit("dist/win-unpacked is missing; run npm run dist:win first")
if installer.exists():
    shutil.copyfile(installer, installer_out)
if out.exists():
    out.unlink()
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for path in src.rglob("*"):
        if path.is_file():
            archive.write(path, Path("KaniDojo-2.0.0-win-x64") / path.relative_to(src))
print(out, out.stat().st_size)
