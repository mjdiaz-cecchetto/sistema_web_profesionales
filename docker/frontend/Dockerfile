# Angular (Node 22) para desarrollo. El código se monta desde frontend/;
# node_modules vive en un volumen de Docker (separado del de Windows).
FROM node:22-alpine

ENV NG_CLI_ANALYTICS=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

COPY entrypoint.sh /usr/local/bin/frontend-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/frontend-entrypoint \
    && chmod +x /usr/local/bin/frontend-entrypoint \
    && mkdir -p /app/node_modules \
    && chown -R node:node /app

USER node
WORKDIR /app

ENTRYPOINT ["frontend-entrypoint"]
# --poll: detecta cambios en archivos montados desde Windows/WSL
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000"]
