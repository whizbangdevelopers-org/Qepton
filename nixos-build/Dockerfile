# Docker image for building Linux packages (deb, rpm, pacman)
# Used for NixOS and other systems without native package tools

FROM ubuntu:22.04

# Avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    gnupg \
    lsb-release \
    software-properties-common \
    # For Node.js
    ca-certificates \
    # For Electron builds
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libatspi2.0-0 \
    libuuid1 \
    libsecret-1-0 \
    # For package building
    dpkg \
    dpkg-dev \
    fakeroot \
    rpm \
    # For pacman packages
    libarchive-tools \
    zstd \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install ruby and fpm for building various package formats
RUN apt-get update && apt-get install -y ruby ruby-dev build-essential \
    && gem install fpm \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Set npm cache to a writable location
ENV npm_config_cache=/tmp/.npm

# Default command
CMD ["bash"]
