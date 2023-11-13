output "kubeconfig" {
  value = {
    cluster_ca_certificate = null_resource.kubeconfig.triggers.cluster_ca_certificate
    host                   = null_resource.kubeconfig.triggers.host
    token                  = null_resource.kubeconfig.triggers.token
  }
}

output "wildcard_dns" {
  value = scaleway_k8s_cluster.this.wildcard_dns
}

output "private_network_id" {
  value = scaleway_vpc_private_network.this.id
}
