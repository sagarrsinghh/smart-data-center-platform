import { useState, useRef, useEffect } from "react";

interface MultiSelectProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

export default function MultiSelect({
  label,
  options,
  selectedValues,
  onChange,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return `All ${label}s`;
    }
    if (selectedValues.length === options.length) {
      return `All ${label}s`;
    }
    if (selectedValues.length <= 2) {
      return selectedValues.join(", ");
    }
    return `${selectedValues.length} Selected`;
  };


  return (
    <div className="relative flex flex-col w-full text-left" ref={dropdownRef}>
      <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{label}</span>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 flex items-center justify-between rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none transition hover:bg-white/[0.02]"
      >
        <span className="truncate pr-2">
          {getDisplayText()}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path d="M5 7l5 5 5-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute top-[calc(100%+4px)] left-0 z-50 w-full min-w-[200px] rounded-xl border border-white/10 bg-[#0b1329] shadow-2xl backdrop-blur-xl p-3 flex flex-col gap-2"
          style={{ background: "rgba(11, 19, 41, 0.95)" }}
        >
          {/* Search box for larger lists */}
          {options.length > 5 && (
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            />
          )}

          {/* Select All */}
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-xs text-white text-left transition"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded border border-white/20 bg-white/[0.02]">
              {(selectedValues.length === options.length || selectedValues.length === 0) && (
                <div className="h-2 w-2 rounded-sm bg-cyan-400" />
              )}
            </div>
            <span className="font-medium text-gray-300">
              (Select All)
            </span>
          </button>

          <hr className="border-white/5 my-1" />

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <span className="text-[11px] text-gray-500 p-2 italic">No matches found</span>
            ) : (
              filteredOptions.map((option) => {
                const isChecked = selectedValues.includes(option) || selectedValues.length === 0;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleToggleOption(option)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-xs text-white text-left transition"
                  >
                    <div className="flex h-4 w-4 items-center justify-center rounded border border-white/20 bg-white/[0.02]">
                      {isChecked && selectedValues.length > 0 && (
                        <div className="h-2 w-2 rounded-sm bg-cyan-400" />
                      )}
                    </div>
                    <span className="truncate text-gray-300">{option}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
