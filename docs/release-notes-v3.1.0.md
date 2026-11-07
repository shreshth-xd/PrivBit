### Added
- Docker packaging with Dockerfiles and a Compose stack for PostgreSQL, Redis, Qdrant, migrations, the API, worker, retry-worker, and frontend.
- An environment bootstrap script, root `.env.example`, and the README "Run with Docker" section.

### Changed
- Docker images run as non-root users.
- PostgreSQL, Redis, and Qdrant ports are kept off the host.

### Security
- Secrets are supplied at runtime and are not copied into Docker images.
