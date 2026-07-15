import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { CERTIFICATIONS } from '../certifications';

type Props = {
  name: string;
  value: string;
  className: string;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export function CertificationSelect({ name, value, className, onChange, onBlur }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  // Show full selected label when closed; filter text only while open.
  const display = open ? query : value;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CERTIFICATIONS as unknown as string[];
    return CERTIFICATIONS.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
        onBlur();
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onBlur]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  const pick = (cert: string) => {
    onChange(cert);
    setOpen(false);
    setQuery('');
    onBlur();
  };

  const openList = () => {
    setOpen(true);
    setQuery(value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) pick(filtered[highlight]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
      onBlur();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      {/* Hidden input so form name/value still participates in native focus order if needed */}
      <input type="hidden" name={name} value={value} readOnly />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${name}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          value={display}
          placeholder="Search certification…"
          className={`${className} pl-9 pr-16`}
          onFocus={openList}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
            // Clear selection while typing a new search.
            if (value) onChange('');
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // Defer so option mousedown can fire first.
            window.setTimeout(() => {
              if (!rootRef.current?.contains(document.activeElement)) {
                setOpen(false);
                setQuery('');
                onBlur();
              }
            }, 0);
          }}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              aria-label="Clear certification"
              className="p-1 rounded text-ink/40 hover:text-ink"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange('');
                setQuery('');
                setOpen(true);
                inputRef.current?.focus();
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="Toggle certification list"
            className="p-1 rounded text-ink/40 hover:text-ink"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (open) {
                setOpen(false);
                setQuery('');
                onBlur();
              } else {
                openList();
                inputRef.current?.focus();
              }
            }}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <ul
          id={`${name}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-300 bg-white shadow-lg py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-ink-soft">No matching certification</li>
          ) : (
            filtered.map((cert, i) => (
              <li
                key={`${cert}-${i}`}
                role="option"
                aria-selected={cert === value}
                className={`px-3.5 py-2 text-sm cursor-pointer ${
                  i === highlight ? 'bg-seal-tint text-ink' : 'text-ink hover:bg-slate-50'
                } ${cert === value ? 'font-semibold' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(cert);
                }}
              >
                {cert}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
