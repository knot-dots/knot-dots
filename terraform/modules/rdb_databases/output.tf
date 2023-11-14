output "db_host" {
  value = var.scaleway_rdb_instance.private_network[0].ip
}

output "db_name" {
  value = scaleway_rdb_database.this.name
}

output "db_password" {
  value = random_password.this.result
}

output "db_port" {
  value = var.scaleway_rdb_instance.private_network[0].port
}

output "db_user" {
  value = scaleway_rdb_user.this.name
}
