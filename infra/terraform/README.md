# Terraform (planned)

HeatFX AWS resources are implemented today with **CloudFormation / SAM** under [`../cloudformation/`](../cloudformation/). This folder is reserved for a **Terraform or OpenTofu** version of the same architecture (data, auth, HTTP API + Lambda, static site, and optionally CI).

**Choose one IaC path per environment**—do not apply Terraform against resources still owned by CloudFormation stacks (or vice versa) without a deliberate migration and tear-down.

Planned next steps (when you start): add `versions.tf` / `required_providers`, backend config, modules mirroring the nested stacks, and CI changes if you replace the CodePipeline/CodeBuild + `buildspec.yml` flow. Until then, deploy from **`infra/README.md`** using CloudFormation only.
