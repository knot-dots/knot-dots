terraform {
  required_providers {
    keycloak = {
      source  = "mrparkers/keycloak"
      version = "4.2.0"
    }
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.0"
    }
  }

  required_version = ">= 1.6"

  backend "s3" {
    bucket                      = "strategytool-terraform-state"
    key                         = "keycloak/dev.tfstate"
    region                      = "fr-par"
    profile                     = "strategytool"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true

    endpoints = {
      s3 = "https://s3.fr-par.scw.cloud"
    }
  }
}

provider "keycloak" {
  client_id = "terraform"
  url       = "https://keycloak.dev.dotstory.de"
}

provider "scaleway" {
  project_id = var.scaleway_project_id
  region     = "fr-par"
  zone       = "fr-par-1"
}

data "scaleway_iam_application" "keycloak" {
  application_id = "933c010b-a4c1-418a-8a10-b41f6eb02daa"
}

resource "scaleway_iam_api_key" "keycloak" {
  application_id = data.scaleway_iam_application.keycloak.id
}

module "kc_realm" {
  source = "../../modules/kc_realm"

  realm = {
    realm                     = "knot-dots"
    display_name              = "knot dots"
    smtp_server_from          = "keycloak@dotstory.de"
    smtp_server_auth_password = scaleway_iam_api_key.keycloak.secret_key
    smtp_server_auth_username = var.scaleway_project_id
  }

  openid_client_valid_redirect_urls = ["https://strategytool.dev.dotstory.de/*"]
}
