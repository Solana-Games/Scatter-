# Deployment Notes

## Local

1. `npm install`
2. `cp .env.example .env`
3. Set required values (`JWT_ROTATION_SECRET`, `ADMIN_API_TOKEN`, `WEBHOOK_SIGNING_SECRET`)
4. `npm run start:api`

## Docker

- API image: `infra/docker/Dockerfile.api`
- Web image: `infra/docker/Dockerfile.web`
- Compose: `docker-compose.yml`

## Vercel / Netlify

- Deploy web layer from `apps/web`
- Configure `NEXT_PUBLIC_API_BASE_URL`
- Mirror secure backend env vars in API hosting environment

## Production Validation

- API validates required secrets on startup in production mode via `apps/api/src/env.js`.
