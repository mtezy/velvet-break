"""Zip the static web build with index.html at the archive root."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
release = root / 'release'
release.mkdir(exist_ok=True)
with ZipFile(release / 'velvet-break-opengame.zip', 'w', ZIP_DEFLATED) as archive:
    for path in sorted((root / 'dist').rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(root / 'dist'))
print(release / 'velvet-break-opengame.zip')
