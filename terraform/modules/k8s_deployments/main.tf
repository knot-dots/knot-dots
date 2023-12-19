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
    name  = "additionalArguments"
    value = "{--entrypoints.web.http.redirections.entrypoint.to=:443,--entrypoints.web.http.redirections.entrypoint.scheme=https}"
  }

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

resource "helm_release" "cert_manager_webhook" {
  count = var.with_scaleway_lb ? 1 : 0

  name       = "scaleway-webhook"
  namespace  = "cert-manager"
  repository = "https://suda.github.io/charts"
  chart      = "scaleway-webhook"

  set {
    name  = "secret.accessKey"
    value = var.cert_manager_api_key.access_key
  }

  set {
    name  = "secret.secretKey"
    value = var.cert_manager_api_key.secret_key
  }

  depends_on = [helm_release.cert_manager]
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
      - dns01:
          webhook:
            groupName: acme.scaleway.com
            solverName: scaleway
YAML

  depends_on = [helm_release.cert_manager, helm_release.cert_manager_webhook]
}

resource "kubectl_manifest" "compress_middleware" {
  count = var.with_scaleway_lb ? 1 : 0

  yaml_body = <<YAML
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: test-compress
spec:
  compress: {}
YAML

  depends_on = [helm_release.traefik_ingress]
}

resource "kubernetes_ingress_v1" "strategytool" {
  metadata {
    name      = local.ingress_name
    namespace = "default"

    annotations = {
      "cert-manager.io/cluster-issuer"                   = var.with_scaleway_lb ? local.cluster_issuer_name : null
      "traefik.ingress.kubernetes.io/router.entrypoints" = var.with_scaleway_lb ? "websecure" : "web"
      "traefik.ingress.kubernetes.io/router.middlewares" = "default-test-compress@kubernetescrd"
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
      host = "*.${var.strategytool_host}"
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
      hosts       = [var.keycloak_host, var.strategytool_host, "*.${var.strategytool_host}"]
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

resource "random_password" "auth_secret" {
  length  = 32
  special = false
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

          env {
            name  = "AUTH_SECRET"
            value = random_password.auth_secret.result
          }

          env {
            name  = "BODY_SIZE_LIMIT"
            value = "100000000"
          }

          env {
            name  = "SCW_API_ACCESS_KEY"
            value = var.strategytool_api_key.access_key
          }

          env {
            name  = "SCW_API_SECRET_KEY"
            value = var.strategytool_api_key.secret_key
          }

          env {
            name  = "SCW_BUCKET_NAME"
            value = var.strategytool_bucket_name
          }

          env {
            name  = "SCW_REGION"
            value = var.strategytool_region
          }

          env {
            name  = "KC_CLIENT_SECRET"
            value = var.keycloak_client_secret
          }

          env {
            name  = "PGDATABASE"
            value = var.databases["strategytool"].db_name
          }

          env {
            name  = "PGHOST"
            value = var.databases["strategytool"].db_host
          }

          env {
            name  = "PGPASSWORD"
            value = var.databases["strategytool"].db_password
          }

          env {
            name  = "PGPORT"
            value = var.databases["strategytool"].db_port
          }

          env {
            name  = "PGUSER"
            value = var.databases["strategytool"].db_user
          }

          env {
            name  = "PUBLIC_BASE_URL"
            value = "https://${var.strategytool_host}"
          }

          env {
            name  = "PUBLIC_KC_CLIENT_ID"
            value = var.keycloak_client_id
          }

          env {
            name  = "PUBLIC_KC_REALM"
            value = var.keycloak_realm
          }

          env {
            name  = "PUBLIC_KC_URL"
            value = "https://${var.keycloak_host}"
          }

          env {
            name  = "ROARR_LOG"
            value = "true"
          }

          resources {
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "50Mi"
            }
          }

          liveness_probe {
            tcp_socket {
              port = 3000
            }
            initial_delay_seconds = 3
            period_seconds        = 3
          }

        }

        init_container {
          name  = "wait-for-migrate"
          image = "groundnuty/k8s-wait-for:no-root-v1.7"
          args  = ["job", var.migrate_name]
        }

        image_pull_secrets {
          name = kubernetes_secret_v1.image_pull_secret.metadata[0].name
        }
      }
    }
  }
}

resource "kubernetes_role_v1" "strategytool" {
  metadata {
    name      = var.strategytool_name
    namespace = "default"
  }

  rule {
    api_groups = ["batch"]
    resources  = ["jobs"]
    verbs      = ["get", "list"]
  }
}

resource "kubernetes_role_binding_v1" "strategytool" {
  metadata {
    name      = var.strategytool_name
    namespace = "default"
  }

  subject {
    kind = "ServiceAccount"
    name = "default"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = var.strategytool_name
  }
}

resource "kubernetes_job_v1" "migrate" {
  metadata {
    name      = var.migrate_name
    namespace = "default"
    labels = {
      "app.kubernetes.io/name"    = var.migrate_name
      "app.kubernetes.io/part-of" = var.strategytool_name
    }
  }

  spec {
    backoff_limit = 1

    template {
      metadata {
        labels = {
          "app.kubernetes.io/name"    = var.migrate_name
          "app.kubernetes.io/part-of" = var.strategytool_name
        }
      }

      spec {
        container {
          name  = "migrate"
          image = var.migrate_image
          args  = ["-database", "postgres:///", "-path", "/srv/migrations", "up"]

          env {
            name  = "PGDATABASE"
            value = var.databases["strategytool"].db_name
          }

          env {
            name  = "PGHOST"
            value = var.databases["strategytool"].db_host
          }

          env {
            name  = "PGPASSWORD"
            value = var.databases["strategytool"].db_password
          }

          env {
            name  = "PGPORT"
            value = var.databases["strategytool"].db_port
          }

          env {
            name  = "PGUSER"
            value = var.databases["strategytool"].db_user
          }

          resources {
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "50Mi"
            }
          }
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
    name      = "keycloak-credentials"
    namespace = "default"
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
    replicas = var.keycloak_replicas

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
          args  = ["start", "--optimized"]
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
              cpu    = "500m"
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
            initial_delay_seconds = 60
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
