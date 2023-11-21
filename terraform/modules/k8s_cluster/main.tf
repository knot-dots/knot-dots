terraform {
  required_providers {
    scaleway = {
      source = "scaleway/scaleway"
    }
  }
  required_version = ">= 0.13"
}

resource "scaleway_vpc_private_network" "this" {
  name = var.cluster_name

  tags = ["terraform"]
}

resource "scaleway_k8s_cluster" "this" {
  cni                         = "cilium"
  name                        = var.cluster_name
  version                     = var.cluster_version
  private_network_id          = scaleway_vpc_private_network.this.id
  delete_additional_resources = true

  tags = ["terraform"]
}

resource "scaleway_k8s_pool" "this" {
  cluster_id          = scaleway_k8s_cluster.this.id
  name                = var.pool_name
  node_type           = var.pool_node_type
  size                = var.pool_size
  autohealing         = true
  wait_for_pool_ready = false

  tags = ["terraform"]
}

//noinspection HILUnresolvedReference
resource "null_resource" "kubeconfig" {
  triggers = {
    host                   = scaleway_k8s_cluster.this.kubeconfig[0].host
    token                  = scaleway_k8s_cluster.this.kubeconfig[0].token
    cluster_ca_certificate = scaleway_k8s_cluster.this.kubeconfig[0].cluster_ca_certificate
  }

  depends_on = [scaleway_k8s_pool.this]
}
