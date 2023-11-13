terraform {
  required_providers {
    scaleway = {
      source = "scaleway/scaleway"
    }
  }
  required_version = ">= 0.13"
}

resource "scaleway_rdb_database" "this" {
  instance_id = var.scaleway_rdb_instance.id
  name        = var.name
}

resource "random_password" "this" {
  length      = 16
  min_numeric = 1
  special     = true
}

resource "scaleway_rdb_user" "this" {
  instance_id = var.scaleway_rdb_instance.id
  is_admin    = false
  name        = var.name
  password    = random_password.this.result
}

resource "scaleway_rdb_privilege" "this" {
  database_name = scaleway_rdb_database.this.name
  instance_id   = var.scaleway_rdb_instance.id
  permission    = "all"
  user_name     = scaleway_rdb_user.this.name
}

data "scaleway_rdb_instance" "this" {
  instance_id = var.scaleway_rdb_instance.id
}
