"use client";

import styles from "@/app/page.module.css";

type InspectorEntityRowProps = {
  left: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  as?: "button" | "div";
  interactive?: boolean;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  onClick?: () => void;
  type?: "button";
};

export default function InspectorEntityRow({
  left,
  title,
  subtitle,
  right,
  as = "div",
  interactive = false,
  className,
  titleClassName,
  subtitleClassName,
  onClick,
  type,
}: InspectorEntityRowProps) {
  const rowClassName = `${styles.inspectorEntityRow} ${
    interactive ? styles.inspectorEntityRowInteractive : ""
  } ${className ?? ""}`.trim();

  const content = (
    <>
      <span className={styles.inspectorEntityRowLeft}>{left}</span>
      <span className={styles.inspectorEntityRowInfo}>
        <span className={`${styles.inspectorEntityRowTitle} ${titleClassName ?? ""}`.trim()}>
          {title}
        </span>
        {subtitle ? (
          <span
            className={`${styles.inspectorEntityRowSubtitle} ${subtitleClassName ?? ""}`.trim()}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
      {right ? <span className={styles.inspectorEntityRowRight}>{right}</span> : null}
    </>
  );

  if (as === "button") {
    return (
      <button type={type ?? "button"} className={rowClassName} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={rowClassName}>{content}</div>;
}
