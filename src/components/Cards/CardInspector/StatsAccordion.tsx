"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import styles from "@/app/page.module.css";

type StatsAccordionProps = {
  label: string;
  previewValues: string[];
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export default function StatsAccordion({
  label,
  previewValues,
  children,
  defaultOpen = true,
}: StatsAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const bodyId = useMemo(() => `stats-accordion-${label.replace(/\s+/g, "-")}`, [label]);

  return (
    <div className={`accordion ${styles.statAccordion}`}>
      <div className={`accordion-item ${styles.statAccordionItem}`}>
        <h2 className={`accordion-header ${styles.statAccordionHeader}`}>
          <button
            type="button"
            className={`accordion-button ${styles.statAccordionButton} ${
              isOpen ? "" : "collapsed"
            }`}
            aria-expanded={isOpen}
            aria-controls={bodyId}
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <label className={styles.statAccordionLabel}>{label}</label>
            <span
              className={`${styles.statAccordionPreview} ${
                isOpen ? styles.statAccordionPreviewHidden : ""
              }`}
            >
              <span className={styles.statAccordionPreviewContainer}>
                <span className={styles.statAccordionPreviewTable}>
                  {previewValues.map((value, index) => (
                    <span key={`${value}-${index}`} className={styles.statAccordionPreviewCell}>
                      {value}
                    </span>
                  ))}
                </span>
              </span>
            </span>
            <span className={styles.statAccordionChevron}>
              {isOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            </span>
          </button>
        </h2>
        <div id={bodyId} className={`accordion-collapse collapse ${isOpen ? "show" : ""}`}>
          <div className={styles.statAccordionBody}>{children}</div>
        </div>
      </div>
    </div>
  );
}
