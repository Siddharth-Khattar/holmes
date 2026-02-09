"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { GeospatialMap } from "@/components/Geospatial/GeospatialMap";
import { useGeospatialData } from "@/hooks/useGeospatialData";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MapPin, RefreshCw } from "lucide-react";

export default function GeospatialPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { status, locations, loading, generating, error, generate, refresh } =
    useGeospatialData(caseId);

  const [showConfirmRefresh, setShowConfirmRefresh] = useState(false);

  const handleRefresh = () => {
    if (showConfirmRefresh) {
      refresh();
      setShowConfirmRefresh(false);
    } else {
      setShowConfirmRefresh(true);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Status Banner */}
      <div className="border-b border-neutral-800 bg-neutral-950 p-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!status?.exists && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-sm font-medium text-neutral-200">
                  Geospatial intelligence not yet generated
                </p>
                <p className="text-xs text-neutral-400">
                  Extract and visualize location-based evidence from case data
                </p>
              </div>
            </div>
            <Button onClick={() => generate()} disabled={loading || generating}>
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Geospatial Intelligence
            </Button>
          </div>
        )}

        {status?.status === "generating" && (
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
            <div>
              <p className="text-sm font-medium text-neutral-200">
                Analyzing locations and movement patterns...
              </p>
              <p className="text-xs text-neutral-400">
                This may take 1-2 minutes. You can leave this page.
              </p>
            </div>
          </div>
        )}

        {status?.status === "complete" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-neutral-200">
                  Geospatial analysis complete
                </p>
                <p className="text-xs text-neutral-400">
                  {status.location_count} locations found
                  {status.last_generated &&
                    ` • Last updated: ${new Date(
                      status.last_generated,
                    ).toLocaleString()}`}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {showConfirmRefresh ? "Confirm Refresh?" : "Refresh"}
            </Button>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1">
        {status?.status === "complete" && locations.length > 0 ? (
          <GeospatialMap
            landmarks={locations}
            paths={[]} // Phase 8.1 v1: paths not exposed yet
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MapPin className="mx-auto h-12 w-12 text-neutral-600" />
              <p className="mt-4 text-sm text-neutral-400">
                {status?.status === "generating"
                  ? "Generating geospatial intelligence..."
                  : "No geospatial data available"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
