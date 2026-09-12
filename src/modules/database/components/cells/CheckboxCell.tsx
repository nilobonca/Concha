import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxCellProps {
  value: boolean | null | undefined;
  onUpdate: (newValue: boolean) => void;
  disabled?: boolean;
}

export const CheckboxCell: React.FC<CheckboxCellProps> = ({
  value,
  onUpdate,
  disabled = false,
}) => {
  const isChecked = Boolean(value);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onUpdate(!isChecked);
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full px-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        onClick={handleToggle}
        disabled={disabled}
        className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer select-none ${
          isChecked
            ? 'bg-[#1831D7] dark:bg-[#7F95FF] text-white dark:text-[#17192A] shadow-xs'
            : 'border border-stone-300 dark:border-white/20 hover:border-[#52B1FF] bg-transparent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
      </button>
    </div>
  );
};
