"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  value?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

function RadioGroup({
  className,
  value,
  onValueChange,
  required,
  disabled,
  children,
  ...props
}: RadioGroupProps) {
  return (
    <div
      data-slot="radio-group"
      className={cn("space-y-2", className)}
      role="radiogroup"
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            name: (child as React.ReactElement<any>).props.name || "radio-group",
            value: (child as React.ReactElement<any>).props.value,
            checked: value === (child as React.ReactElement<any>).props.value,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              if (onValueChange && !disabled) {
                onValueChange(e.target.value);
              }
            },
            required,
            disabled,
          });
        }
        return child;
      })}
    </div>
  )
}

interface RadioGroupItemProps extends React.ComponentProps<"input"> {
  value: string;
}

function RadioGroupItem({
  className,
  checked,
  ...props
}: RadioGroupItemProps) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <input
        type="radio"
        data-slot="radio-group-item"
        checked={checked}
        className={cn(
          "peer h-4 w-4 shrink-0 cursor-pointer border-2 rounded-full transition-all",
          "border-input dark:bg-input/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "checked:border-primary",
          "appearance-none relative",
          className
        )}
        {...props}
      />
      {checked && (
        <span
          className="absolute h-1.5 w-1.5 rounded-full bg-primary pointer-events-none transition-opacity"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

export { RadioGroup, RadioGroupItem }

