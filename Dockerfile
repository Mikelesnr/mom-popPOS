# Stage 1: Build frontend assets
FROM node:20-slim AS frontend

WORKDIR /app
COPY package.json vite.config.js tailwind.config.js postcss.config.cjs ./
COPY resources resources
RUN npm install && npm run build

# Stage 2: Laravel backend
FROM php:8.2-fpm-alpine AS backend

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    curl \
    zip \
    unzip \
    git \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    libxpm-dev \
    freetype-dev \
    oniguruma-dev \
    icu-dev \
    bash \
    shadow \
    postgresql-dev \
    nodejs \
    npm \
    supervisor

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_pgsql mbstring exif pcntl bcmath gd intl

# Set working directory
WORKDIR /var/www/html

# Copy Laravel app
COPY . .

# ✅ Ensure Laravel cache and storage paths exist and are writable
RUN mkdir -p bootstrap/cache \
    storage/framework/views \
    storage/framework/sessions \
    storage/framework/cache \
    && chmod -R 775 bootstrap/cache storage \
    && chown -R www-data:www-data bootstrap/cache storage

# ✅ Copy only the built frontend assets (public/build)
COPY --from=frontend /app/public/build ./public/build

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev --optimize-autoloader

# Set permissions
RUN chown -R www-data:www-data /var/www/html

# Copy Nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy Supervisor config
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
