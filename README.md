# idea_backend_v2

## Daily keepalive

This repo includes a GitHub Actions workflow at `.github/workflows/daily-keepalive.yml` that runs once per day and hits a backend endpoint that performs a lightweight database query.

Configure the repository secret `BACKEND_KEEPALIVE_URL` with your production backend URL, for example:

`https://ideabackendv2-production.up.railway.app/health/database`
