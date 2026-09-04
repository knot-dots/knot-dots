group "ci-e2e" {
  targets = [
    "ci-app",
    "ci-db",
    "ci-elasticsearch",
    "ci-migrate",
    "ci-index-containers",
    "ci-indexing-worker",
  ]
}

target "ci-app" {
  context    = "."
  dockerfile = "./app/Dockerfile"
  target     = "production"
  tags       = ["app:test"]
  cache-from = ["type=gha"]
}

target "ci-db" {
  context    = "./db"
  dockerfile = "Dockerfile"
  tags       = ["db:test"]
  cache-from = ["type=gha,scope=db"]
}

target "ci-elasticsearch" {
  context    = "./elasticsearch"
  dockerfile = "Dockerfile"
  args = {
    ELASTICSEARCH_VERSION = "9.2.3"
  }
  tags       = ["elasticsearch:test"]
  cache-from = ["type=gha,scope=elasticsearch"]
}

target "ci-migrate" {
  context    = "./migrate"
  dockerfile = "Dockerfile"
  tags       = ["migrate:test"]
  cache-from = ["type=gha,scope=migrate"]
}

target "ci-index-containers" {
  context    = "."
  dockerfile = "./import/Dockerfile"
  tags       = ["index-containers:test"]
  cache-from = ["type=gha,scope=index-containers"]
}

target "ci-indexing-worker" {
  context    = "."
  dockerfile = "./worker/Dockerfile"
  tags       = ["indexing-worker:test"]
  cache-from = ["type=gha,scope=indexing-worker"]
}
