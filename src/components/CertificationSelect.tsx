import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { CERTIFICATIONS } from '../certifications';

// ponytail: join multi picks as "; " so API/PDF/DB stay string-shaped
export function parseCertifications(value: string): string[] {
  if (!value.trim()) return [];
  return value.split('; ').map((s) => s.trim()).filter(Boolean);
}

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

  const selected = useMemo(() => parseCertifications(value), [value]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

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

  const toggle = (cert: string) => {
    const next = selectedSet.has(cert)
      ? selected.filter((c) => c !== cert)
      : [...selected, cert];
    onChange(next.join('; '));
    setQuery('');
    inputRef.current?.focus();
  };

  const remove = (cert: string) => {
    onChange(selected.filter((c) => c !== cert).join('; '));
  };

  const openList = () => {
    setOpen(true);
    setQuery('');
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
      if (filtered[highlight]) toggle(filtered[highlight]);
    } else if (e.key === 'Backspace' && !query && selected.length > 0) {
      remove(selected[selected.length - 1]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
      onBlur();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} readOnly />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((cert) => (
            <span
              key={cert}
              className="inline-flex items-center gap-1 max-w-full rounded-md border border-seal/30 bg-seal-tint px-2 py-1 text-xs text-ink"
            >
              <span className="truncate">{cert}</span>
              <button
                type="button"
                aria-label={`Remove ${cert}`}
                className="shrink-0 p-0.5 rounded text-ink/40 hover:text-ink"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => remove(cert)}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

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
          value={query}
          placeholder={selected.length ? 'Add another certification…' : 'Search certification…'}
          className={`${className} pl-9 pr-16`}
          onFocus={openList}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
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
          {selected.length > 0 && (
            <button
              type="button"
              aria-label="Clear certifications"
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
          aria-multiselectable="true"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-300 bg-white shadow-lg py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-ink-soft">No matching certification</li>
          ) : (
            filtered.map((cert, i) => {
              const isSelected = selectedSet.has(cert);
              return (
                <li
                  key={`${cert}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`px-3.5 py-2 text-sm cursor-pointer flex items-center gap-2 ${
                    i === highlight ? 'bg-seal-tint text-ink' : 'text-ink hover:bg-slate-50'
                  } ${isSelected ? 'font-semibold' : ''}`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggle(cert);
                  }}
                >
                  <span
                    className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                      isSelected ? 'bg-seal border-seal text-white' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                  <span className="min-w-0">{cert}</span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
