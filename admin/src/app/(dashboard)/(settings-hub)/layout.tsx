import SettingsSectionTabs from "@/components/settings/SettingsSectionTabs";

export default function SettingsHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <SettingsSectionTabs />
      {children}
    </div>
  );
}
