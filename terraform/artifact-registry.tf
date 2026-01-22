# ABOUTME: Artifact Registry repository for Holmes container images.
# ABOUTME: Stores Docker images for backend and frontend services.

resource "google_artifact_registry_repository" "holmes" {
  project       = var.project_id
  location      = var.region
  repository_id = "holmes"
  description   = "Docker repository for Holmes container images"
  format        = "DOCKER"

  # Cleanup policy for old images
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [
    google_project_service.artifactregistry,
  ]
}
