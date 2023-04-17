variable "scaleway_rdb_instance" {
  type = object({
    id            = string
    endpoint_ip   = string
    endpoint_port = string
  })
}

variable "name" {
  type = string
}
