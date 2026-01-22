# ABOUTME: Cloud Run service definitions for Holmes backend and frontend.
# ABOUTME: Configures scaling, environment, Cloud SQL connection, and public access.

# -----------------------------------------------------------------------------
# Backend Service
# -----------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "backend" {
  name                = "holmes-backend"
  location            = var.region
  project             = var.project_id
  deletion_protection = false # Hackathon mode

  template {
    service_account = google_service_account.backend.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.holmes.repository_id}/backend:latest"

      ports {
        container_port = 8080
      }

      env {
        name  = "PYTHONUNBUFFERED"
        value = "1"
      }

      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.evidence.name
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql+asyncpg://${google_sql_user.backend.name}:${random_password.db_password.result}@/${google_sql_database.holmes.name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    # Enable response streaming for SSE (300s = 5 min timeout)
    timeout = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.run,
    google_project_service.sqladmin,
    google_artifact_registry_repository.holmes,
  ]
}

# -----------------------------------------------------------------------------
# Frontend Service
# -----------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "frontend" {
  name                = "holmes-frontend"
  location            = var.region
  project             = var.project_id
  deletion_protection = false # Hackathon mode

  template {
    service_account = google_service_account.frontend.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.holmes.repository_id}/frontend:latest"

      ports {
        container_port = 3000
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "" # Will be updated after backend deploys
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    timeout = "60s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.run,
    google_artifact_registry_repository.holmes,
  ]
}

# -----------------------------------------------------------------------------
# Public Access (allUsers invoker)
# -----------------------------------------------------------------------------

resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
