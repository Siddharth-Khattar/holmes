# ABOUTME: Terraform variable definitions for Holmes infrastructure.
# ABOUTME: Defines all configurable parameters for GCP resources.

variable "project_id" {
  description = "GCP project ID for Holmes deployment"
  type        = string
}

variable "region" {
  description = "GCP region for resource deployment"
  type        = string
  default     = "europe-west3"
}

variable "github_org" {
  description = "GitHub organization for Workload Identity Federation restriction"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name for Workload Identity Federation restriction"
  type        = string
}

variable "environment" {
  description = "Deployment environment (prod, dev)"
  type        = string
  default     = "prod"
}
