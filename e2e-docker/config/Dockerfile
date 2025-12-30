# Qepton E2E Testing Docker Image
# Based on official Playwright image with all browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

# Install additional system dependencies
RUN apt-get update && apt-get install -y \
    git \
    openssh-client \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browsers and dependencies
RUN npx playwright install --with-deps

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=test
ENV CI=true
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Expose ports for dev server and Playwright UI
EXPOSE 9000 9323

# Default command runs tests
CMD ["npx", "playwright", "test", "--workers=4"]
