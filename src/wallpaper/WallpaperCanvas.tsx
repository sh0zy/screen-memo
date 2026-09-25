import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { Flame } from 'lucide-react';
import type { BackgroundConfig, FontFamily, ScreenDoc, TemplateStyle } from '../types';
import { Icon } from '../lib/icons';
import { buildWallpaperModel, type ModelInput, type WallpaperModel, type WPItem, type WPSection } from './model';
import { getTemplate } from './templates';
import { useAssetUrl } from './assets';

/* =========================================================
 * WallpaperCanvas
 *  - 論理サイズ (width × height) で描画。フォント・余白は幅390基準で比例。
 *  - 収まらなければ density を段階的に下げ、それでもダメなら
 *    重要度の低い項目から落とす (§31, §32)。
 * ======================================================= */

export interface FitResult {
  density: number;
  trimmed: number;
  overflowing: boolean;
}

interface Props {
  input: Omit<ModelInput, 'budget'>;
  width: number;
  height: number;
  /** モックアップ用: 仮の時計 / アプリアイコン (§73) */
  chrome?: 'lock' | 'home' | false;
  onFit?: (r: FitResult) => void;
  canvasRef?: Ref<HTMLDivElement>;
  className?: string;
  style?: CSSProperties;
}

const DENSITY = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.66];
const SIZE_PRESET = { S: 0.9, M: 1, L: 1.1, XL: 1.22 } as const;
const IMPORTANT_BUDGET = 8;
const HOME_BUDGET = 9;

export const FONT_STACK: Record<FontFamily, string> = {
  sans: 'Inter, "Noto Sans JP", system-ui, -apple-system, sans-serif',
  serif: '"Noto Serif JP", "Hiragino Mincho ProN", Georgia, serif',
  rounded: '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", Inter, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
};

function countShown(m: WallpaperModel) {
  return (
    m.goals.length +
    m.sections.reduce(
      (n, s) =>
        n +
        s.items.length +
        (s.schedule?.length ?? 0) +
        (s.habits?.length ?? 0) +
        (s.memoLines?.length ?? 0) +
        (s.countdowns?.length ?? 0) +
        (s.cards?.length ?? 0),
      0,
    )
  );
}

function luminance(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const n = parseInt(full.slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function WallpaperCanvas({ input, width, height, chrome = false, onFit, canvasRef, className, style }: Props) {
  const screen = input.screen;
  const tpl = getTemplate(screen.templateId);
  const initialBudget = screen.overflow === 'important' ? IMPORTANT_BUDGET : screen.mode === 'home' ? HOME_BUDGET : Infinity;

  // 入力が変わったら fit 状態をリセット (render-phase reset パターン)
  const token = useMemo(() => ({}), [input, width, height, initialBudget]);
  const [fit, setFit] = useState({ token, step: 0, budget: initialBudget });
  let cur = fit;
  if (fit.token !== token) {
    cur = { token, step: 0, budget: initialBudget };
    setFit(cur);
  }

  const model = useMemo(() => buildWallpaperModel({ ...input, budget: cur.budget }), [input, cur.budget]);
  const fullCount = model.totalItems;
  const shown = countShown(model);

  const availRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const avail = availRef.current;
    const content = contentRef.current;
    if (!avail || !content) return;
    const over = content.scrollHeight > avail.clientHeight + 1;
    if (over) {
      if (cur.step < DENSITY.length - 1) setFit({ ...cur, step: cur.step + 1 });
      else if (shown > 1) setFit({ ...cur, budget: Math.max(1, shown - 1) });
      else onFit?.({ density: DENSITY[cur.step], trimmed: fullCount - shown, overflowing: true });
    } else {
      onFit?.({ density: DENSITY[cur.step], trimmed: Math.max(0, fullCount - shown), overflowing: false });
    }
  });

  const u = width / 390;
  const f = SIZE_PRESET[screen.fontSettings.size] * screen.fontSettings.scale * DENSITY[cur.step];
  const px = (n: number) => `${(n * u * f).toFixed(2)}px`;
  const sp = (n: number) => `${(n * u * (0.55 + 0.45 * f)).toFixed(2)}px`; // spacing: 緩やかに縮む

  const fg = screen.fontSettings.textColor;
  const lightText = luminance(fg) > 0.55;
  const isPhoto = screen.background.type === 'photo';
  const shadow = isPhoto && screen.background.textShadow ? '0 1px 12px rgba(0,0,0,0.35)' : undefined;

  const lock = screen.mode === 'lock';
  const layout = tpl.style.layout;
  const padX = 28 * u;
  const topPad = lock ? height * screen.safeTop : height * 0.13;
  const bottomPad = lock ? height * 0.12 : height * 0.17;

  const justify =
    screen.mode === 'home' ? 'flex-end' : layout === 'minimal' || layout === 'hero' ? 'center' : 'flex-start';

  const ctx: RenderCtx = {
    px, sp, u, fg, lightText, accent: screen.fontSettings.accentColor, style: tpl.style, screen,
    completedDisplay: input.completedDisplay, checkInk: checkInkColor(screen.background, lightText),
  };

  return (
    <div
      ref={canvasRef}
      className={className}
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        color: fg,
        fontFamily: FONT_STACK[screen.fontSettings.family],
        fontFeatureSettings: '"cv11", "ss01", "tnum" 0',
        WebkitFontSmoothing: 'antialiased',
        textShadow: shadow,
        ...style,
      }}
    >
      <Background bg={screen.background} />

      {chrome === 'lock' && <LockChrome u={u} height={height} fg={fg} date={model.dateInfo} />}
      {chrome === 'home' && <HomeChrome u={u} width={width} height={height} lightText={lightText} />}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: topPad,
          paddingBottom: bottomPad,
          paddingLeft: padX,
          paddingRight: padX,
          opacity: screen.mode === 'home' ? screen.contentOpacity : 1,
        }}
      >
        <div
          ref={availRef}
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: justify, overflow: 'hidden' }}
        >
          <div ref={contentRef} style={{ flexShrink: 0 }}>
            {layout === 'minimal' ? (
              <MinimalLayout m={model} c={ctx} />
            ) : layout === 'hero' ? (
              <HeroLayout m={model} c={ctx} />
            ) : layout === 'checklist' ? (
              <ChecklistLayout m={model} c={ctx} />
            ) : (
              <StackLayout m={model} c={ctx} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================== shared ================== */

interface RenderCtx {
  px: (n: number) => string;
  sp: (n: number) => string;
  u: number;
  fg: string;
  lightText: boolean;
  accent: string;
  style: TemplateStyle;
  screen: ScreenDoc;
  completedDisplay: ModelInput['completedDisplay'];
  checkInk: string;
}

function checkInkColor(bg: BackgroundConfig, lightText: boolean) {
  if (bg.type === 'solid') return bg.color;
  return lightText ? '#111' : '#fff';
}

function Background({ bg }: { bg: BackgroundConfig }) {
  const url = useAssetUrl(bg.type === 'photo' ? bg.photoId : undefined);
  if (bg.type === 'photo') {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#1a1a1c', overflow: 'hidden' }}>
        {url && (
          <img
            src={url}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: `blur(${bg.blur}px) brightness(${bg.brightness})`,
              transform: bg.blur > 0 ? 'scale(1.12)' : undefined,
            }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${bg.overlay})` }} />
      </div>
    );
  }
  const background =
    bg.type === 'gradient' ? `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})` : bg.color;
  return <div style={{ position: 'absolute', inset: 0, background }} />;
}

function Label({ c, children, icon, center }: { c: RenderCtx; children: ReactNode; icon?: WPSection['icon']; center?: boolean }) {
  const upper = c.style.labelCase === 'upper';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: center ? 'center' : 'flex-start',
        gap: c.px(6),
        fontSize: c.px(upper ? 10.5 : 12),
        fontWeight: 600,
        letterSpacing: upper ? '0.16em' : '0.01em',
        textTransform: upper ? 'uppercase' : 'none',
        opacity: 0.48,
        marginBottom: c.sp(10),
        fontFamily: FONT_STACK.sans,
      }}
    >
      {icon && <Icon name={icon} size={parseFloat(c.px(12))} strokeWidth={2} />}
      <span>{children}</span>
    </div>
  );
}

function Check({ c, done, size = 17, round = false }: { c: RenderCtx; done: boolean; size?: number; round?: boolean }) {
  const s = parseFloat(c.px(size));
  return (
    <span
      aria-hidden
      style={{
        flexShrink: 0,
        width: s,
        height: s,
        borderRadius: round ? '50%' : s * 0.3,
        border: `${Math.max(1.2, s * 0.09)}px solid ${c.fg}`,
        opacity: done ? 0.4 : 0.72,
        background: done ? c.fg : 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: s * 0.12,
      }}
    >
      {done && (
        <svg width={s * 0.62} height={s * 0.62} viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.3 5 8.6 9.6 3.6" stroke={c.checkInk} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function TaskLine({ c, item, size = 16, big = false }: { c: RenderCtx; item: WPItem; size?: number; big?: boolean }) {
  const doneStyle: CSSProperties = item.done
    ? { opacity: 0.4, textDecoration: c.completedDisplay === 'strike' ? 'line-through' : 'none', textDecorationThickness: '1px' }
    : {};
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: c.px(big ? 14 : 11) }}>
      <Check c={c} done={item.done} size={big ? 20 : 16.5} />
      <div style={{ minWidth: 0, flex: 1, fontSize: c.px(size), lineHeight: 1.38, fontWeight: big ? 500 : 450, ...doneStyle }}>
        <span style={{ wordBreak: 'break-word' }}>{item.text}</span>
        {item.high && !item.done && (
          <span
            aria-label="High priority"
            style={{
              display: 'inline-block',
              width: c.px(6),
              height: c.px(6),
              borderRadius: '50%',
              background: c.accent,
              marginLeft: c.px(7),
              verticalAlign: 'middle',
              transform: 'translateY(-1px)',
            }}
          />
        )}
        {(item.sub || item.meta) && (
          <span style={{ marginLeft: c.px(8), fontSize: c.px(11), opacity: 0.5, fontWeight: 500, letterSpacing: '0.02em' }}>
            {item.meta && <span style={{ color: c.accent, opacity: 1 }}>{item.meta}</span>}
            {item.meta && item.sub ? ' · ' : ''}
            {item.sub}
          </span>
        )}
      </div>
    </div>
  );
}

function Card({ c, children }: { c: RenderCtx; children: ReactNode }) {
  const cs = c.style.cardStyle;
  if (cs === 'none') return <div>{children}</div>;
  const base: CSSProperties = { borderRadius: c.sp(20), padding: `${c.sp(16)} ${c.sp(18)}` };
  if (cs === 'card')
    return (
      <div style={{ ...base, background: c.lightText ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.62)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        {children}
      </div>
    );
  if (cs === 'outline')
    return (
      <div style={{ ...base, border: `1px solid ${c.lightText ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.09)'}` }}>
        {children}
      </div>
    );
  return (
    <div
      style={{
        ...base,
        background: c.lightText ? 'rgba(20,20,24,0.28)' : 'rgba(255,255,255,0.34)',
        border: `1px solid ${c.lightText ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.55)'}`,
        backdropFilter: 'blur(22px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
      }}
    >
      {children}
    </div>
  );
}

function More({ c, n, center }: { c: RenderCtx; n: number; center?: boolean }) {
  if (n <= 0) return null;
  return (
    <div style={{ fontSize: c.px(11.5), opacity: 0.42, marginTop: c.sp(8), textAlign: center ? 'center' : 'left', fontWeight: 500 }}>
      +{n} more
    </div>
  );
}

function Header({ m, c, center, compact }: { m: WallpaperModel; c: RenderCtx; center?: boolean; compact?: boolean }) {
  const { screen } = c;
  const d = m.dateInfo;
  return (
    <div style={{ textAlign: center ? 'center' : 'left', marginBottom: c.sp(compact ? 18 : 26) }}>
      {screen.showDate && (
        <div
          style={{
            fontSize: c.px(11),
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.5,
            fontFamily: FONT_STACK.sans,
          }}
        >
          {d.weekday} · {d.month} {d.day}
        </div>
      )}
      <div
        style={{
          fontSize: c.px((compact ? 30 : 40) * c.style.heroScale),
          fontWeight: 650,
          letterSpacing: '-0.035em',
          lineHeight: 1.05,
          marginTop: c.sp(6),
        }}
      >
        {m.heroLabel === 'TODAY' ? 'Today' : m.heroLabel === 'TOMORROW' ? 'Tomorrow' : 'Tonight'}
      </div>
      {m.headline && (
        <div style={{ fontSize: c.px(15), opacity: 0.62, marginTop: c.sp(8), lineHeight: 1.45, fontWeight: 450 }}>
          {m.headline}
        </div>
      )}
    </div>
  );
}

function Goals({ m, c, center, hero }: { m: WallpaperModel; c: RenderCtx; center?: boolean; hero?: boolean }) {
  if (!m.goals.length) return null;
  const conf = c.screen.sections.find((s) => s.kind === 'goal');
  return (
    <div style={{ marginBottom: c.sp(hero ? 34 : 26), textAlign: center ? 'center' : 'left' }}>
      <Label c={c} icon={conf?.icon} center={center}>
        {conf?.title || (m.goals.length > 1 ? 'Goals' : 'Goal')}
      </Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: c.sp(hero ? 14 : 9) }}>
        {m.goals.map((g) => (
          <div
            key={g.id}
            style={{
              fontSize: c.px(hero ? 27 : m.goals.length === 1 ? 22 : 18.5),
              fontWeight: hero ? 600 : 620,
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
              opacity: g.done ? 0.38 : 1,
              textDecoration: g.done ? 'line-through' : 'none',
              textDecorationThickness: '1.5px',
              display: 'flex',
              gap: c.px(10),
              justifyContent: center ? 'center' : 'flex-start',
              alignItems: 'baseline',
            }}
          >
            {!center && m.goals.length > 1 && (
              <span style={{ fontSize: c.px(12), opacity: 0.4, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {String(m.goals.indexOf(g) + 1).padStart(2, '0')}
              </span>
            )}
            <span>{g.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Progress({ m, c, center }: { m: WallpaperModel; c: RenderCtx; center?: boolean }) {
  const { screen } = c;
  if (!screen.showProgress || m.progress.total === 0) return null;
  const pct = Math.round((m.progress.done / m.progress.total) * 100);
  const label = screen.progressStyle === 'percent' ? `${pct}%` : `${m.progress.done} / ${m.progress.total}`;
  return (
    <div style={{ marginTop: c.sp(26), display: 'flex', alignItems: 'center', gap: c.px(12), justifyContent: center ? 'center' : 'flex-start' }}>
      {screen.progressStyle === 'bar' && (
        <div style={{ flex: center ? '0 0 40%' : 1, height: Math.max(2, 2.5 * c.u), borderRadius: 99, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'currentColor', opacity: 0.14 }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'currentColor', opacity: 0.85, borderRadius: 99 }} />
        </div>
      )}
      <div style={{ fontSize: c.px(12), fontWeight: 600, opacity: 0.55, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  );
}

/* ---------- section bodies ---------- */

function SectionBody({ s, c, agenda }: { s: WPSection; c: RenderCtx; agenda?: boolean }) {
  switch (s.kind) {
    case 'priority':
    case 'tasks':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: c.sp(10) }}>
          {s.items.map((it) => (
            <TaskLine key={it.id} c={c} item={it} size={s.kind === 'priority' ? 16.5 : 15.5} />
          ))}
        </div>
      );
    case 'schedule':
      return agenda ? <Agenda s={s} c={c} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: c.sp(8) }}>
          {s.schedule!.map((it) => (
            <div key={it.id} style={{ display: 'flex', gap: c.px(14), alignItems: 'baseline', opacity: it.past ? 0.4 : 1 }}>
              <span style={{ fontSize: c.px(13), fontWeight: 600, fontVariantNumeric: 'tabular-nums', opacity: 0.6, width: c.px(44), flexShrink: 0, fontFamily: FONT_STACK.sans }}>
                {it.time}
              </span>
              <span style={{ fontSize: c.px(15.5), fontWeight: 450, lineHeight: 1.38 }}>{it.title}</span>
            </div>
          ))}
        </div>
      );
    case 'habits':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: c.px(14), rowGap: c.sp(9) }}>
          {s.habits!.map((h) => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: c.px(8), minWidth: 0 }}>
              <Check c={c} done={h.done} size={14} round />
              <span style={{ fontSize: c.px(14), fontWeight: 450, opacity: h.done ? 0.45 : 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h.title}
              </span>
              {h.streak > 1 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: c.px(11), opacity: 0.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  <Flame size={parseFloat(c.px(11))} strokeWidth={2.2} />
                  {h.streak}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    case 'memo':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: c.sp(5), borderLeft: `${Math.max(1.5, 2 * c.u)}px solid ${c.fg}`, paddingLeft: c.px(12), borderColor: c.lightText ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.14)' }}>
          {s.memoLines!.map((l, i) => (
            <div key={i} style={{ fontSize: c.px(15), lineHeight: 1.45, fontWeight: 450, opacity: 0.86, wordBreak: 'break-word' }}>
              {l}
            </div>
          ))}
        </div>
      );
    case 'countdown': {
      const cds = s.countdowns!;
      if (cds.length === 1) {
        const cd = cds[0];
        return (
          <div>
            <div style={{ fontSize: c.px(13), opacity: 0.62, fontWeight: 500 }}>{cd.title}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: c.px(8), marginTop: c.sp(2) }}>
              <span style={{ fontSize: c.px(46), fontWeight: 650, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {cd.days}
              </span>
              <span style={{ fontSize: c.px(11), fontWeight: 600, letterSpacing: '0.16em', opacity: 0.55 }}>
                {cd.days === 0 ? 'TODAY' : cd.days === 1 ? 'DAY LEFT' : 'DAYS LEFT'}
              </span>
            </div>
          </div>
        );
      }
      return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, cds.length)}, 1fr)`, gap: c.px(14) }}>
          {cds.map((cd) => (
            <div key={cd.id} style={{ minWidth: 0 }}>
              <div style={{ fontSize: c.px(28), fontWeight: 650, letterSpacing: '-0.03em', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
                {cd.days}
                <span style={{ fontSize: c.px(10), fontWeight: 600, letterSpacing: '0.12em', opacity: 0.5, marginLeft: c.px(4) }}>DAYS</span>
              </div>
              <div style={{ fontSize: c.px(12), opacity: 0.6, marginTop: c.sp(3), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cd.title}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'cards':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: c.px(10) }}>
          {s.cards!.map((card) => {
            const isProg = card.kind === 'progress';
            const num = Number(card.value);
            const den = Number(card.sub);
            const pct = isProg && den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0;
            return (
              <div
                key={card.id}
                style={{
                  borderRadius: c.sp(16),
                  padding: `${c.sp(12)} ${c.sp(14)}`,
                  background: c.lightText ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.035)',
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: c.px(5), fontSize: c.px(10.5), fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5 }}>
                  {card.icon && <Icon name={card.icon} size={parseFloat(c.px(11))} strokeWidth={2} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.title}</span>
                </div>
                <div style={{ fontSize: c.px(card.kind === 'text' ? 16 : 22), fontWeight: 650, letterSpacing: '-0.02em', marginTop: c.sp(4), lineHeight: 1.15, fontVariantNumeric: 'tabular-nums', wordBreak: 'break-word' }}>
                  {isProg ? `${card.value} / ${card.sub ?? ''}` : card.value}
                </div>
                {isProg ? (
                  <div style={{ height: Math.max(2, 3 * c.u), borderRadius: 99, marginTop: c.sp(8), background: c.lightText ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'currentColor', borderRadius: 99 }} />
                  </div>
                ) : card.sub ? (
                  <div style={{ fontSize: c.px(11.5), opacity: 0.55, marginTop: c.sp(3) }}>{card.sub}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    default:
      return null;
  }
}

function Agenda({ s, c }: { s: WPSection; c: RenderCtx }) {
  const line = c.lightText ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)';
  return (
    <div style={{ position: 'relative', paddingLeft: c.px(18) }}>
      <div style={{ position: 'absolute', left: c.px(3.5), top: c.px(8), bottom: c.px(8), width: 1, background: line }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: c.sp(14) }}>
        {s.schedule!.map((it) => (
          <div key={it.id} style={{ position: 'relative', opacity: it.past ? 0.4 : 1 }}>
            <span
              style={{
                position: 'absolute',
                left: `calc(-${c.px(18)} + ${c.px(0.5)})`,
                top: c.px(6),
                width: c.px(7),
                height: c.px(7),
                borderRadius: '50%',
                background: it.past ? 'transparent' : c.accent,
                border: `1.5px solid ${it.past ? c.fg : c.accent}`,
              }}
            />
            <div style={{ fontSize: c.px(12), fontWeight: 600, opacity: 0.55, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em', fontFamily: FONT_STACK.sans }}>
              {it.time}
              {it.end ? ` – ${it.end}` : ''}
            </div>
            <div style={{ fontSize: c.px(18), fontWeight: 560, letterSpacing: '-0.01em', marginTop: c.sp(1), lineHeight: 1.3 }}>{it.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Divider({ c }: { c: RenderCtx }) {
  return <div style={{ height: 1, background: c.lightText ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)', margin: `${c.sp(2)} 0 ${c.sp(20)}` }} />;
}

/* ================== layouts ================== */

function StackLayout({ m, c }: { m: WallpaperModel; c: RenderCtx }) {
  const agenda = c.style.layout === 'agenda';
  const goalIdx = c.screen.sections.filter((s) => s.visible).findIndex((s) => s.kind === 'goal');
  const cardGap = c.style.cardStyle === 'none' ? 24 : 12;
  return (
    <div>
      <Header m={m} c={c} />
      {goalIdx === 0 && <Goals m={m} c={c} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: c.sp(cardGap) }}>
        {m.sections.map((s, i) => (
          <div key={s.kind}>
            {c.style.divider && i > 0 && <Divider c={c} />}
            <Card c={c}>
              <Label c={c} icon={s.icon}>
                {s.title}
              </Label>
              <SectionBody s={s} c={c} agenda={agenda} />
              <More c={c} n={s.more} />
            </Card>
          </div>
        ))}
      </div>
      {goalIdx > 0 && <div style={{ marginTop: c.sp(24) }}><Goals m={m} c={c} /></div>}
      <Progress m={m} c={c} />
    </div>
  );
}

function ChecklistLayout({ m, c }: { m: WallpaperModel; c: RenderCtx }) {
  const tasks = m.sections.filter((s) => s.kind === 'priority' || s.kind === 'tasks');
  const items = tasks.flatMap((s) => s.items);
  const more = tasks.reduce((n, s) => n + s.more, 0);
  const others = m.sections.filter((s) => s.kind !== 'priority' && s.kind !== 'tasks');
  const line = c.lightText ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)';
  return (
    <div>
      <Header m={m} c={c} compact />
      <Goals m={m} c={c} />
      <div>
        {items.map((it, i) => (
          <div key={it.id} style={{ padding: `${c.sp(13)} 0`, borderTop: i === 0 ? `1px solid ${line}` : undefined, borderBottom: `1px solid ${line}` }}>
            <TaskLine c={c} item={it} size={19} big />
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ fontSize: c.px(15), opacity: 0.45, padding: `${c.sp(14)} 0` }}>No tasks. Enjoy the day.</div>
        )}
        <More c={c} n={more} />
      </div>
      {others.map((s) => (
        <div key={s.kind} style={{ marginTop: c.sp(24) }}>
          <Label c={c} icon={s.icon}>{s.title}</Label>
          <SectionBody s={s} c={c} />
        </div>
      ))}
      <Progress m={m} c={c} />
    </div>
  );
}

function HeroLayout({ m, c }: { m: WallpaperModel; c: RenderCtx }) {
  const d = m.dateInfo;
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: c.sp(30) }}>
        {c.screen.showDate && (
          <div style={{ fontSize: c.px(11), fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.5, fontFamily: FONT_STACK.sans }}>
            {d.weekday} · {d.month} {d.day}
          </div>
        )}
      </div>
      {m.goals.length > 0 ? (
        <Goals m={m} c={c} center hero />
      ) : (
        <div style={{ textAlign: 'center', fontSize: c.px(34), fontWeight: 650, letterSpacing: '-0.03em', marginBottom: c.sp(28) }}>Today</div>
      )}
      {m.headline && (
        <div style={{ textAlign: 'center', fontSize: c.px(15), opacity: 0.6, marginTop: c.sp(-18), marginBottom: c.sp(32), fontStyle: 'italic' }}>
          {m.headline}
        </div>
      )}
      <div style={{ width: '86%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: c.sp(22) }}>
        {m.sections.map((s) => (
          <div key={s.kind}>
            <Label c={c} icon={s.icon} center>{s.title}</Label>
            <SectionBody s={s} c={c} />
            <More c={c} n={s.more} />
          </div>
        ))}
      </div>
      <Progress m={m} c={c} center />
    </div>
  );
}

function MinimalLayout({ m, c }: { m: WallpaperModel; c: RenderCtx }) {
  const d = m.dateInfo;
  const lines = m.sections.flatMap((s) => {
    if (s.kind === 'priority' || s.kind === 'tasks') return s.items.map((it) => ({ key: it.id, text: it.text, done: it.done, high: it.high }));
    if (s.kind === 'schedule') return s.schedule!.map((it) => ({ key: it.id, text: `${it.time}  ${it.title}`, done: !!it.past, high: false }));
    if (s.kind === 'habits') return s.habits!.map((h) => ({ key: h.id, text: h.title, done: h.done, high: false }));
    if (s.kind === 'countdown') return s.countdowns!.map((cd) => ({ key: cd.id, text: `${cd.title} — ${cd.days} days`, done: false, high: false }));
    if (s.kind === 'cards') return s.cards!.map((cd) => ({ key: cd.id, text: `${cd.title} ${cd.value}${cd.kind === 'progress' ? ' / ' + (cd.sub ?? '') : ''}`, done: false, high: false }));
    return [];
  });
  const memo = m.sections.find((s) => s.kind === 'memo');
  return (
    <div style={{ textAlign: 'center' }}>
      {c.screen.showDate && (
        <div style={{ fontSize: c.px(11), fontWeight: 500, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.45, marginBottom: c.sp(22), fontFamily: FONT_STACK.sans }}>
          {d.weekdayShort} {d.month} {d.day}
        </div>
      )}
      {m.goals.map((g) => (
        <div key={g.id} style={{ fontSize: c.px(21), fontWeight: 560, letterSpacing: '-0.015em', lineHeight: 1.35, marginBottom: c.sp(8), opacity: g.done ? 0.4 : 1, textDecoration: g.done ? 'line-through' : 'none' }}>
          {g.text}
        </div>
      ))}
      {m.headline && !m.goals.length && (
        <div style={{ fontSize: c.px(19), fontWeight: 500, letterSpacing: '-0.01em', marginBottom: c.sp(8) }}>{m.headline}</div>
      )}
      {lines.length > 0 && (
        <div style={{ marginTop: c.sp(22), display: 'flex', flexDirection: 'column', gap: c.sp(9) }}>
          {lines.map((l) => (
            <div key={l.key} style={{ fontSize: c.px(14.5), fontWeight: 450, opacity: l.done ? 0.35 : 0.8, textDecoration: l.done && c.completedDisplay === 'strike' ? 'line-through' : 'none' }}>
              {l.text}
              {l.high && !l.done && (
                <span style={{ display: 'inline-block', width: c.px(5), height: c.px(5), borderRadius: '50%', background: c.accent, marginLeft: c.px(6), verticalAlign: 'middle' }} />
              )}
            </div>
          ))}
        </div>
      )}
      {memo && (
        <div style={{ marginTop: c.sp(24), fontSize: c.px(13.5), opacity: 0.6, fontStyle: 'italic', lineHeight: 1.5 }}>
          {memo.memoLines!.join('  ·  ')}
        </div>
      )}
    </div>
  );
}

/* ================== mockup chrome (§73) ================== */

function LockChrome({ u, height, fg, date }: { u: number; height: number; fg: string; date: WallpaperModel['dateInfo'] }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: height * 0.075, textAlign: 'center', color: fg, zIndex: 2, pointerEvents: 'none', fontFamily: FONT_STACK.sans }}>
      <div style={{ fontSize: 17 * u, fontWeight: 600, opacity: 0.85 }}>
        {date.weekday}, {date.month} {date.day}
      </div>
      <div style={{ fontSize: 92 * u, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 2 * u, opacity: 0.92 }}>9:41</div>
    </div>
  );
}

function HomeChrome({ u, width, height, lightText }: { u: number; width: number; height: number; lightText: boolean }) {
  const cols = 4;
  const rows = 6;
  const size = 62 * u;
  const gapX = (width - 28 * u * 2 - size * cols) / (cols - 1);
  const top = height * 0.075;
  const rowGap = 30 * u;
  const tone = lightText ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.12)';
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
      {Array.from({ length: rows * cols }).map((_, i) => {
        const r = Math.floor(i / cols);
        const col = i % cols;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 28 * u + col * (size + gapX),
              top: top + r * (size + rowGap),
              width: size,
              height: size,
              borderRadius: size * 0.24,
              background: tone,
              backdropFilter: 'blur(8px)',
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 14 * u,
          right: 14 * u,
          bottom: 14 * u,
          height: 92 * u,
          borderRadius: 34 * u,
          background: lightText ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(20px)',
        }}
      />
    </div>
  );
}
