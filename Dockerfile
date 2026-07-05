# Stage 1: Build frontend assets
FROM node:20-slim AS frontend
WORKDIR /app

# Copy only files needed for build
COPY package.json vite.config.js tailwind.config.js postcss.config.js ./
COPY resources resources

RUN npm install && npm run build

# Stage 2: Laravel backend
FROM php:8.3-fpm-alpine AS backend

# Install system dependencies
RUN apk add --no-cache \
    nginx curl zip unzip git libpng-dev libjpeg-turbo-dev \
    libwebp-dev libxpm-dev libzip-dev freetype-dev \
    oniguruma-dev icu-dev bash shadow postgresql-dev

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_pgsql mbstring exif pcntl bcmath gd intl zip

WORKDIR /var/www/html

# Copy application code
COPY . .

# Environment variables to prevent artisan boot failures
ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr

# Ensure storage paths exist and are writable
RUN mkdir -p bootstrap/cache storage/framework/views storage/framework/sessions storage/framework/cache \
    && chmod -R 775 bootstrap/cache storage \
    && chown -R www-data:www-data bootstrap/cache storage

# Copy frontend build output
COPY --from=frontend /app/public/build ./public/build

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install dependencies without running artisan scripts
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts \
    && composer dump-autoload --optimize

# Set permissions
RUN chown -R www-data:www-data /var/www/html

# Copy Nginx/Supervisor configs
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
