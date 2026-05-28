# Stage 1: Build the Angular application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# Compile the application for production
RUN npm run build --configuration=production

# Stage 2: Serve the application using Nginx
FROM nginx:alpine
# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the compiled Angular files. 
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Expose port 80 for web traffic
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]