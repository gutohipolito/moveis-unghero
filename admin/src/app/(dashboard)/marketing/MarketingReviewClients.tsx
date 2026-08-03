"use client";

import { useState, useCallback } from "react";
import GoogleReviewLinkCard from "@/components/marketing/GoogleReviewLinkCard";
import { getClientsLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";
import type { GoogleReviewClientOption } from "@/lib/google-review";
import type { EmailMailboxDTO } from "@/app/actions/emailMailboxes";

interface MarketingReviewClientsProps {
  initialClients: GoogleReviewClientOption[];
  companyId: string;
  mailboxes?: EmailMailboxDTO[];
}

export default function MarketingReviewClients({
  initialClients,
  companyId,
  mailboxes = [],
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
          email: client.email || "",
        }))
      );
    }
  }, [companyId]);

  useLiveEntity("clients", { sync: syncClients });

  return <GoogleReviewLinkCard clients={clients} mailboxes={mailboxes} />;
}
