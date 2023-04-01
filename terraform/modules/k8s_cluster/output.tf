output "kubeconfig" {
  value = {
    cluster_ca_certificate = null_resource.kubeconfig.triggers.cluster_ca_certificate
    host                   = null_resource.kubeconfig.triggers.host
    token                  = null_resource.kubeconfig.triggers.token
  }
}
