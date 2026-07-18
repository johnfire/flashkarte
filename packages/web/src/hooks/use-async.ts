import { useCallback, useEffect, useRef, useState } from "react";

/** Load an async resource on mount; callers must memoize loadValue. */
export function useAsync<LoadedValue, Arguments extends unknown[]>(
  loadValue: (...arguments_: Arguments) => Promise<LoadedValue>,
  initialArguments: Arguments,
) {
  const [data, setData] = useState<LoadedValue | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const initialArgumentsRef = useRef(initialArguments);

  const reload = useCallback(
    async (...arguments_: Arguments): Promise<void> => {
      const currentVersion = ++requestVersion.current;
      setData(null);
      setError(null);
      setLoading(true);
      try {
        const loadedValue = await loadValue(...arguments_);
        if (requestVersion.current === currentVersion) setData(loadedValue);
      } catch (loadError) {
        if (requestVersion.current === currentVersion) setError(loadError);
      } finally {
        if (requestVersion.current === currentVersion) setLoading(false);
      }
    },
    [loadValue],
  );

  useEffect(() => {
    void reload(...initialArgumentsRef.current);
    return () => {
      requestVersion.current += 1;
    };
  }, [reload]);

  return { data, error, loading, reload, setData };
}
