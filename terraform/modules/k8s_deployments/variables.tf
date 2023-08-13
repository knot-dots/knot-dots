variable "databases" {
  type = map(object({
    db_host     = string
    db_name     = string
    db_password = string
    db_port     = string
    db_user     = string
  }))
}

variable "keycloak_host" {
  type = string
}

variable "keycloak_image" {
  type = string
}

variable "keycloak_name" {
  default = "keycloak"
  type    = string
}

variable "keycloak_realm" {
  type = string
}

variable "keycloak_service_account_client_secret" {
  type = string
}

variable "keycloak_service_account_client_id" {
  type = string
}

variable "migrate_image" {
  type = string
}

variable "migrate_name" {
  default = "migrate"
  type    = string
}

variable "strategytool_api_key" {
  type = object({
    access_key = string
    secret_key = string
  })
}

variable "strategytool_bucket_name" {
  type = string
}

variable "strategytool_host" {
  type = string
}

variable "strategytool_image" {
  type = string
}

variable "strategytool_name" {
  default = "strategytool"
  type    = string
}

variable "strategytool_region" {
  type = string
}

variable "strategytool_replicas" {
  default = 1
  type    = number
}

variable "registry_password" {
  type = string
}

variable "registry_server" {
  type = string
}

variable "registry_username" {
  type = string
}

variable "with_scaleway_lb" {
  type = bool
}
