variable "scaleway_rdb_instance" {
  type = object({
    id = string
    private_network = list(object({
      ip   = string
      port = string
    }))
  })
}

variable "name" {
  type = string
}
