interface AppPageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  gradient?: boolean;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
}

export function AppPageHeader({
  title,
  description,
  icon,
  gradient = true,
  actions,
  stats,
}: AppPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 bg-gradient-to-br from-primary/15 to-accent-purple/10 rounded-xl shadow-sm">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-3">
            <h1
              className={`text-2xl font-bold ${
                gradient
                  ? 'bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent'
                  : 'text-foreground'
              }`}
            >
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
