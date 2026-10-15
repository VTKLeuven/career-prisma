"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Column,
  type Row,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Columns3,
  Inbox,
  ListFilter,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CellValue, ColumnConfig, SelectOption } from "@/components/admin/types";
import { cn } from "@/lib/utils";

/**
 * Rows rendered at once. Admin lists run to thousands of rows (students,
 * company reps), and rendering them all is what makes those pages crawl.
 * Sorting, searching and filtering still cover every row -- only the
 * rendering is paged.
 */
const DEFAULT_PAGE_SIZE = 50;

/** Facet key for a row with no value in a filtered column. */
const EMPTY_FACET = "";

/** Placeholders the list renderers use for "nothing here"; not real values. */
const EMPTY_TEXT = new Set(["", "—", "–", "-"]);

// One collator for every text comparison: case- and accent-insensitive, and
// "Booth 9" before "Booth 10".
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

type Scalar = string | number | boolean;

/** A cell value made comparable; undefined means "no value". */
function normalize(value: CellValue): Scalar | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.getTime();
  if (typeof value === "string") {
    const trimmed = value.trim();
    return EMPTY_TEXT.has(trimmed) ? undefined : trimmed;
  }
  if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
  return value;
}

function isCellValue(value: unknown): value is CellValue {
  return (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  );
}

/** The column's value for a row, per the rules on `ColumnConfig`. */
function rawValue<T>(col: ColumnConfig<T>, row: T): CellValue | CellValue[] {
  if (col.value) return col.value(row);
  const own = (row as Record<string, unknown>)[col.key];
  if (own !== undefined && isCellValue(own)) return own;
  if (col.render) {
    const rendered = col.render(row);
    if (typeof rendered === "string" || typeof rendered === "number") return rendered;
  }
  return undefined;
}

/** Every value a row holds in a column, for filtering. */
function facetValues<T>(col: ColumnConfig<T>, row: T): string[] {
  const raw = rawValue(col, row);
  const values = (Array.isArray(raw) ? raw : [raw])
    .map(normalize)
    .filter((v): v is Scalar => v !== undefined)
    .map(String);
  return values.length ? Array.from(new Set(values)) : [EMPTY_FACET];
}

/** One comparable value per row, for sorting. */
function sortValue<T>(col: ColumnConfig<T>, row: T): Scalar | undefined {
  const raw = rawValue(col, row);
  if (!Array.isArray(raw)) return normalize(raw);
  const parts = raw.map(normalize).filter((v): v is Scalar => v !== undefined);
  return parts.length ? parts.join(", ") : undefined;
}

/** How a column without `render` shows its value. */
function displayValue(raw: CellValue | CellValue[]): string {
  const values = (Array.isArray(raw) ? raw : [raw]).filter((v) => normalize(v) !== undefined);
  if (!values.length) return "—";
  return values
    .map((v) =>
      v instanceof Date
        ? v.toLocaleDateString("en-GB")
        : typeof v === "boolean"
          ? (v ? "Yes" : "No")
          : String(v)
    )
    .join(", ");
}

function compareScalars(a: Scalar, b: Scalar): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return collator.compare(String(a), String(b));
}

function facetLabel(value: string, options?: SelectOption[]): string {
  const known = options?.find((o) => o.value === value);
  if (known) return known.label;
  if (value === EMPTY_FACET) return "Not set";
  if (value === "true") return "Yes";
  if (value === "false") return "No";
  return value;
}

/** Whether a column has anything to sort or search on. */
function hasValues<T>(col: ColumnConfig<T>, rows: T[]): boolean {
  if (col.value) return true;
  return rows.some((row) => sortValue(col, row) !== undefined);
}

type ColumnMeta = { searchable: boolean };

export type DataTableSort = { key: string; desc?: boolean };

export type DataTableProps<T> = {
  rows: T[];
  columns: ColumnConfig<T>[];
  getRowId: (row: T) => string;
  /** What one row is, for the count and the empty state ("student"). */
  noun: string;
  /** Plural of `noun` when adding an "s" is wrong ("companies"). */
  nounPlural?: string;
  /**
   * The search box. By default it searches every column with a value; pass
   * row keys to also search fields that have no column (a username).
   * `false` hides it, for short tables where it would only be clutter.
   */
  search?: boolean | { keys?: string[]; placeholder?: string };
  /** The order rows start in; without it they keep the order they came in. */
  defaultSort?: DataTableSort;
  pageSize?: number;
  /** Opens a row. Rows become clickable and keyboard-focusable. */
  onRowClick?: (row: T) => void;
  /** Highlights a row, typically the one open in a side panel. */
  isRowSelected?: (row: T) => boolean;
  rowClassName?: (row: T) => string | undefined;
  /** Trailing actions per row (delete, a ⋯ menu); revealed on row hover. */
  rowActions?: (row: T) => React.ReactNode;
  /** Keep row actions visible instead of revealing them on hover. */
  rowActionsAlwaysVisible?: boolean;
  /** Buttons at the right of the toolbar -- the page's "New …" goes here. */
  toolbar?: React.ReactNode;
  /** Shown in the empty state when there are no rows at all (a "New …" button). */
  emptyAction?: React.ReactNode;
  /** Replaces the "No … yet" line of the empty state. */
  emptyMessage?: string;
  /** Shows placeholder rows while the first load is in flight. */
  loading?: boolean;
  /**
   * Classes for the scroll area. The default caps the height to the viewport
   * so the header stays sticky and the toolbar stays in view; a table that
   * shares its page with other content can pass a smaller cap, or "" for none.
   * Put a cap behind `roomy:` -- on a phone it would nest a second vertical
   * scroll inside the page's, so there the table grows with its rows.
   */
  containerClassName?: string;
  className?: string;
};

/**
 * The admin's one table: sticky header, click-to-sort columns, search, column
 * filters, paging and row click-through. Everything happens on the rows it is
 * given, in the browser; the page decides which rows those are.
 *
 * Describe columns with `ColumnConfig` (see its docs for how a column's value
 * is found). `ResourceManager` builds on this; reach for it directly for any
 * list that is not a plain create/edit/delete resource.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  noun,
  nounPlural,
  search = true,
  defaultSort,
  pageSize = DEFAULT_PAGE_SIZE,
  onRowClick,
  isRowSelected,
  rowClassName,
  rowActions,
  rowActionsAlwaysVisible = false,
  toolbar,
  emptyAction,
  emptyMessage,
  loading = false,
  containerClassName = "roomy:max-h-[calc(100svh-15rem)]",
  className,
}: DataTableProps<T>) {
  const plural = nounPlural ?? `${noun}s`;
  const searchConfig = typeof search === "object" ? search : search ? {} : null;
  const searchKeys = searchConfig?.keys;

  const [sorting, setSorting] = React.useState<SortingState>(
    defaultSort ? [{ id: defaultSort.key, desc: Boolean(defaultSort.desc) }] : []
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() =>
    Object.fromEntries(columns.filter((c) => c.defaultHidden).map((c) => [c.key, false]))
  );
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize });

  // Callers build their columns inline, so the array is new on every render
  // (every keystroke in the search box). The table is rebuilt only when the
  // columns' shape changes; their functions are read fresh through the ref.
  const columnsRef = React.useRef(columns);
  columnsRef.current = columns;
  const configByKey = new Map(columns.map((c) => [c.key, c]));
  const shape = columns
    .map((c) => [c.key, c.sortable, c.searchable, Boolean(c.filter), Boolean(c.value)].join(":"))
    .join("|");
  const latest = (key: string) =>
    columnsRef.current.find((c) => c.key === key) as ColumnConfig<T>;

  // Which columns can sort is decided from the data, so a column whose cells
  // are all markup does not offer a sort that would do nothing.
  const valued = React.useMemo(
    () => new Set(columnsRef.current.filter((c) => hasValues(c, rows)).map((c) => c.key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `shape` stands in for the columns
    [shape, rows]
  );

  const columnDefs = React.useMemo<ColumnDef<T, Scalar | undefined>[]>(
    () =>
      columnsRef.current.map((col) => {
        const sortable = col.sortable ?? valued.has(col.key);
        const meta: ColumnMeta = { searchable: col.searchable ?? sortable };
        return {
          id: col.key,
          accessorFn: (row) => sortValue(latest(col.key), row),
          enableSorting: sortable,
          enableColumnFilter: Boolean(col.filter),
          enableHiding: true,
          sortUndefined: "last",
          sortingFn: (a, b, id) =>
            compareScalars(a.getValue<Scalar>(id), b.getValue<Scalar>(id)),
          getUniqueValues: (row) => facetValues(latest(col.key), row),
          filterFn: (row, _id, selected: string[]) =>
            !selected?.length ||
            facetValues(latest(col.key), row.original).some((v) => selected.includes(v)),
          meta,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `shape` stands in for the columns
    [shape, valued]
  );

  // tanstack runs the global filter once per searchable column; extra row keys
  // are checked alongside the first of them, so only once per row.
  const firstSearchable = columnDefs.find((def) => (def.meta as ColumnMeta).searchable)?.id;

  const table = useReactTable<T>({
    data: rows,
    columns: columnDefs,
    getRowId: (row) => getRowId(row),
    state: { sorting, columnFilters, globalFilter, columnVisibility, pagination },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onGlobalFilterChange: (updater) => {
      setGlobalFilter(updater);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    // Pages reset when the user sorts, searches or filters (above), not when
    // the rows change: an edit refreshes the rows, and jumping back to page 1
    // after saving a row on page 4 loses your place.
    autoResetPageIndex: false,
    // Header clicks cycle ascending -> descending -> unsorted.
    enableSortingRemoval: true,
    sortDescFirst: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    getColumnCanGlobalFilter: (column) =>
      Boolean((column.columnDef.meta as ColumnMeta | undefined)?.searchable),
    globalFilterFn: (row, columnId, filterValue: string) => {
      const q = filterValue.trim().toLowerCase();
      if (!q) return true;
      const value = row.getValue<Scalar | undefined>(columnId);
      if (value !== undefined && String(value).toLowerCase().includes(q)) return true;
      if (searchKeys?.length && columnId === firstSearchable) {
        const record = row.original as Record<string, unknown>;
        return searchKeys.some((key) =>
          String(record[key] ?? "").toLowerCase().includes(q)
        );
      }
      return false;
    },
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(1, table.getPageCount());
  const { pageIndex } = pagination;

  // Rows can shrink under the current page (a delete, a refresh); stay on the
  // last page that still exists rather than showing an empty one.
  React.useEffect(() => {
    if (pageIndex > pageCount - 1) setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }));
  }, [pageIndex, pageCount]);

  // "/" jumps to the search box, as in Dopl and most list-heavy tools. With two
  // tables on a page the first one claims the key.
  const searchRef = React.useRef<HTMLInputElement>(null);
  const hasSearch = Boolean(searchConfig);
  React.useEffect(() => {
    if (!hasSearch) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (!searchRef.current) return;
      e.preventDefault();
      searchRef.current.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasSearch]);

  const filterColumns = table.getAllLeafColumns().filter((c) => c.getCanFilter());
  const hideableColumns = columns.some((c) => c.defaultHidden)
    ? table.getAllLeafColumns()
    : [];
  const isFiltered = Boolean(globalFilter.trim()) || columnFilters.length > 0;
  const resetFilters = () => {
    table.setGlobalFilter("");
    table.resetColumnFilters();
  };

  const visibleColumnCount = table.getVisibleLeafColumns().length + (rowActions ? 1 : 0);
  const pageRows = table.getRowModel().rows;
  const firstRow = pageIndex * pagination.pageSize;

  // A click on a row opens it, unless it landed on something interactive in
  // its own right, or bubbled up through React from a portaled menu or dialog
  // (those are outside the row in the DOM).
  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick) return;
    if (!e.currentTarget.contains(e.target as Node)) return;
    if ((e.target as HTMLElement).closest("a, button, input, label, select, [role=checkbox], [data-no-row-click]")) return;
    onRowClick(row);
  };

  const showToolbar = Boolean(searchConfig || filterColumns.length || hideableColumns.length || toolbar);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showToolbar ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {searchConfig ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder={searchConfig.placeholder ?? `Search ${plural}…`}
                value={globalFilter}
                onChange={(e) => table.setGlobalFilter(e.target.value)}
                className="h-9 pl-9 pr-9"
              />
              {globalFilter ? (
                <button
                  type="button"
                  onClick={() => table.setGlobalFilter("")}
                  className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground sm:block">
                  /
                </kbd>
              )}
            </div>
          ) : null}

          {filterColumns.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {filterColumns.map((column) => (
                <FacetFilter key={column.id} column={column} config={configByKey.get(column.id)!} />
              ))}
            </div>
          ) : null}

          {isFiltered ? (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="self-start text-muted-foreground sm:self-auto">
              Reset <X className="size-3.5" />
            </Button>
          ) : null}

          <span className="text-sm text-muted-foreground tabular">
            {isFiltered
              ? `${filteredCount} of ${rows.length}`
              : `${rows.length} ${rows.length === 1 ? noun : plural}`}
          </span>

          {hideableColumns.length || toolbar ? (
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {hideableColumns.length ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Columns3 /> <span className="hidden sm:inline">Columns</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                    {hideableColumns.map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {configByKey.get(column.id)?.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {toolbar}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-background">
        <Table containerClassName={cn("min-h-0", containerClassName)}>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_var(--border)] [&_tr]:border-b-0">
            <TableRow>
              {table.getVisibleLeafColumns().map((column) => {
                const config = configByKey.get(column.id)!;
                const sorted = column.getIsSorted();
                return (
                  <TableHead
                    key={column.id}
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    className={cn("whitespace-nowrap first:pl-4", config.align === "right" && "text-right")}
                  >
                    {column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={column.getToggleSortingHandler()}
                        className={cn(
                          "group/sort -mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 transition-colors hover:bg-surface-hover hover:text-foreground",
                          sorted && "text-foreground",
                          config.align === "right" && "flex-row-reverse"
                        )}
                        title={
                          sorted === "asc"
                            ? "Sorted ascending; click for descending"
                            : sorted === "desc"
                              ? "Sorted descending; click to clear"
                              : `Sort by ${config.label}`
                        }
                      >
                        {config.label}
                        {sorted === "asc" ? (
                          <ArrowUp className="size-3.5" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="size-3.5" />
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-0 transition-opacity group-hover/sort:opacity-60" />
                        )}
                      </button>
                    ) : (
                      config.label
                    )}
                  </TableHead>
                );
              })}
              {rowActions ? (
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell colSpan={visibleColumnCount} className="pl-4">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                      <div className="ml-auto h-3 w-24 animate-pulse rounded bg-muted" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : pageRows.length ? (
              pageRows.map((row) => (
                <DataTableRow
                  key={row.id}
                  row={row}
                  configByKey={configByKey}
                  onClick={onRowClick ? (e) => handleRowClick(e, row.original) : undefined}
                  onOpen={onRowClick ? () => onRowClick(row.original) : undefined}
                  selected={isRowSelected?.(row.original) ?? false}
                  className={rowClassName?.(row.original)}
                  actions={rowActions?.(row.original)}
                  hasActionsColumn={Boolean(rowActions)}
                  actionsAlwaysVisible={rowActionsAlwaysVisible}
                />
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={visibleColumnCount} className="h-56 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-xl border bg-background text-[#0a6cba] shadow-[0_1px_2px_rgb(16_16_20/0.04)]">
                      {isFiltered ? <Search className="size-4" /> : <Inbox className="size-4" />}
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {isFiltered
                        ? `No ${plural} match these filters`
                        : (emptyMessage ?? `No ${plural} yet`)}
                    </p>
                    {isFiltered ? (
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Clear filters
                      </Button>
                    ) : (
                      emptyAction
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {filteredCount > pagination.pageSize ? (
          <div className="flex flex-col items-center justify-between gap-3 border-t bg-[#fafafa] px-4 py-2 sm:flex-row">
            <p className="text-xs text-muted-foreground tabular">
              {firstRow + 1}–{Math.min(firstRow + pagination.pageSize, filteredCount)} of {filteredCount}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="px-1 text-xs text-muted-foreground whitespace-nowrap tabular">
                {pageIndex + 1} / {pageCount}
              </span>
              <Button variant="ghost" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DataTableRow<T>({
  row,
  configByKey,
  onClick,
  onOpen,
  selected,
  className,
  actions,
  hasActionsColumn,
  actionsAlwaysVisible,
}: {
  row: Row<T>;
  configByKey: Map<string, ColumnConfig<T>>;
  onClick?: (e: React.MouseEvent<HTMLTableRowElement>) => void;
  onOpen?: () => void;
  selected: boolean;
  className?: string;
  actions?: React.ReactNode;
  hasActionsColumn: boolean;
  actionsAlwaysVisible: boolean;
}) {
  const clickable = Boolean(onClick);
  return (
    <TableRow
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onOpen && e.key === "Enter" && e.target === e.currentTarget) onOpen();
      }}
      data-state={selected ? "selected" : undefined}
      className={cn(
        "group/row",
        clickable && "cursor-pointer outline-none focus-visible:bg-surface-hover focus-visible:shadow-[inset_2px_0_0_#1f82d1]",
        className
      )}
    >
      {row.getVisibleCells().map((cell, index) => {
        const config = configByKey.get(cell.column.id)!;
        const content = config.render
          ? config.render(row.original)
          : displayValue(rawValue(config, row.original));
        // Only plain-text cells can carry a tooltip; a rendered cell is a
        // node, not a string.
        const title = typeof content === "string" ? content : undefined;
        return (
          <TableCell
            key={cell.id}
            className={cn(
              "first:pl-4",
              index === 0 && "font-medium text-foreground",
              config.align === "right" && "text-right tabular",
              !config.wrap && "max-w-[22rem]",
              config.wrap && "whitespace-normal",
              config.className
            )}
          >
            <div className={cn(!config.wrap && "truncate")} title={title}>
              {content}
            </div>
          </TableCell>
        );
      })}
      {hasActionsColumn ? (
        <TableCell className="w-12 pr-2 text-right">
          <div
            className={cn(
              "flex items-center justify-end gap-1",
              !actionsAlwaysVisible &&
                "opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-visible/row:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100"
            )}
          >
            {actions}
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}

/** Toolbar dropdown filtering one column to some of its values. */
function FacetFilter<T>({ column, config }: { column: Column<T, unknown>; config: ColumnConfig<T> }) {
  const filter = config.filter;
  const label = (typeof filter === "object" && filter.label) || config.label;
  const declared = typeof filter === "object" ? filter.options : undefined;
  const selected = (column.getFilterValue() as string[] | undefined) ?? [];
  const counts = column.getFacetedUniqueValues();

  // Declared options keep their order (and show even at zero); otherwise the
  // values found in the rows, alphabetically, with "Not set" last.
  const options = React.useMemo(() => {
    const found = Array.from(counts.keys()) as string[];
    if (declared) {
      const extra = found.filter((v) => !declared.some((o) => o.value === v));
      return [...declared.map((o) => o.value), ...extra];
    }
    return found.sort((a, b) =>
      a === EMPTY_FACET ? 1 : b === EMPTY_FACET ? -1 : collator.compare(facetLabel(a), facetLabel(b))
    );
  }, [counts, declared]);

  const toggle = (value: string, on: boolean) => {
    const next = on ? [...selected, value] : selected.filter((v) => v !== value);
    column.setFilterValue(next.length ? next : undefined);
  };

  const summary =
    selected.length === 1 ? facetLabel(selected[0], declared) : selected.length > 1 ? `${selected.length} selected` : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 border-dashed", selected.length && "border-solid border-[#bee1ff] bg-[#f0f8ff] text-[#0a6cba] hover:bg-[#e6f3ff]")}
        >
          <ListFilter className="size-3.5" />
          {label}
          {summary ? (
            <>
              <span className="h-4 w-px bg-current opacity-25" />
              <span className="max-w-[12rem] truncate font-normal">{summary}</span>
            </>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Filter by {label.toLowerCase()}
        </DropdownMenuLabel>
        <div className="max-h-72 overflow-y-auto">
          {options.length ? (
            options.map((value) => (
              <DropdownMenuCheckboxItem
                key={value}
                checked={selected.includes(value)}
                onCheckedChange={(on) => toggle(value, Boolean(on))}
                // Keep the menu open so several values can be ticked in a row.
                onSelect={(e) => e.preventDefault()}
              >
                <span className={cn("truncate", value === EMPTY_FACET && "text-muted-foreground italic")}>
                  {facetLabel(value, declared)}
                </span>
                <span className="ml-auto pl-3 text-xs text-muted-foreground tabular">
                  {counts.get(value) ?? 0}
                </span>
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Nothing to filter.</p>
          )}
        </div>
        {selected.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => column.setFilterValue(undefined)} className="justify-center text-sm">
              Clear filter
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The delete button for `rowActions`: muted until hovered, red on hover. */
export function RowDeleteButton({
  onClick,
  label = "Delete",
  pending = false,
}: {
  onClick: () => void;
  /** Accessible name, e.g. "Delete student". */
  label?: string;
  pending?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:bg-[#fef2f2] hover:text-[#b91c1c]"
      onClick={onClick}
      disabled={pending}
      aria-label={label}
      title={label}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
