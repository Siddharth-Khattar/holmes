"use client";

import { GeospatialMap } from "@/components/Geospatial";
import { mockGeospatialData } from "@/lib/mock-geospatial-data";

export default function GeospatialPage() {
  // In production, fetch geospatial data based on case ID
  // const params = useParams();
  // const { data, loading, error } = useGeospatialData(params.id as string);

  return (
    <div className="h-[calc(100vh-200px)]">
      <GeospatialMap
        landmarks={mockGeospatialData.landmarks}
        paths={mockGeospatialData.paths}
      />
    </div>
  );
}
