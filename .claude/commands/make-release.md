Release a new version of WA Automation. Follow these steps in order, confirming with the user before proceeding to the next step.

## 1. Version bump

Ask the user: "How should the version be updated? (patch / minor / major / or enter a specific version)"

- Read the current version from `backend/package.json`
- Compute the new version based on their answer (e.g. 0.1.0 → patch = 0.1.1, minor = 0.2.0, major = 1.0.0)
- Confirm the new version with the user before applying
- Update `version` in both `backend/package.json` and `frontend/package.json`
- Run `npm install` in both `backend/` and `frontend/` to update lock files

## 2. Update README.md

- Ask the user for release notes (what changed in this version)
- Add a "## Release Notes" section at the bottom of README.md (or append to it if it exists)
- Format as `### v<version> — <date>` followed by the user's notes as bullet points

## 3. Commit and tag

- Stage all outstanding changes (including any uncommitted work)
- Commit with message: `Release v<version>`
- Create an annotated git tag: `git tag -a v<version> -m "Release v<version>"`

## 4. Push to origin

- Push the commit: `git push origin main`
- Push the tag: `git push origin v<version>`

## 5. Build and push Docker image

- Docker registry: `ghcr.io/huferry/wa-automation`
- Build: `docker build -t ghcr.io/huferry/wa-automation:v<version> -t ghcr.io/huferry/wa-automation:latest .`
- Push both tags to the registry
- If not logged in to ghcr.io, ask the user to run `! docker login ghcr.io`

## 6. Update container on Kingston

- SSH into Kingston: `ssh kingston`
- Pull the new image: `docker pull ghcr.io/huferry/wa-automation:latest`
- Restart the container (use docker compose if available, otherwise `docker stop` / `docker run`)
- Verify the container is running

Tell the user the release is complete and summarize what was done.
