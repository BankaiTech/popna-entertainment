// Select dropdown rendered using portal to prevent clipping
// Global select dropdown and mobile UI fully fixed
import React from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';

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

  function collect(nodes: React.ReactNode) {
    React.Children.toArray(nodes).forEach((child) => {
      if (Array.isArray(child)) {
        collect(child);
      } else if (React.isValidElement(child)) {
        if (child.type === 'option') {
          const p = child.props as { value?: string; disabled?: boolean; children?: React.ReactNode };
          options.push({
            value: String(p.value ?? ''),
            label: p.children ?? p.value ?? '',
            disabled: p.disabled,
          });
        } else if (child.type === React.Fragment) {
          // Recurse into Fragment children (e.g. <>...</>)
          collect((child.props as { children?: React.ReactNode }).children);
        }
      }
    });
  }

  collect(children);
  return options;
}

function SelectInner(
  { className, children, value, onChange, disabled, id, name, placeholder, ...props }: SelectProps & { placeholder?: string },
  ref: React.ForwardedRef<HTMLSelectElement>
) {
  const options = React.useMemo(() => getOptions(children), [children]);
  const selected = options.find((o) => String(o.value) === String(value));
  const display = selected?.label ?? (value != null && value !== '' ? String(value) : '');

  const triggerClass = cn(
    'flex h-9 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm leading-normal',
    'text-foreground transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary',
    'hover:border-primary/30',
    disabled && 'cursor-not-allowed opacity-50',
    className
  );

  return (
    <DropdownMenu side="bottom" align="start" disabled={disabled}>
      <DropdownMenuTrigger id={id} className={triggerClass}>
        <span className={cn('truncate flex-1 text-left', !display && 'text-muted-foreground')}>
          {display || placeholder || '\u00A0'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 ml-2 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((opt) => {
          const isSelected = String(opt.value) === String(value);
          return (
            <DropdownMenuItem
              key={opt.value}
              disabled={opt.disabled}
              onSelect={() => {
                const e = { target: { value: opt.value, name: name ?? '' } } as React.ChangeEvent<HTMLSelectElement>;
                onChange?.(e);
              }}
              className={cn(
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90 active:bg-primary/80'
              )}
            >
              <span className="flex-1">{opt.label}</span>
              {isSelected && <Check className="h-4 w-4 shrink-0 ml-2" aria-hidden />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
      {/* Hidden native select for form submission and ref */}
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

type SelectComponent = React.ForwardRefExoticComponent<
  SelectProps & React.RefAttributes<HTMLSelectElement>
>;
const Select = React.forwardRef(SelectInner) as SelectComponent;
Select.displayName = 'Select';

export default Select;
