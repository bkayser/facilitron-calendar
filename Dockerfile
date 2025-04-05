# Dockerfile

# ---- Base ----
# Use a specific Node.js LTS version on Alpine for smaller image size
# Update '20' to the desired LTS version (e.g., 22) if needed

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /usr/src/app

# Install OS dependencies if any (e.g., for native modules, though not needed here)
# RUN apk add --no-cache some-package

# ---- Dependencies ----
# Install production dependencies separately for better caching
FROM base AS deps
# Copy only package files
COPY package.json package-lock.json* ./
# Install production dependencies only
RUN npm ci --omit=dev

# ---- Build ----
# Build the TypeScript application
FROM base AS build
# Copy dependency artifacts and source code
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
# Install ALL dependencies (including dev) needed for build
RUN npm ci
# Run the TypeScript build script defined in package.json
RUN npm run build
# Prune development dependencies after build
RUN npm prune --omit=dev

# ---- Release ----
# Create the final, small production image
FROM base AS release
WORKDIR /usr/src/app

# Set the NODE_ENV to production
ENV NODE_ENV=production

# Create a non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy necessary files from the 'build' stage
COPY --from=build --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /usr/src/app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /usr/src/app/package.json ./package.json

# Switch to the non-root user
USER nodejs

# Expose the port the app listens on.
# Cloud Run will inject the PORT env var (usually 8080).
# Our app reads process.env.PORT, defaulting to 3000 if not set.
# Exposing is good practice but Cloud Run mainly relies on the app listening on $PORT.
# Let's expose 8080 as that's Cloud Run's default. Adjust if your app MUST use 3000.
EXPOSE 8080

# Define the command to run the application
# This executes `node dist/server.js`
CMD [ "node", "dist/server.js" ]
