import { useState, useRef, KeyboardEvent, useEffect } from "react";
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
  debounceMs = 500
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Debounce the internal value
  const debouncedValue = useDebounce(internalValue, debounceMs);
  
  // Update parent when debounced value changes
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange]);
  
  // Update internal value when external value changes (e.g., programmatic reset)
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  const handleClear = () => {
    setInternalValue("");
    onChange("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleClear();
    }
  };

  const showClearButton = internalValue.length > 0 && (isFocused || internalValue.length > 0);

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
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-muted transition-colors",
            "opacity-0 group-hover:opacity-100 focus:opacity-100",
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