import React from "react";
import InfoTooltip from "@/components/ui/InfoTooltip";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** Conteúdo do tooltip de ajuda exibido ao lado do título. */
  help?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  badge,
  actions,
  children,
  help,
}: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-main">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="page-title">{title}</h1>
            {help && <InfoTooltip label={`Sobre ${title}`}>{help}</InfoTooltip>}
            {badge}
            {children}
          </div>
          {description && <p className="page-subtitle">{description}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  );
}
