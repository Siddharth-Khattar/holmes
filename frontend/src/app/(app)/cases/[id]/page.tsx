"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CasePage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect to library page by default
    router.replace(`/cases/${params.id}/library`);
  }, [params.id, router]);

  return null;
}
