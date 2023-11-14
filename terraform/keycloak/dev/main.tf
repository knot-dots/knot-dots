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

resource "keycloak_realm" "knot_dots" {
  realm               = "knot-dots"
  enabled             = true
  display_name        = "knot dots"
  display_name_html   = "<b>knot dots</b>"
  user_managed_access = true

  # Login settings
  login_with_email_allowed       = true
  registration_allowed           = true
  registration_email_as_username = true
  reset_password_allowed         = true
  remember_me                    = true
  ssl_required                   = "external"
  verify_email                   = true

  # Themes
  admin_theme   = "keycloak.v2"
  account_theme = "keycloak.v2"
  email_theme   = "keycloak"
  login_theme   = "keycloak"


  # Authentication settings
  password_policy = "upperCase(1) and length(8) and forceExpiredPasswordChange(365) and notUsername"

  # Tokens
  access_code_lifespan = "1h"

  internationalization {
    supported_locales = [
      "de",
      "en"
    ]
    default_locale = "de"
  }

  security_defenses {
    brute_force_detection {}
  }

  smtp_server {
    from = "keycloak@dotstory.de"
    host = "smtp.tem.scw.cloud"
    port = 2465
    ssl  = true

    auth {
      password = scaleway_iam_api_key.keycloak.secret_key
      username = var.scaleway_project_id
    }
  }
}

resource "keycloak_openid_client" "strategytool" {
  realm_id  = keycloak_realm.knot_dots.id
  client_id = "strategytool"
  name      = "StrategyTool"
  enabled   = true

  access_type              = "CONFIDENTIAL"
  standard_flow_enabled    = true
  service_accounts_enabled = true

  valid_redirect_uris = [
    "https://strategytool.dev.dotstory.de/*"
  ]

  web_origins = [
    "+"
  ]

  lifecycle {
    ignore_changes = [valid_redirect_uris]
  }
}

data "keycloak_openid_client" "realm_management" {
  realm_id  = keycloak_realm.knot_dots.id
  client_id = "realm-management"
}

data "keycloak_role" "manage_clients" {
  realm_id  = keycloak_realm.knot_dots.id
  client_id = data.keycloak_openid_client.realm_management.id
  name      = "manage-clients"
}

data "keycloak_role" "manage_users" {
  realm_id  = keycloak_realm.knot_dots.id
  client_id = data.keycloak_openid_client.realm_management.id
  name      = "manage-users"
}

resource "keycloak_openid_client_service_account_role" "strategytool_manage_clients" {
  realm_id                = keycloak_realm.knot_dots.id
  service_account_user_id = keycloak_openid_client.strategytool.service_account_user_id
  client_id               = data.keycloak_openid_client.realm_management.id
  role                    = data.keycloak_role.manage_clients.name
}

resource "keycloak_openid_client_service_account_role" "strategytool_manage_users" {
  realm_id                = keycloak_realm.knot_dots.id
  service_account_user_id = keycloak_openid_client.strategytool.service_account_user_id
  client_id               = data.keycloak_openid_client.realm_management.id
  role                    = data.keycloak_role.manage_users.name
}
