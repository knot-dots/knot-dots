# StrategyTool [![CI](https://github.com/knot-dots/strategytool/actions/workflows/ci.yaml/badge.svg)](https://github.com/knot-dots/strategytool/actions/workflows/ci.yaml) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

## Getting started

Install dependencies with `npm install` and start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Deployment

The infrastructure is hosted by [Scaleway](https://www.scaleway.com) and managed with [Terraform](https://wwww.terraform.io).
Follow the instructions for [authenticating the Scaleway provider](https://registry.terraform.io/providers/scaleway/scaleway/latest/docs#authentication) and add a section to your `~/.aws/credentials` file using the same credentials:

```
[strategytool]
aws_access_key_id = <SCW_ACCESS_KEY>
aws_secret_access_key = <SCW_SECRET_KEY>
```

Now you are ready to modify the infrastructure and deployments with Terraform:

```bash
cd terraform/dev
terraform plan
```
