import styles from "@/app/page.module.css";
import CardTextBlock from "@/components/Cards/CardParts/CardTextBlock";
import { useI18n } from "@/i18n/I18nProvider";

export default function FormattingHelpLists() {
  const { t } = useI18n();
  const example = `- **${t("formattingHelp.lists.move")}**\n  - ${t("formattingHelp.lists.door")}\n- <u>${t("formattingHelp.lists.attack")}</u>\n\n3. ${t("formattingHelp.lists.move")}\n1. ${t("formattingHelp.lists.attack")}`;
  return (
    <section className={styles.formattingHelpCard} style={{ gridColumn: "1 / -1" }}>
      <h3 className={styles.formattingHelpTitle}>{t("formattingHelp.lists.title")}</h3>
      <div className={styles.formattingHelpRow}>
        <pre className={styles.formattingHelpCodeBlock}>
          <code>{example}</code>
        </pre>
        <svg
          viewBox="0 0 340 155"
          role="img"
          aria-label={t("formattingHelp.lists.title")}
          style={{ width: "100%", background: "#f4ebd6" }}
        >
          <CardTextBlock
            text={example}
            bounds={{ x: 12, y: 6, width: 316, height: 145 }}
            fontSize={18}
            enableLists
          />
        </svg>
      </div>
      <p>{t("formattingHelp.lists.rules")}</p>
      <p>{t("formattingHelp.lists.compatibility")}</p>
    </section>
  );
}
