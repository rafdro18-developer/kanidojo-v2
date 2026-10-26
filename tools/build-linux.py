from pathlib import Path
import tarfile
import os
import io
import hashlib

root = Path(r"C:/Users/Rafaela/Desktop/KaniDojo-v2")
src = root / "dist" / "linux-unpacked"
name = "KaniDojo-2.0.0-linux-x64"
out = root / "linux" / f"{name}.tar.gz"
exe_names = {"kanidojo", "chrome-sandbox", "chrome_crashpad_handler"}

with tarfile.open(out, "w:gz", compresslevel=9) as tar:
    dir_info = tarfile.TarInfo(name)
    dir_info.type = tarfile.DIRTYPE
    dir_info.mode = 0o755
    dir_info.mtime = int(src.stat().st_mtime)
    tar.addfile(dir_info)
    for base, dirs, files in os.walk(src):
        rel = Path(base).relative_to(src)
        dirs.sort()
        files.sort()
        for d in dirs:
            p = Path(base) / d
            r = Path(name) / rel / d
            ti = tarfile.TarInfo(r.as_posix())
            ti.type = tarfile.DIRTYPE
            ti.mode = 0o755
            ti.mtime = int(p.stat().st_mtime)
            tar.addfile(ti)
        for f in files:
            p = Path(base) / f
            r = Path(name) / rel / f
            ti = tarfile.TarInfo(r.as_posix())
            ti.size = p.stat().st_size
            ti.mode = 0o755 if f in exe_names else 0o644
            ti.mtime = int(p.stat().st_mtime)
            with p.open("rb") as fh:
                tar.addfile(ti, fh)
    run = b'#!/bin/sh\nHERE="$(cd "$(dirname "$0")" && pwd)"\nexec "$HERE/kanidojo" --no-sandbox "$@"\n'
    ti = tarfile.TarInfo(f"{name}/run.sh")
    ti.size = len(run)
    ti.mode = 0o755
    ti.mtime = int(src.stat().st_mtime)
    tar.addfile(ti, io.BytesIO(run))

tar_bytes = out.read_bytes()
stub_template = """#!/bin/sh
set -e
APP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/kanidojo-v2/2.0.0"
MARKER="$APP_DIR/.complete"
if [ ! -f "$MARKER" ]; then
  mkdir -p "$APP_DIR"
  tail -c +__OFFSET__ "$0" | tar -xz -C "$APP_DIR"
  touch "$MARKER"
fi
exec "$APP_DIR/KaniDojo-2.0.0-linux-x64/run.sh" "$@"
exit 0
__ARCHIVE_BELOW__
"""
# offset is 1-indexed. The offset digits are part of the stub, so iterate to a stable value.
offset = 1000
while True:
    stub = stub_template.replace("__OFFSET__", str(offset)).encode("utf-8")
    new_offset = len(stub) + 1
    if new_offset == offset:
        break
    offset = new_offset
stub = stub_template.replace("__OFFSET__", str(offset)).encode("utf-8")
run_path = root / "linux" / f"{name}.run"
run_path.write_bytes(stub + tar_bytes)
os.chmod(run_path, 0o755)

print(out, out.stat().st_size)
print(run_path, run_path.stat().st_size, "offset", offset)
print("tar sha256", hashlib.sha256(tar_bytes).hexdigest())
print("run sha256", hashlib.sha256(run_path.read_bytes()).hexdigest())
