import React, { useState, useEffect } from 'react';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  step?: string | number;
  min?: number;
  max?: number;
  placeholder?: string;
  fallbackValue?: number;
  allowNegative?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  className = '',
  step = 'any',
  min,
  max,
  placeholder,
  fallbackValue = 0,
  allowNegative = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [text, setText] = useState<string>(
    value !== undefined && value !== null && !isNaN(value) ? String(value) : ''
  );

  // Synchronize internal text state with external value when not actively focused
  useEffect(() => {
    if (isFocused) {
      return;
    }

    const parsed = parseFloat(text.replace(',', '.'));
    if (isNaN(parsed) || parsed !== value) {
      setText(value !== undefined && value !== null && !isNaN(value) ? String(value) : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(',', '.');

    // Prevent negative sign if not allowed
    if (!allowNegative && raw.includes('-')) {
      raw = raw.replace(/-/g, '');
    }

    // Strip leading zeros before a non-zero digit (e.g. "05" -> "5", "-05" -> "-5")
    if (/^0[0-9]/.test(raw)) {
      raw = raw.replace(/^0+(?=\d)/, '');
    } else if (/^-0[0-9]/.test(raw)) {
      raw = '-' + raw.slice(1).replace(/^0+(?=\d)/, '');
    }

    setText(raw);

    // If empty or just a minus sign, do not force a zero during typing
    if (raw === '' || raw === '-') {
      onChange(fallbackValue);
      return;
    }

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    let raw = text.trim().replace(',', '.');

    if (raw === '' || raw === '-' || isNaN(parseFloat(raw))) {
      const def = fallbackValue !== undefined ? fallbackValue : (min !== undefined ? min : 0);
      setText(String(def));
      onChange(def);
    } else {
      let num = parseFloat(raw);
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      setText(String(num));
      onChange(num);
    }

    props.onBlur?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Automatically select input text for single-click replacement
    e.target.select();
    props.onFocus?.(e);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
};
export default NumericInput;
