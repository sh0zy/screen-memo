import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 入力値をローカルに保持し、入力が止まってから delay ms 後に commit (§5)。
 * blur / unmount 時は即時 flush。外部値が変わったら (未編集なら) 同期する。
 */
export function useAutosave<T>(external: T, commit: (v: T) => void, delay = 400) {
  const [value, setValue] = useState<T>(external);
  const [status, setStatus] = useState<'idle' | 'pending' | 'saved'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dirty = useRef(false);
  const latest = useRef(value);
  const commitRef = useRef(commit);
  commitRef.current = commit;

  // 外部更新 (Undo 等) を反映
  useEffect(() => {
    if (!dirty.current) {
      setValue(external);
      latest.current = external;
    }
  }, [external]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    if (dirty.current) {
      dirty.current = false;
      commitRef.current(latest.current);
      setStatus('saved');
    }
  }, []);

  const onChange = useCallback(
    (v: T) => {
      setValue(v);
      latest.current = v;
      dirty.current = true;
      setStatus('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  useEffect(() => () => flush(), [flush]);

  return { value, onChange, flush, status };
}
