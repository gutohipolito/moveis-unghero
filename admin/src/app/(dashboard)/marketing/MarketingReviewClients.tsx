"use client";

import { useState, useCallback } from "react";
import GoogleReviewLinkCard from "@/components/marketing/GoogleReviewLinkCard";
import { getClientsForWhatsAppMessaging } from "@/app/actions/cliente";
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
    const result = await getClientsForWhatsAppMessaging(companyId);
    if (result.success && result.clients) {
      setClients(result.clients);
    }
  }, [companyId]);

  useLiveEntity("clients", { sync: syncClients });

  return <GoogleReviewLinkCard clients={clients} mailboxes={mailboxes} />;
}
