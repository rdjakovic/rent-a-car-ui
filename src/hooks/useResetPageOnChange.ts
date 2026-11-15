import { useEffect, useRef } from "react";

/**
 * Goes back to the first page when the filters change. `filters` is any value that changes when a
 * filter does (e.g. an array of them). It compares with the previous value instead of running on
 * mount, so a saved page isn't lost when you return to the page (and StrictMode's double mount is harmless).
 */
export function useResetPageOnChange(filters: unknown, setPage: (page: number) => void) {
  const signature = JSON.stringify(filters);
  const previous = useRef(signature);
  useEffect(() => {
    if (previous.current !== signature) {
      previous.current = signature;
      setPage(0);
    }
  }, [signature, setPage]);
}
