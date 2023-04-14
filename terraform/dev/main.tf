terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }

    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }

    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.0"
    }

    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }

    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.0"
    }
  }

  required_version = ">= 0.13"

  backend "s3" {
    bucket                      = "strategytool-terraform-state"
    key                         = "dev.tfstate"
    region                      = "fr-par"
    endpoint                    = "https://s3.fr-par.scw.cloud"
    profile                     = "strategytool"
    skip_credentials_validation = true
    skip_region_validation      = true
  }
}

provider "helm" {
  kubernetes {
    host  = module.k8s_cluster.kubeconfig.host
    token = module.k8s_cluster.kubeconfig.token
    cluster_ca_certificate = base64decode(
      module.k8s_cluster.kubeconfig.cluster_ca_certificate
    )
  }
}

provider "kubectl" {
  load_config_file = false
  host             = module.k8s_cluster.kubeconfig.host
  token            = module.k8s_cluster.kubeconfig.token
  cluster_ca_certificate = base64decode(
    module.k8s_cluster.kubeconfig.cluster_ca_certificate
  )
}

provider "kubernetes" {
  host  = module.k8s_cluster.kubeconfig.host
  token = module.k8s_cluster.kubeconfig.token
  cluster_ca_certificate = base64decode(
    module.k8s_cluster.kubeconfig.cluster_ca_certificate
  )
}

provider "scaleway" {
  project_id = var.scaleway_project_id
  region     = "fr-par"
  zone       = "fr-par-1"
}

data "scaleway_iam_application" "kapsule" {
  application_id = "48b5a810-07bc-40b0-b208-ceb70c9f96fc"
}

resource "scaleway_iam_api_key" "registry_password" {
  application_id = data.scaleway_iam_application.kapsule.id
}

resource "scaleway_domain_zone" "dev" {
  count = var.with_scaleway_lb ? 1 : 0

  domain    = "dotstory.de"
  subdomain = "dev"
}

resource "scaleway_domain_record" "strategytool" {
  count = var.with_scaleway_lb ? 1 : 0

  dns_zone = scaleway_domain_zone.dev[count.index].id
  name     = "strategytool"
  type     = "A"
  //noinspection HILUnresolvedReference
  data = module.k8s_deployments.load_balancer_ip
  ttl  = 3600
}

module "k8s_cluster" {
  source = "../modules/k8s_cluster"

  cluster_name     = "k8s-dev"
  with_scaleway_lb = var.with_scaleway_lb
}

module "k8s_deployments" {
  source = "../modules/k8s_deployments"

  registry_password  = scaleway_iam_api_key.registry_password.secret_key
  registry_server    = "rg.fr-par.scw.cloud"
  registry_username  = "knot-dots"
  strategytool_host  = var.with_scaleway_lb ? "strategytool.dev.dotstory.de" : replace(module.k8s_cluster.wildcard_dns, "*", "strategytool")
  strategytool_image = "rg.fr-par.scw.cloud/knot-dots/strategytool:854fd040c9e3b1edb7aedf01aefa20e5fc8f0688"
  with_scaleway_lb   = var.with_scaleway_lb
}
