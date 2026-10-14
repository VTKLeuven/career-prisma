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
  | "richtext"
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
  /** Optional heading used to group related fields in larger forms. */
  section?: string;
  /** Layout classes for this field's wrapper (for example `md:col-span-2`). */
  className?: string;
  /** Static choices for `select` / `multiselect`. */
  options?: SelectOption[];
  /** Async choices for `select` / `multiselect` (relations). Loaded once on mount. */
  loadOptions?: () => Promise<SelectOption[]>;
  /** Value used when creating a new row. Defaults per type ("" / false / []). */
  defaultValue?: unknown;
  /** Extracts the current value from a row when editing. Defaults to `row[name]`. */
  getEditValue?: (row: T) => unknown;
  /**
   * Shows this field only for some form states, e.g. a field that applies to
   * one role. Hidden fields are submitted as their empty value, so a field that
   * stops applying is cleared instead of silently keeping a stale value.
   */
  visible?: (values: Record<string, unknown>) => boolean;
  /** Optional domain-specific editor while keeping the shared dialog and save flow. */
  renderInput?: (props: {
    value: unknown;
    options: SelectOption[];
    onChange: (value: unknown) => void;
  }) => React.ReactNode;
};

/** A plain value a column sorts, searches and filters on. */
export type CellValue = string | number | boolean | Date | null | undefined;

/**
 * One column of a `DataTable` (and so of a `ResourceManager`).
 *
 * A column's *value* drives sorting, searching and filtering; `render` only
 * decides what the cell shows. The value is, in order: `value(row)` if given,
 * else `row[key]` if that is a plain value, else whatever `render` returns when
 * it returns a string or number. A column with none of those (a `render` that
 * returns markup over a computed field) cannot sort -- give it a `value`.
 */
export type ColumnConfig<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  /**
   * What the column sorts, searches and filters on. Return a list for a column
   * holding several values (a company's masters): the filter then matches a row
   * holding any selected value, and sorting uses the values joined.
   */
  value?: (row: T) => CellValue | CellValue[];
  /** Clicking the header sorts by this column. Default true when it has a value. */
  sortable?: boolean;
  /** Whether the search box looks at this column. Default: the same as `sortable`. */
  searchable?: boolean;
  /**
   * Adds a filter for this column to the toolbar: a dropdown of the column's
   * distinct values with how many rows hold each. `true` labels the values as
   * they are (booleans as Yes/No); pass options to set labels and their order.
   */
  filter?: boolean | { label?: string; options?: SelectOption[] };
  /** Starts hidden; the table then shows a Columns menu to bring it back. */
  defaultHidden?: boolean;
  /** Right-aligns the column, for numbers and amounts. */
  align?: "left" | "right";
  /** Extra classes for this column's cells (e.g. `font-mono text-xs`). */
  className?: string;
  /**
   * Let this column wrap onto several lines instead of being truncated to a
   * single line with an ellipsis. Use it for columns whose content is the point
   * (a description, a list of badges); the default keeps rows one line tall so
   * the table stays inside the viewport.
   */
  wrap?: boolean;
};

export type ResourceConfig<T> = {
  /** Singular noun shown in dialog titles / buttons, e.g. "Master". */
  singular: string;
  getId: (row: T) => string;
  /** Human label for a row, used in the delete confirmation. */
  getLabel?: (row: T) => string;
  columns: ColumnConfig<T>[];
  fields: FieldConfig<T>[];
  /**
   * Extra row keys the search box looks at, for fields without a column (a
   * username). Every column with a value is searched already.
   */
  searchKeys?: string[];
  /** The order rows start in, e.g. `{ key: "name" }`. */
  defaultSort?: { key: string; desc?: boolean };
  /** Hides the "Add" button when creation isn't supported (e.g. students self-register). */
  hideCreate?: boolean;
  /** Shows the resource without create, edit, or delete controls. */
  readOnly?: boolean;
  /**
   * Optional layout overrides for resources with larger edit forms.
   * `dialogClassName` styles the edit panel that slides in from the right
   * (typically a wider `sm:max-w-*`); the name predates the panel.
   */
  dialogClassName?: string;
  fieldsClassName?: string;
  actions: {
    create?: (data: Record<string, unknown>) => Promise<ActionResult>;
    update: (id: string, data: Record<string, unknown>) => Promise<ActionResult>;
    remove: (id: string) => Promise<ActionResult>;
  };
};
