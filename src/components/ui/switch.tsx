"use client"

import * as React from "react"

interface SwitchProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

const Switch = React.forwardRef<HTMLLabelElement, SwitchProps>(
  ({ id, checked = false, onCheckedChange, disabled = false, className }, ref) => {
    const handleClick = () => {
      if (!disabled) {
        onCheckedChange?.(!checked)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        handleClick()
      }
    }

    return (
      <label
        ref={ref}
        id={id}
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={className}
        style={{
          position: "relative",
          display: "inline-block",
          width: "52px",
          height: "30px",
          flexShrink: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      >
        {/* Track */}
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: "9999px",
            backgroundColor: checked ? "#10b981" : "#d1d5db",
            transition: "background-color 300ms ease-in-out",
          }}
        />
        {/* Thumb */}
        <span
          style={{
            position: "absolute",
            top: "3px",
            left: "3px",
            width: "24px",
            height: "24px",
            borderRadius: "9999px",
            backgroundColor: "#ffffff",
            boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)",
            transition: "transform 300ms ease-in-out, -webkit-transform 300ms ease-in-out",
            transform: checked ? "translateX(22px)" : "translateX(0px)",
            WebkitTransform: checked ? "translateX(22px)" : "translateX(0px)",
          }}
        />
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
