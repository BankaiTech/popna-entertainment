import React from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface OptionItem {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

function getOptions(children: React.ReactNode): OptionItem[] {
  const options: OptionItem[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === 'option') {
      const p = child.props as { value?: string; disabled?: boolean; children?: React.ReactNode };
      options.push({
        value: String(p.value ?? ''),
        label: p.children ?? p.value ?? '',
        disabled: p.disabled,
      });
    }
  });
  return options;
}

function SelectInner(
  { className, children, value, onChange, disabled, id, name, placeholder, ...props }: SelectProps,
  ref: React.ForwardedRef<HTMLSelectElement>
) {
  const options = React.useMemo(() => getOptions(children), [children]);
  const selected = options.find((o) => String(o.value) === String(value));
  const display = selected?.label ?? (value != null && value !== '' ? String(value) : '') ?? placeholder ?? '';

  const triggerClass = cn(
    'flex h-11 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-normal',
    'text-foreground transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary',
    'hover:border-primary/30',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className
  );

  return (
    <DropdownMenu side="bottom" align="end" disabled={disabled}>
      <DropdownMenuTrigger id={id} className={triggerClass}>
        <span className={cn('truncate', !display && 'text-muted-foreground')}>{display || '\u00A0'}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-60 overflow-auto">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            disabled={opt.disabled}
            onSelect={() => {
              const e = { target: { value: opt.value, name: name ?? '' } } as React.ChangeEvent<HTMLSelectElement>;
              onChange?.(e);
            }}
            className={cn(
              opt.value === value &&
                'bg-primary text-primary-foreground hover:bg-primary hover:bg-primary/90 focus:bg-primary focus:bg-primary/90'
            )}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
      <select
        ref={ref}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="sr-only absolute h-0 w-0 opacity-0 pointer-events-none"
        tabIndex={-1}
        aria-hidden
        {...props}
      >
        {children}
      </select>
    </DropdownMenu>
  );
}

type SelectWithRef = React.ForwardRefExoticComponent<
  SelectProps & React.RefAttributes<HTMLSelectElement>
>;
const Select = React.forwardRef(SelectInner) as SelectWithRef;
Select.displayName = 'Select';

export default Select;
