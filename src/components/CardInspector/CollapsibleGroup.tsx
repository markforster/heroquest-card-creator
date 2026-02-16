"use client";

import { useMemo, useState } from "react";

type CollapsibleGroupProps = {
  id: string;
  headerContent: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  headerButtonClassName?: string;
  bodyClassName?: string;
};

export default function CollapsibleGroup({
  id,
  headerContent,
  children,
  defaultOpen = false,
  className,
  headerClassName,
  headerButtonClassName,
  bodyClassName,
}: CollapsibleGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const bodyId = useMemo(() => `${id}-body`, [id]);

  return (
    <div className={`accordion ${className ?? ""}`}>
      <div className="accordion-item">
        <div className={headerClassName}>
          <button
            type="button"
            className={headerButtonClassName}
            aria-expanded={isOpen}
            aria-controls={bodyId}
            onClick={() => {
              setIsOpen((prev) => !prev);
            }}
          >
            {headerContent}
          </button>
        </div>
        <div id={bodyId} className={`accordion-collapse collapse ${isOpen ? "show" : ""}`}>
          <div className={bodyClassName}>{children}</div>
        </div>
      </div>
    </div>
  );
}
