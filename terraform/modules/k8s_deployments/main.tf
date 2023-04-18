terraform {
  required_providers {
    helm = {
      source = "hashicorp/helm"
    }
    kubectl = {
      source = "gavinbunney/kubectl"
    }
    kubernetes = {
      source = "hashicorp/kubernetes"
    }
  }
  required_version = ">= 0.13"
}

locals {
  cluster_issuer_name = "letsencrypt"
  ingress_name        = "strategytool"
}

resource "helm_release" "traefik_ingress" {
  name       = "traefik-ingress"
  namespace  = "kube-system"
  repository = "https://traefik.github.io/charts"
  chart      = "traefik"

  set {
    name  = "deployment.kind"
    value = "DaemonSet"
  }

  set {
    name  = "logs.access.enabled"
    value = true
  }

  set {
    name  = "ports.web.hostPort"
    value = 80
  }

  set {
    name  = "ports.websecure.hostPort"
    value = 443
  }

  set {
    name  = "ports.websecure.http.tls"
    value = true
  }

  set {
    name  = "service.type"
    value = var.with_scaleway_lb ? "LoadBalancer" : "ClusterIP"
  }
}

resource "helm_release" "cert_manager" {
  count = var.with_scaleway_lb ? 1 : 0

  name             = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"

  set {
    name  = "installCRDs"
    value = true
  }
}

resource "kubectl_manifest" "cluster_issuer" {
  count = var.with_scaleway_lb ? 1 : 0

  yaml_body = <<YAML
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ${local.cluster_issuer_name}
spec:
  acme:
    # You must replace this email address with your own.
    # Let's Encrypt will use this to contact you about expiring
    # certificates, and issues related to your account.
    email: daniel@knotdots.de
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      # Secret resource used to store the account's private key.
      name: issuer-account-key
    # Add a single challenge solver, HTTP01
    solvers:
      - http01:
          ingress:
            class: traefik
YAML

  depends_on = [helm_release.cert_manager]
}

resource "kubernetes_ingress_v1" "strategytool" {
  metadata {
    name      = local.ingress_name
    namespace = "default"

    annotations = {
      "cert-manager.io/cluster-issuer"                   = var.with_scaleway_lb ? local.cluster_issuer_name : null
      "traefik.ingress.kubernetes.io/router.entrypoints" = var.with_scaleway_lb ? "websecure" : "web"
    }
  }

  spec {
    rule {
      host = var.strategytool_host
      http {
        path {
          backend {
            service {
              name = "strategytool"
              port {
                number = 8000
              }
            }
          }
          path      = "/"
          path_type = "Prefix"
        }
      }
    }

    rule {
      host = var.keycloak_host
      http {
        path {
          backend {
            service {
              name = "keycloak"
              port {
                number = 8001
              }
            }
          }
          path      = "/"
          path_type = "Prefix"
        }
      }
    }

    tls {
      hosts       = [var.keycloak_host, var.strategytool_host]
      secret_name = "strategytool-cert"
    }
  }
}

resource "kubernetes_service_v1" "strategytool" {
  metadata {
    name      = "strategytool"
    namespace = "default"
  }

  spec {
    selector = {
      "app.kubernetes.io/name" = var.strategytool_name
    }

    port {
      port        = 8000
      target_port = 3000
    }
  }
}

resource "kubernetes_deployment_v1" "strategytool" {
  metadata {
    name      = var.strategytool_name
    namespace = "default"
    labels = {
      "app.kubernetes.io/name" = var.strategytool_name
    }
  }

  spec {
    replicas = var.strategytool_replicas

    selector {
      match_labels = {
        "app.kubernetes.io/name" = var.strategytool_name
      }
    }

    template {
      metadata {
        labels = {
          "app.kubernetes.io/name" = var.strategytool_name
        }
      }

      spec {
        container {
          image = var.strategytool_image
          name  = "app"

          resources {
            limits = {
              cpu    = "0.5"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "50Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/"
              port = 3000
            }
            initial_delay_seconds = 3
            period_seconds        = 3
          }

        }

        image_pull_secrets {
          name = kubernetes_secret_v1.image_pull_secret.metadata[0].name
        }
      }
    }
  }
}

resource "random_password" "keycloak" {
  length  = 16
  special = true
}

resource "kubernetes_secret_v1" "keycloak" {
  metadata {
    name = "keycloak-credentials"
  }

  data = {
    KEYCLOAK_ADMIN          = "admin"
    KEYCLOAK_ADMIN_PASSWORD = random_password.keycloak.result
  }
}

resource "kubernetes_service_v1" "keycloak" {
  metadata {
    name      = var.keycloak_name
    namespace = "default"
  }

  spec {
    selector = {
      "app.kubernetes.io/name" = var.keycloak_name
    }

    port {
      port        = 8001
      target_port = 8080
    }
  }
}

resource "kubernetes_deployment_v1" "keycloak" {
  metadata {
    name      = var.keycloak_name
    namespace = "default"
    labels = {
      "app.kubernetes.io/name" = var.keycloak_name
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        "app.kubernetes.io/name" = var.keycloak_name
      }
    }

    template {
      metadata {
        labels = {
          "app.kubernetes.io/name" = var.keycloak_name
        }
      }

      spec {
        container {
          image = var.keycloak_image
          args  = ["start"]
          name  = "app"

          env {
            name  = "KC_DB_PASSWORD"
            value = var.databases["keycloak"].db_password
          }

          env {
            name  = "KC_DB_URL_PORT"
            value = var.databases["keycloak"].db_port
          }

          env {
            name  = "KC_DB_URL_DATABASE"
            value = "keycloak"
          }

          env {
            name  = "KC_DB_URL_HOST"
            value = var.databases["keycloak"].db_host
          }

          env {
            name  = "KC_DB_USERNAME"
            value = var.databases["keycloak"].db_user
          }

          env {
            name  = "KC_HOSTNAME_STRICT"
            value = "false"
          }

          env {
            name  = "KC_PROXY"
            value = "edge"
          }

          env_from {
            secret_ref {
              name = kubernetes_secret_v1.keycloak.metadata[0].name
            }
          }

          resources {
            limits = {
              cpu    = "0.5"
              memory = "1024Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "512Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health/live"
              port = 8080
            }
            initial_delay_seconds = 3
            period_seconds        = 3
          }

        }
      }
    }
  }
}

resource "kubernetes_secret_v1" "image_pull_secret" {
  metadata {
    name      = "registry-credentials"
    namespace = "default"
  }

  type = "docker-registry"

  data = {
    ".dockerconfigjson" = jsonencode({
      auths = {
        (var.registry_server) = {
          "username" = var.registry_username
          "password" = var.registry_password
          "auth"     = base64encode("${var.registry_username}:${var.registry_password}")
        }
      }
    })
  }
}

data "kubernetes_service_v1" "traefik_ingress" {
  metadata {
    name      = "traefik-ingress"
    namespace = "kube-system"
  }

  depends_on = [helm_release.traefik_ingress]
}
