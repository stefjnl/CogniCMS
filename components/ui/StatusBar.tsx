"use client";

interface StatusIndicatorProps {
  label: string;
  icon: string;
  color: "green" | "blue" | "amber" | "red";
}

export function StatusIndicator({ label, icon, color }: StatusIndicatorProps) {
  const colorClasses = {
    green: "bg-success-100 text-success-700 border-success-200",
    blue: "bg-brand-100 text-brand-700 border-brand-200",
    amber: "bg-warning-100 text-warning-700 border-warning-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium ${colorClasses[color]}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export function StatusBar({
  gitHubConnected,
  aiModel,
  unpublishedChanges,
}: {
  gitHubConnected: boolean;
  aiModel?: string;
  unpublishedChanges?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusIndicator
        label={gitHubConnected ? "Connected to GitHub" : "GitHub Disconnected"}
        icon="✓"
        color={gitHubConnected ? "green" : "red"}
      />
      {aiModel && (
        <StatusIndicator label={`AI: ${aiModel}`} icon="🤖" color="blue" />
      )}
      {unpublishedChanges !== undefined && unpublishedChanges > 0 && (
        <StatusIndicator
          label={`${unpublishedChanges} Unpublished Change${
            unpublishedChanges !== 1 ? "s" : ""
          }`}
          icon="📝"
          color="amber"
        />
      )}
    </div>
  );
}
