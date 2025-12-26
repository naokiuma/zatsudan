FROM php:8.3-fpm-bookworm

# 必要パッケージ
RUN apt-get update && apt-get install -y \
    git unzip libzip-dev libicu-dev libonig-dev \
    && docker-php-ext-install pdo_mysql intl zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# php.ini必要なら後で追加でもOK
# COPY docker/app/php.ini /usr/local/etc/php/conf.d/custom.ini

CMD ["php-fpm"]
