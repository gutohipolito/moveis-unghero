import type { Metadata } from "next";
import ParceiroPublicFrameSync from "./ParceiroPublicFrameSync";

export const metadata: Metadata = {
  title: "Portal Parceiro - Móveis Unghero",
  description: "Portal do parceiro da Móveis Unghero",
  applicationName: "Portal Parceiro - Móveis Unghero",
  manifest: "/parceiro-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Parceiro MU",
  },
};

export default function ParceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ParceiroPublicFrameSync />
      {children}
    </>
  );
}
