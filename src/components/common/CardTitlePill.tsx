import styles from "@/app/page.module.css";
import OverflowMarqueeText from "@/components/common/OverflowMarqueeText";

type CardTitlePillProps = {
  text: string;
  active?: boolean;
  className?: string;
};

export default function CardTitlePill({ text, active, className }: CardTitlePillProps) {
  return (
    <div className={[styles.cardTitlePill, className].filter(Boolean).join(" ")} title={text}>
      <OverflowMarqueeText active={active} text={text} className={styles.cardTitlePillText} />
    </div>
  );
}
