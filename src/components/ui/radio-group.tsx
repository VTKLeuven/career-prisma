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
  // Recursively find and clone RadioGroupItem components
  const cloneChildren = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) {
        return child;
      }

      const childProps = child.props as any;
      const childType = child.type as any;

      // Check if this is a RadioGroupItem by checking for the value prop and component name
      const isRadioGroupItem = 
        childType?.displayName === "RadioGroupItem" ||
        (childProps?.value !== undefined && typeof childProps.value === 'string');

      // If this is a RadioGroupItem, clone it with the checked state
      if (isRadioGroupItem) {
        return React.cloneElement(child as React.ReactElement<any>, {
          name: childProps.name || "radio-group",
          value: childProps.value,
          checked: value === childProps.value,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            if (onValueChange && !disabled) {
              onValueChange(e.target.value);
            }
          },
          required,
          disabled,
        });
      }

      // If this element has children, recursively process them
      if (childProps?.children) {
        return React.cloneElement(child as React.ReactElement<any>, {
          children: cloneChildren(childProps.children),
        });
      }

      return child;
    });
  };

  return (
    <div
      data-slot="radio-group"
      className={cn("space-y-2", className)}
      role="radiogroup"
      {...props}
    >
      {cloneChildren(children)}
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
          checked && "border-primary",
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

// Add displayName for easier identification
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem }

