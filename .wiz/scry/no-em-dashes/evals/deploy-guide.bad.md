# Deploying the API

Deploys run from the `main` branch. Merge your change, then trigger the
pipeline from the Actions tab.

## Rolling back

If a deploy goes wrong, redeploy the previous tag. The database is the one
thing a rollback does not touch — migrations only move forward, so write
them to be compatible with the previous release.

## Secrets

Secrets live in the vault. Ask in #platform for access.
