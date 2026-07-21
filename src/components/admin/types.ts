import type * as React from "react";

/** Uniform result returned by every admin write action. */
export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

export type SelectOption = { value: string; label: string };

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "time"
  | "date"
  | "boolean"
  | "select"
  | "image"
  | "file"
  | "multiselect";

/**
 * One editable field in the add/edit dialog. The `name` is both the form key and
 * the property written back to the server action payload, so it must match what
 * the repo expects (e.g. `masterIds` for a junction multiselect).
 */
export type FieldConfig<T = Record<string, unknown>> = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  /** Static choices for `select` / `multiselect`. */
  options?: SelectOption[];
  /** Async choices for `select` / `multiselect` (relations). Loaded once on mount. */
  loadOptions?: () => Promise<SelectOption[]>;
  /** Value used when creating a new row. Defaults per type ("" / false / []). */
  defaultValue?: unknown;
  /** Extracts the current value from a row when editing. Defaults to `row[name]`. */
  getEditValue?: (row: T) => unknown;
  /** Optional domain-specific editor while keeping the shared dialog and save flow. */
  renderInput?: (props: {
    value: unknown;
    options: SelectOption[];
    onChange: (value: unknown) => void;
  }) => React.ReactNode;
};

export type ColumnConfig<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
};

export type ResourceConfig<T> = {
  /** Singular noun shown in dialog titles / buttons, e.g. "Master". */
  singular: string;
  getId: (row: T) => string;
  /** Human label for a row, used in the delete confirmation. */
  getLabel?: (row: T) => string;
  columns: ColumnConfig<T>[];
  fields: FieldConfig<T>[];
  /** Row property keys the filter box searches. */
  searchKeys?: string[];
  /** Hides the "Add" button when creation isn't supported (e.g. students self-register). */
  hideCreate?: boolean;
  actions: {
    create?: (data: Record<string, unknown>) => Promise<ActionResult>;
    update: (id: string, data: Record<string, unknown>) => Promise<ActionResult>;
    remove: (id: string) => Promise<ActionResult>;
  };
};
