import type { ReactNode } from "react";

import styles from "./data-table.module.css";

export const tableStyles = {
  row: styles.row,
  rowClickable: styles.rowClickable,
  rowMuted: styles.rowMuted,
  cellRight: styles.cellRight,
  thumb: styles.thumb,
  thumbEmpty: styles.thumbEmpty,
  titleCell: styles.titleCell,
  subtitle: styles.subtitle,
};

export function DataTable({
  head,
  footer,
  empty,
  isEmpty = false,
  minWidth = 720,
  children,
}: {
  head: ReactNode[];
  footer?: ReactNode;
  empty?: ReactNode;
  isEmpty?: boolean;
  minWidth?: number;
  children?: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.scroll}>
        <table className={styles.table} style={{ minWidth }}>
          <thead>
            <tr>
              {head.map((cell, index) => (
                <th key={index} scope="col" className={index === head.length - 1 ? styles.cellRight : undefined}>
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={head.length} className={styles.emptyCell}>
                  {empty}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
}
