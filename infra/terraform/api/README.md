# HeatFX API Lambda (Terraform)

Node 20 Lambda package for the HTTP API. **Terraform** zips this directory (`package.json` + `src/` + `node_modules` after `npm ci`).

The **CloudFormation / SAM** copy lives at `infra/cloudformation/api/`. Those templates are unchanged; if you edit the handler in one place, update the other (or extract a shared package later).
