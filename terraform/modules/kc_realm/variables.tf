variable "realm" {
  type = object({
    display_name              = string
    realm                     = string
    smtp_server_from          = string
    smtp_server_auth_password = string
    smtp_server_auth_username = string
  })
}

variable "openid_client_valid_redirect_urls" {
  type = list(string)
}
