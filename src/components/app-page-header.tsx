interface AppPageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  /** Deprecated (design elevation 2026-06-10): gradient text removed; prop kept for compatibility */
  gradient?: boolean;
  /** Machine-voice line rendered above the title, e.g. "LIBRARY · 23 KITS" */
  kicker?: string;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
}

export function AppPageHeader({
  title,
  description,
  icon,
  kicker,
  actions,
  stats,
}: AppPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 bg-surface-container-low border border-border rounded-xl">
            {icon}
          </div>
        )}
        <div>
          {kicker && <p className="text-machine mb-1">{kicker}</p>}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {stats}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
