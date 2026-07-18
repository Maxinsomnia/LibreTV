FROM node:20-alpine
LABEL maintainer="LibreTV Team"
LABEL description="LibreTV - 免费在线视频搜索与观看平台"

WORKDIR /app

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Start the server
CMD ["node", "server.js"]
