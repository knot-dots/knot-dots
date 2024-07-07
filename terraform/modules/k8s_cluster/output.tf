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

output "cockpit_sources" {
  value = {
    logs_url    = "${scaleway_cockpit_source.logs.url}/loki/api/v1/push",
    metrics_url = "${scaleway_cockpit_source.metrics.url}/api/v1/push"
    traces_url  = "${scaleway_cockpit_source.traces.url}/otlp"
  }
}

output "cockpit_token" {
  value = scaleway_cockpit_token.grafana_alloy.secret_key
}
