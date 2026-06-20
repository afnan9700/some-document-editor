# Stage 1: Build the Angular application
FROM docker.io/library/node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# Compile the application for production
RUN npm run build --configuration=production

# Stage 2: Serve the application using Nginx
FROM docker.io/library/nginx:1.25-alpine
# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Inject custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled Angular files. 
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]