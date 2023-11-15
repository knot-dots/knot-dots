terraform {
  required_providers {
    keycloak = {
      source  = "mrparkers/keycloak"
      version = "4.2.0"
    }
  }

  required_version = ">= 1.6"
}

resource "keycloak_realm" "this" {
  realm               = var.realm.realm
  enabled             = true
  display_name        = var.realm.display_name
  display_name_html   = "<b>${var.realm.display_name}</b>"
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
    from = var.realm.smtp_server_from
    host = "smtp.tem.scw.cloud"
    port = 2465
    ssl  = true

    auth {
      password = var.realm.smtp_server_auth_password
      username = var.realm.smtp_server_auth_username
    }
  }
}

resource "keycloak_openid_client" "strategytool" {
  realm_id  = keycloak_realm.this.id
  client_id = "strategytool"
  name      = "StrategyTool"
  enabled   = true

  access_type              = "CONFIDENTIAL"
  standard_flow_enabled    = true
  service_accounts_enabled = true

  valid_redirect_uris = var.openid_client_valid_redirect_urls

  web_origins = [
    "+"
  ]

  lifecycle {
    ignore_changes = [valid_redirect_uris]
  }
}

data "keycloak_openid_client" "realm_management" {
  realm_id  = keycloak_realm.this.id
  client_id = "realm-management"
}

data "keycloak_role" "manage_clients" {
  realm_id  = keycloak_realm.this.id
  client_id = data.keycloak_openid_client.realm_management.id
  name      = "manage-clients"
}

data "keycloak_role" "manage_users" {
  realm_id  = keycloak_realm.this.id
  client_id = data.keycloak_openid_client.realm_management.id
  name      = "manage-users"
}

resource "keycloak_openid_client_service_account_role" "strategytool_manage_clients" {
  realm_id                = keycloak_realm.this.id
  service_account_user_id = keycloak_openid_client.strategytool.service_account_user_id
  client_id               = data.keycloak_openid_client.realm_management.id
  role                    = data.keycloak_role.manage_clients.name
}

resource "keycloak_openid_client_service_account_role" "strategytool_manage_users" {
  realm_id                = keycloak_realm.this.id
  service_account_user_id = keycloak_openid_client.strategytool.service_account_user_id
  client_id               = data.keycloak_openid_client.realm_management.id
  role                    = data.keycloak_role.manage_users.name
}
