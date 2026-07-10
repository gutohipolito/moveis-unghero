"use client";

import { useState, useCallback } from "react";
import GoogleReviewLinkCard from "@/components/marketing/GoogleReviewLinkCard";
import { getClientsLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import type { GoogleReviewClientOption } from "@/lib/google-review";

interface MarketingReviewClientsProps {
  initialClients: GoogleReviewClientOption[];
  companyId: string;
}

export default function MarketingReviewClients({
  initialClients,
  companyId,
}: MarketingReviewClientsProps) {
  const [clients, setClients] = useState(initialClients);

  const syncClients = useCallback(async () => {
    const result = await getClientsLiveSnapshot(companyId);
    if (result.success && result.clients) {
      setClients(
        result.clients.map((client) => ({
          id: client.id,
          nome: client.nome,
          telefone: client.telefone,
        }))
      );
    }
  }, [companyId]);

  useLiveEntity("clients", { sync: syncClients });

  return <GoogleReviewLinkCard clients={clients} />;
}
