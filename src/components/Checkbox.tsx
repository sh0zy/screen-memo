import { cx } from '../lib/id';

export function Checkbox({
  checked,
  onChange,
  label,
  size = 22,
  round = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  size?: number;
  round?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="-m-[11px] inline-flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <span
        key={checked ? 'on' : 'off'}
        className={cx(
          'inline-flex items-center justify-center border-[1.6px] transition-colors duration-150',
          checked ? 'check-pop border-accent bg-accent' : 'border-ink/30 bg-transparent hover:border-ink/50',
        )}
        style={{ width: size, height: size, borderRadius: round ? '50%' : size * 0.3 }}
      >
        {checked && (
          <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              className="check-draw"
              d="M2.5 6.3 5 8.6 9.6 3.6"
              stroke="rgb(var(--c-on-accent))"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
