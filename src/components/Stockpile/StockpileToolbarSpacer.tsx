"use client";

import styles from "@/app/page.module.css";

type StockpileToolbarSpacerProps = {
  grow?: boolean;
};

export default function StockpileToolbarSpacer({
  grow = false,
}: StockpileToolbarSpacerProps) {
  return (
    <div
      aria-hidden="true"
      className={
        grow
          ? `${styles.stockpileToolbarSpacer} ${styles.stockpileToolbarSpacerGrow}`
          : `${styles.stockpileToolbarSpacer} ${styles.stockpileToolbarSpacerFixed}`
      }
    />
  );
}
