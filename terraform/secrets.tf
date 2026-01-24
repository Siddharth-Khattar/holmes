# ABOUTME: Secret Manager resources for authentication secrets.
# ABOUTME: Stores Better Auth secret and Google OAuth credentials.

# Enable Secret Manager API
resource "google_project_service" "secretmanager" {
  project            = var.project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# -----------------------------------------------------------------------------
# Secret Definitions
# -----------------------------------------------------------------------------

resource "google_secret_manager_secret" "better_auth_secret" {
  project   = var.project_id
  secret_id = "better-auth-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret" "google_client_id" {
  project   = var.project_id
  secret_id = "google-client-id"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret" "google_client_secret" {
  project   = var.project_id
  secret_id = "google-client-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

# -----------------------------------------------------------------------------
# IAM: Allow frontend service account to access secrets
# -----------------------------------------------------------------------------

resource "google_secret_manager_secret_iam_member" "frontend_better_auth" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.better_auth_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.frontend.email}"
}

resource "google_secret_manager_secret_iam_member" "frontend_google_client_id" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.google_client_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.frontend.email}"
}

resource "google_secret_manager_secret_iam_member" "frontend_google_client_secret" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.google_client_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.frontend.email}"
}
