import { useState, useRef, type KeyboardEvent, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  debounceMs?: number;
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  className,
  disabled,
  debounceMs = 400
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const isExternalUpdate = useRef(false);
  const isClearing = useRef(false);
  
  // Debounce the internal value
  const debouncedValue = useDebounce(internalValue, debounceMs);
  
  // Update parent when debounced value changes (only if it's a user input, not external update or clearing)
  useEffect(() => {
    if (!isExternalUpdate.current && !isClearing.current && debouncedValue !== value) {
      onChange(debouncedValue);
    }
    isExternalUpdate.current = false;
    isClearing.current = false;
  }, [debouncedValue, onChange, value]);
  
  // Update internal value when external value changes (e.g., programmatic reset)
  useEffect(() => {
    if (value !== internalValue) {
      isExternalUpdate.current = true;
      setInternalValue(value);
    }
  }, [value]);

  const handleClear = () => {
    isClearing.current = true;
    setInternalValue("");
    onChange("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleClear();
    }
  };

  const showClearButton = internalValue.length > 0;

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        className={cn("pr-8", className)}
        disabled={disabled}
      />
      {showClearButton && (
        <button
          type="button"
          onClick={handleClear}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-muted transition-colors",
            isFocused ? "opacity-100" : "opacity-0 hover:opacity-100"
          )}
          tabIndex={-1}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </div>
  );
}