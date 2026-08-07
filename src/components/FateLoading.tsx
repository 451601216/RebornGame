type FateLoadingProps = {
  label?: string;
  compact?: boolean;
};

export function FateLoading({
  label = "命运编织中",
  compact = false,
}: FateLoadingProps) {
  return (
    <div
      className={compact ? "fate-loading fate-loading-compact" : "fate-loading"}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="fate-loading-ring" aria-hidden="true">
        <span className="fate-loading-core" />
      </div>
      <p className="fate-loading-text">
        {label}
        <span className="fate-loading-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </p>
    </div>
  );
}
