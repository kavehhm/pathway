import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PortalMultiselectProps = {
  options: string[];
  selectedValues: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  allowCustom?: boolean;
  maxSelected?: number;
  variant?: "default" | "plain";
};

const norm = (v: string) => v.trim().toLowerCase();

export default function PortalMultiselect({
  options,
  selectedValues,
  onChange,
  placeholder,
  allowCustom = false,
  maxSelected,
  variant = "default",
}: PortalMultiselectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(selectedValues.map(norm)), [selectedValues]);

  const filteredOptions = useMemo(() => {
    const q = norm(searchQuery);
    return options.filter((option) => {
      if (selectedSet.has(norm(option))) return false;
      if (!q) return true;
      return option.toLowerCase().includes(q);
    });
  }, [options, searchQuery, selectedSet]);

  const canSelectMore =
    typeof maxSelected === "number" ? selectedValues.length < maxSelected : true;

  const customCandidate = useMemo(() => {
    if (!allowCustom) return null;
    const q = searchQuery.trim();
    if (!q) return null;
    const qNorm = norm(q);
    const existsInSelected = selectedSet.has(qNorm);
    const existsInOptions = options.some((o) => norm(o) === qNorm);
    if (existsInSelected || existsInOptions) return null;
    return q;
  }, [allowCustom, options, searchQuery, selectedSet]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const addValue = (value: string) => {
    const cleaned = value.trim();
    if (!cleaned) return;

    const nextNorm = norm(cleaned);
    const alreadySelected = selectedValues.some((v) => norm(v) === nextNorm);
    if (alreadySelected) {
      setSearchQuery("");
      return;
    }

    const next = maxSelected === 1 ? [cleaned] : [...selectedValues, cleaned];
    onChange(next);
    setSearchQuery("");
  };

  const removeValue = (value: string) => {
    const next = selectedValues.filter((v) => norm(v) !== norm(value));
    onChange(next);
  };

  const dropdownContent = isOpen && anchorRef.current && (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: anchorRef.current.getBoundingClientRect().bottom + window.scrollY + 4,
        left: anchorRef.current.getBoundingClientRect().left + window.scrollX,
        width: anchorRef.current.getBoundingClientRect().width,
        zIndex: 99999,
      }}
      className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      {customCandidate && canSelectMore && (
        <div
          onClick={() => addValue(customCandidate)}
          className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
        >
          Add &ldquo;{customCandidate}&rdquo;
        </div>
      )}

      {filteredOptions.length > 0 ? (
        filteredOptions.map((option) => (
          <div
            key={option}
            onClick={() => {
              if (!canSelectMore) return;
              addValue(option);
            }}
            className={`cursor-pointer px-4 py-2.5 text-sm text-slate-700 transition hover:bg-violet-50 ${
              canSelectMore ? "" : "opacity-50 pointer-events-none"
            }`}
          >
            {option}
          </div>
        ))
      ) : (
        <div className="px-4 py-2.5 text-sm text-slate-400">No options found</div>
      )}
    </div>
  );

  return (
    <div ref={anchorRef} className="relative">
      <div
        className={
          variant === "plain"
            ? "min-h-[44px] w-full rounded-md border border-gray-300 bg-white"
            : "min-h-[38px] rounded-2xl bg-white"
        }
      >
        <div className="flex flex-wrap gap-1.5 p-1">
          {selectedValues.map((value) => (
            <span key={value}>
              {variant === "plain" ? (
                <span className="inline-flex items-center gap-2 px-2 py-1 text-sm text-slate-700">
                  <span className="truncate max-w-[220px]">{value}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeValue(value);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label={`Remove ${value}`}
                  >
                    ×
                  </button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white">
                  {value}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeValue(value);
                    }}
                    className="hover:text-violet-200"
                    aria-label={`Remove ${value}`}
                  >
                    ×
                  </button>
                </span>
              )}
            </span>
          ))}

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedValues.length === 0 ? placeholder : ""}
            className={
              variant === "plain"
                ? "min-w-[160px] flex-1 border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                : "min-w-[120px] flex-1 border-0 bg-transparent px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            }
            disabled={!canSelectMore && maxSelected === 1}
          />

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-2 text-slate-400 hover:text-slate-600"
            aria-label="Toggle options"
          >
            ▼
          </button>
        </div>
      </div>
      {typeof window !== "undefined" && createPortal(dropdownContent, document.body)}
    </div>
  );
}


