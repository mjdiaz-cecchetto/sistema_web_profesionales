# Laravel (PHP 8.3 FPM) para desarrollo.
FROM php:8.3-fpm-alpine

# Instalador de extensiones de PHP y Composer
COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN install-php-extensions pdo_mysql bcmath intl zip opcache pcntl exif gd \
    && apk add --no-cache git unzip mysql-client

# Usuario con el mismo UID/GID que tu usuario (así los archivos que crea Laravel
# o Composer en backend/ quedan a tu nombre y no como root).
ARG UID=1000
ARG GID=1000
RUN (getent group ${GID} || addgroup -g ${GID} app) \
    && adduser -D -u ${UID} -G $(getent group ${GID} | cut -d: -f1) -s /bin/sh app \
    && sed -i "s/^user = .*/user = app/; s/^group = .*/group = $(getent group ${GID} | cut -d: -f1)/" /usr/local/etc/php-fpm.d/www.conf

COPY php.ini /usr/local/etc/php/conf.d/zz-turnos.ini
COPY init-backend.sh /usr/local/bin/init-backend
RUN sed -i 's/\r$//' /usr/local/bin/init-backend && chmod +x /usr/local/bin/init-backend

WORKDIR /var/www/html
