# ABOUTME: IAM configuration for Holmes including Workload Identity Federation.
# ABOUTME: Defines service accounts and WIF pool/provider for GitHub Actions.

# -----------------------------------------------------------------------------
# Workload Identity Federation for GitHub Actions
# -----------------------------------------------------------------------------

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions CI/CD"

  depends_on = [
    google_project_service.iam,
    google_project_service.iamcredentials,
  ]
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "GitHub Actions"
  description                        = "OIDC provider for GitHub Actions"

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }

  # CRITICAL: Restrict to your org/repo only
  attribute_condition = "assertion.repository_owner == '${var.github_org}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# -----------------------------------------------------------------------------
# Service Accounts
# -----------------------------------------------------------------------------

# Service account for GitHub Actions CI/CD
resource "google_service_account" "github_actions" {
  project      = var.project_id
  account_id   = "github-actions"
  display_name = "GitHub Actions Service Account"
  description  = "Service account for GitHub Actions CI/CD deployments"

  depends_on = [
    google_project_service.iam,
  ]
}

# Service account for Cloud Run backend
resource "google_service_account" "backend" {
  project      = var.project_id
  account_id   = "holmes-backend"
  display_name = "Holmes Backend Service Account"
  description  = "Service account for Cloud Run backend service"

  depends_on = [
    google_project_service.iam,
  ]
}

# Service account for Cloud Run frontend
resource "google_service_account" "frontend" {
  project      = var.project_id
  account_id   = "holmes-frontend"
  display_name = "Holmes Frontend Service Account"
  description  = "Service account for Cloud Run frontend service"

  depends_on = [
    google_project_service.iam,
  ]
}

# -----------------------------------------------------------------------------
# WIF User Binding for GitHub Actions
# -----------------------------------------------------------------------------

resource "google_service_account_iam_binding" "github_actions_wif" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_org}/${var.github_repo}"
  ]
}

# -----------------------------------------------------------------------------
# GitHub Actions Service Account IAM Bindings
# -----------------------------------------------------------------------------

resource "google_project_iam_member" "github_actions_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "github_actions_artifact_registry" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "github_actions_service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# -----------------------------------------------------------------------------
# Backend Service Account IAM Bindings
# -----------------------------------------------------------------------------

resource "google_project_iam_member" "backend_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_storage_bucket_iam_member" "backend_storage_access" {
  bucket = google_storage_bucket.evidence.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.backend.email}"
}
