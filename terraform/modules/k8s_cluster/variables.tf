variable "cluster_name" {
  description = "The name of the cluster."
  type        = string
}

variable "cluster_version" {
  default     = "1.26.2"
  description = "The version of Kubernetes the cluster is running."
  type        = string
}

variable "pool_node_type" {
  default     = "DEV1_M"
  description = "The target node type of the pool."
  type        = string
}

variable "pool_size" {
  default     = 1
  description = "The number of target nodes in the pool."
  type        = number
}
