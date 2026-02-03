# NixOS Build Environment

Docker-based build environment for creating Linux packages on NixOS (which lacks native dpkg/rpm tools).

Use this to build `.deb`, `.rpm`, and `.pacman` packages locally before release.

## Prerequisites

- Docker installed and running

## Usage

### Build Docker Image

The image is built automatically on first use, but you can build it manually:

```bash
docker build -t qepton-builder .
```

### Build Packages

```bash
# Build all Linux packages (deb, rpm, pacman)
./build-packages.sh all

# Build specific package types
./build-packages.sh deb
./build-packages.sh rpm
./build-packages.sh pacman

# Build multiple types
./build-packages.sh "deb rpm"
```

### Manual Build

You can also run the container interactively:

```bash
docker run --rm -it \
  -v "$(pwd)/..:/app" \
  -w /app \
  qepton-builder \
  bash
```

Then inside the container:

```bash
npm install
npm run build:electron
```

## Output

Built packages are saved to `../dist/electron/Packaged/`:

- `*.deb` - Debian/Ubuntu package
- `*.rpm` - Fedora/RHEL package
- `*.pacman` - Arch Linux package
- `*.AppImage` - Universal Linux AppImage
- `*.snap` - Snap package

## Included Tools

The Docker image includes:

- Node.js 20.x
- npm
- dpkg/dpkg-dev (for .deb)
- rpm (for .rpm)
- fpm (Ruby gem for building various formats)
- libarchive-tools, zstd (for .pacman)
