import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { X } from 'lucide-react';
import { cx } from '../../lib/id';

/* ---------------- Keyboard inset (§96) ---------------- */

export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener('resize', on);
    vv.addEventListener('scroll', on);
    on();
    return () => {
      vv.removeEventListener('resize', on);
      vv.removeEventListener('scroll', on);
    };
  }, []);
  return inset;
}

/* ---------------- Bottom Sheet (§94) ---------------- */

export function Sheet({
  title,
  onClose,
  children,
  footer,
  headerRight,
  tall,
  depth = 0,
  label,
}: {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  headerRight?: ReactNode;
  tall?: boolean;
  depth?: number;
  label?: string;
}) {
  const kb = useKeyboardInset();
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const [dy, setDy] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = Math.max(0, e.clientY - drag.current.y);
    drag.current.dy = d;
    setDy(d);
  };
  const onPointerUp = () => {
    if (drag.current && drag.current.dy > 90) onClose();
    drag.current = null;
    setDy(0);
  };

  return (
    <div className="fixed inset-0 z-50" style={{ zIndex: 50 + depth }} role="dialog" aria-modal="true" aria-label={label ?? (typeof title === 'string' ? title : undefined)}>
      <div className="absolute inset-0 bg-black/25 animate-fade-in dark:bg-black/50" onClick={onClose} />
      <div
        ref={panelRef}
        className={cx(
          'absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-[520px] flex-col rounded-t-[26px] bg-elevated shadow-sheet animate-sheet-in',
          tall ? 'h-[92dvh]' : 'max-h-[92dvh]',
        )}
        style={{
          transform: dy ? `translateY(${dy}px)` : undefined,
          transition: drag.current ? 'none' : 'transform 0.2s ease',
          paddingBottom: kb > 0 ? kb : undefined,
        }}
      >
        <div
          className="flex cursor-grab touch-none justify-center pb-1 pt-2.5"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="h-[5px] w-9 rounded-full bg-line" />
        </div>
        {(title || headerRight) && (
          <div className="flex min-h-[48px] items-center gap-2 px-5 pb-1">
            <div className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-[-0.01em]">{title}</div>
            {headerRight}
            <IconButton label="閉じる" onClick={onClose} className="-mr-2">
              <X size={20} strokeWidth={1.8} />
            </IconButton>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 no-scrollbar">{children}</div>
        {footer && (
          <div className="border-t hairline px-5 pt-3" style={{ paddingBottom: kb > 0 ? 12 : 'calc(12px + var(--sab))' }}>
            {footer}
          </div>
        )}
        {!footer && <div style={{ height: kb > 0 ? 8 : 'calc(8px + var(--sab))' }} />}
      </div>
    </div>
  );
}

/* ---------------- Buttons ---------------- */

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' | 'md' }
>(function IconButton({ label, className, children, size = 'md', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'press inline-flex shrink-0 items-center justify-center rounded-full text-ink/80 hover:bg-surface active:bg-line/70 disabled:opacity-35',
        size === 'md' ? 'h-11 w-11' : 'h-9 w-9',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function Button({
  variant = 'secondary',
  className,
  children,
  block,
  size = 'md',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      className={cx(
        'press inline-flex items-center justify-center gap-2 rounded-[14px] font-medium tracking-[-0.005em] disabled:opacity-40',
        size === 'sm' && 'h-9 px-3 text-[13px]',
        size === 'md' && 'h-11 px-4 text-[15px]',
        size === 'lg' && 'h-[52px] px-5 text-[16px]',
        variant === 'primary' && 'bg-accent text-on-accent hover:opacity-90',
        variant === 'secondary' && 'bg-surface text-ink hover:bg-line/60',
        variant === 'outline' && 'border hairline bg-transparent text-ink hover:bg-surface',
        variant === 'ghost' && 'bg-transparent text-ink/80 hover:bg-surface',
        variant === 'danger' && 'bg-danger/10 text-danger hover:bg-danger/15',
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Toggle ---------------- */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-11 w-[52px] shrink-0 items-center justify-center"
    >
      <span className={cx('h-[30px] w-[50px] rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-line')} />
      <span
        className={cx(
          'absolute top-1/2 h-[26px] w-[26px] -translate-y-1/2 rounded-full bg-white shadow-soft transition-transform duration-200 ease-out',
        )}
        style={{ left: 3, transform: `translate(${checked ? 20 : 0}px, -50%)` }}
      />
    </button>
  );
}

/* ---------------- Segmented ---------------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode; aria?: string }[];
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex w-full rounded-[13px] bg-surface p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.aria}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2 font-medium transition-all duration-150',
            size === 'md' ? 'h-9 text-[13.5px]' : 'h-8 text-[12.5px]',
            value === o.value ? 'bg-elevated text-ink shadow-hair ring-1 ring-black/[0.04] dark:ring-white/[0.06]' : 'text-subtle hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Fields ---------------- */

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cx(
        'h-12 w-full rounded-[14px] bg-surface px-4 text-[16px] outline-none ring-accent/30 placeholder:text-faint focus:ring-2',
        className,
      )}
      {...rest}
    />
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cx(
        'w-full rounded-[14px] bg-surface px-4 py-3 text-[16px] leading-relaxed outline-none ring-accent/30 placeholder:text-faint focus:ring-2',
        className,
      )}
      {...rest}
    />
  );
});

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <span className="text-[12.5px] font-medium text-subtle">{label}</span>
        {hint && <span className="text-[11.5px] text-faint">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

/* ---------------- Grouped list (Settings 等) ---------------- */

export function Group({ title, children, footer }: { title?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="mb-6">
      {title && <h3 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">{title}</h3>}
      <div className="divide-y divide-line overflow-hidden rounded-[18px] bg-surface">{children}</div>
      {footer && <p className="mt-2 px-1 text-[12px] leading-relaxed text-faint">{footer}</p>}
    </section>
  );
}

export function Row({
  icon,
  label,
  description,
  right,
  onClick,
  danger,
}: {
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx(
        'flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left',
        onClick && 'press active:bg-line/50',
      )}
    >
      {icon && <span className={cx('shrink-0', danger ? 'text-danger' : 'text-subtle')}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className={cx('block text-[15px]', danger && 'text-danger')}>{label}</span>
        {description && <span className="mt-0.5 block text-[12.5px] leading-snug text-subtle">{description}</span>}
      </span>
      {right}
    </Comp>
  );
}

/* ---------------- Misc ---------------- */

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-medium transition-colors',
        active ? 'bg-accent text-on-accent' : 'bg-surface text-ink/80 hover:bg-line/60',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-surface text-subtle">{icon}</div>}
      <div className="text-[16px] font-semibold tracking-[-0.01em]">{title}</div>
      {body && <div className="mt-1.5 max-w-[280px] text-[13.5px] leading-relaxed text-subtle">{body}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-1 flex min-h-[32px] items-center justify-between px-1">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">{children}</h2>
      {right}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  label: string;
  format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-20 shrink-0 text-[13.5px] text-subtle">{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-[4px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-[10px] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)] [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)] [&::-moz-range-track]:h-[4px] [&::-moz-range-track]:rounded-full"
        style={{ ['--p' as string]: `${pct}%`, background: 'transparent' }}
      />
      <span className="w-12 shrink-0 text-right text-[12.5px] tabular text-subtle">{format ? format(value) : value}</span>
    </div>
  );
}
