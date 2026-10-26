from pathlib import Path
import hashlib

root = Path(__file__).resolve().parent.parent
files = [
    root / "standalone" / "KaniDojo-v2.html",
    root / "docs" / "KaniDojo-v2.html",
    root / "windows" / "KaniDojo-Setup-2.0.0.exe",
    root / "windows" / "KaniDojo-2.0.0-win-x64-portable.zip",
    root / "linux" / "KaniDojo-2.0.0-linux-x64.run",
    root / "linux" / "KaniDojo-2.0.0-linux-x64.tar.gz",
    root / "app" / "index.html",
    root / "audio" / "index.json",
]
lines = []
for path in files:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    lines.append(f"{digest}  {path.relative_to(root).as_posix()}\n")
(root / "CHECKSUMS.txt").write_bytes("".join(lines).encode("ascii"))
print("CHECKSUMS.txt updated")
