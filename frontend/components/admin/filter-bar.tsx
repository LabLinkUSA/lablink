import styles from "./filter-bar.module.css";

export type FilterBarSelect = {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange(value: string): void;
};

export function FilterBar({
  search,
  selects = [],
}: {
  search: { value: string; onChange(value: string): void; placeholder: string };
  selects?: FilterBarSelect[];
}) {
  return (
    <div className={styles.bar} data-filter-bar="">
      <input
        type="search"
        className={styles.search}
        aria-label={search.placeholder}
        placeholder={search.placeholder}
        value={search.value}
        onChange={(event) => search.onChange(event.target.value)}
      />
      {selects.map((select) => (
        <select
          key={select.name}
          name={select.name}
          aria-label={select.label}
          className={styles.select}
          value={select.value}
          onChange={(event) => select.onChange(event.target.value)}
        >
          {select.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
