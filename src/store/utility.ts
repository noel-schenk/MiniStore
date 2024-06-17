const debounces = new Map<string, () => void>();
export const debounce = (cb: () => void, delay: number, key: string) => {
  const getDebounce = () => {
    const timeoutId = setTimeout(() => {
      cb();
    }, delay);
    return () => clearTimeout(timeoutId);
  };

  debounces.get(key)?.();
  debounces.set(key, getDebounce());
};
