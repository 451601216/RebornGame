"use client";

type Props = {
  label?: string;
  disabled?: boolean;
  onClick: () => void;
};

export function ContinueButton({ label = "继续", disabled, onClick }: Props) {
  return (
    <div className="action-block">
      <button
        type="button"
        className="primary-btn"
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </button>
    </div>
  );
}
