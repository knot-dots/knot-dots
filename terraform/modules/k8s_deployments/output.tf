//noinspection HILUnresolvedReference
output "load_balancer_ip" {
  value = var.with_scaleway_lb ? data.kubernetes_service_v1.traefik_ingress.status.0.load_balancer.0.ingress.0.ip : ""
}
