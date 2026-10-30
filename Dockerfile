FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile --non-interactive
COPY . .
RUN yarn build

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 APP_ENV=production DJANGO_SETTINGS_MODULE=config.settings.production
WORKDIR /app/api
COPY api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home app
COPY api ./
COPY product.json /app/product.json
COPY --from=web /app/dist /app/dist
USER app
EXPOSE 8000
CMD ["sh","-c","exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 2 --timeout 60 --access-logfile -"]
