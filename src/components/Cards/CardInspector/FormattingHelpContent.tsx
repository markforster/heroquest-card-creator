"use client";

import { useId } from "react";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import combatSkullWhiteUrl from "@/assets/dice/combat_skull_white.svg?url";
import combatShieldWhiteUrl from "@/assets/dice/combat_shield_white.svg?url";
import combatMonsterWhiteUrl from "@/assets/dice/combat_monster_white.svg?url";
import combatAdUrl from "@/assets/dice/combat_ad.svg?url";
import combatDdUrl from "@/assets/dice/combat_dd.svg?url";
import combatMdUrl from "@/assets/dice/combat_md.svg?url";
import d6Pips1Url from "@/assets/dice/d6_pips_1.svg?url";
import d6Pips3Url from "@/assets/dice/d6_pips_3.svg?url";
import d6Pips6Url from "@/assets/dice/d6_pips_6.svg?url";

type CheatRow = {
  code: string | string[];
  output: React.ReactNode;
};

type CheatCardProps = {
  title: string;
  rows: CheatRow[];
};

type DiceIconProps = {
  alt: string;
  src: string;
  bg: string;
  faceColor: string;
  border?: string;
};

function DiceIcon({ alt, src, bg, faceColor, border }: DiceIconProps) {
  const rawId = useId();
  const maskId = `dice-mask-${rawId.replace(/[:]/g, "")}`;
  return (
    <span
      className={styles.formattingHelpDiceChip}
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <svg
        className={styles.formattingHelpDiceImage}
        viewBox="0 0 48 48"
        aria-label={alt}
        role="img"
      >
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="10"
          ry="10"
          fill={bg}
          stroke={border ?? "#ffffff"}
          strokeWidth="2"
        />
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x="10"
          y="10"
          width="28"
          height="28"
        >
          <image href={src} x="10" y="10" width="28" height="28" />
        </mask>
        <rect x="10" y="10" width="28" height="28" fill={faceColor} mask={`url(#${maskId})`} />
      </svg>
    </span>
  );
}

function renderCode(code: string | string[]) {
  if (Array.isArray(code)) {
    return (
      <pre className={styles.formattingHelpCodeBlock}>
        <code>{code.join("\n")}</code>
      </pre>
    );
  }
  return <code className={styles.formattingHelpInlineCode}>{code}</code>;
}

function CheatCard({ title, rows }: CheatCardProps) {
  return (
    <section className={styles.formattingHelpCard}>
      <h3 className={styles.formattingHelpTitle}>{title}</h3>
      <div className={styles.formattingHelpRows}>
        {rows.map((row, index) => (
          <div key={`${title}-${index}`} className={styles.formattingHelpRow}>
            <div className={styles.formattingHelpCell}>{renderCode(row.code)}</div>
            <div className={styles.formattingHelpCell}>
              <div className={styles.formattingHelpOutput}>{row.output}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function FormattingHelpContent() {
  const { t } = useI18n();

  return (
    <div className={styles.formattingHelpBody}>
      <div className={styles.formattingHelpGrid}>
        <CheatCard
          title={t("formattingHelp.markdown")}
          rows={[
            {
              code: t("formattingHelp.markdown.boldCode"),
              output: <strong>{t("formattingHelp.markdown.boldOutput")}</strong>,
            },
            {
              code: t("formattingHelp.markdown.italicCode"),
              output: <em>{t("formattingHelp.markdown.italicOutput")}</em>,
            },
            {
              code: t("formattingHelp.markdown.boldItalicCode"),
              output: (
                <strong>
                  <em>{t("formattingHelp.markdown.boldItalicOutput")}</em>
                </strong>
              ),
            },
          ]}
        />
        <CheatCard
          title={t("formattingHelp.alignment")}
          rows={[
            {
              code: t("formattingHelp.alignment.leftCode"),
              output: (
                <div className={styles.formattingHelpAlignLeft}>
                  {t("formattingHelp.alignment.leftOutput")}
                </div>
              ),
            },
            {
              code: t("formattingHelp.alignment.centerCode"),
              output: (
                <div className={styles.formattingHelpAlignCenter}>
                  {t("formattingHelp.alignment.centerOutput")}
                </div>
              ),
            },
            {
              code: t("formattingHelp.alignment.rightCode"),
              output: (
                <div className={styles.formattingHelpAlignRight}>
                  {t("formattingHelp.alignment.rightOutput")}
                </div>
              ),
            },
          ]}
        />
        <CheatCard
          title={t("formattingHelp.leaderLines")}
          rows={[
            {
              code: t("formattingHelp.leaderLines.labelCode"),
              output: (
                <span className={styles.formattingHelpMono}>
                  {t("formattingHelp.leaderLines.labelOutput")}
                </span>
              ),
            },
            {
              code: t("formattingHelp.leaderLines.costCode"),
              output: (
                <span className={styles.formattingHelpMono}>
                  {t("formattingHelp.leaderLines.costOutput")}
                </span>
              ),
            },
            {
              code: t("formattingHelp.leaderLines.multiCode"),
              output: (
                <span className={styles.formattingHelpMono}>
                  {t("formattingHelp.leaderLines.multiOutput")}
                </span>
              ),
            },
          ]}
        />
        <CheatCard
          title={t("formattingHelp.leaderGroups")}
          rows={[
            {
              code: [
                t("formattingHelp.leaderGroups.simpleOpen"),
                t("formattingHelp.leaderGroups.simpleLine"),
                t("formattingHelp.leaderGroups.simpleClose"),
              ],
              output: (
                <span className={styles.formattingHelpMono}>
                  {t("formattingHelp.leaderGroups.simpleOutput")}
                </span>
              ),
            },
            {
              code: [
                t("formattingHelp.leaderGroups.pivotOpen"),
                t("formattingHelp.leaderGroups.pivotSettings"),
                t("formattingHelp.leaderGroups.pivotCost"),
                t("formattingHelp.leaderGroups.pivotRange"),
                t("formattingHelp.leaderGroups.pivotClose"),
              ],
              output: (
                <span className={styles.formattingHelpMono}>
                  {t("formattingHelp.leaderGroups.pivotOutput")}
                </span>
              ),
            },
            {
              code: [
                t("formattingHelp.leaderGroups.wrapOpen"),
                t("formattingHelp.leaderGroups.wrapLine1"),
                t("formattingHelp.leaderGroups.wrapLine2"),
              ],
              output: (
                <span className={styles.formattingHelpMono}>
                  {t("formattingHelp.leaderGroups.wrapOutput")}
                </span>
              ),
            },
          ]}
        />
        <CheatCard
          title={t("formattingHelp.inlineDice")}
          rows={[
            {
              code: t("formattingHelp.inlineDice.skullCode"),
            output: (
              <div className={styles.formattingHelpDiceRow}>
                <DiceIcon
                  alt={t("formattingHelp.dice.skull")}
                  src={combatSkullWhiteUrl}
                  bg="#ffffff"
                  faceColor="#111111"
                  border="#111111"
                />
              </div>
            ),
            },
            {
              code: t("formattingHelp.inlineDice.heroShieldCode"),
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt={t("formattingHelp.dice.heroShield")}
                    src={combatShieldWhiteUrl}
                    bg="#b21d1d"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: t("formattingHelp.inlineDice.monsterShieldCode"),
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt={t("formattingHelp.dice.monsterShield")}
                    src={combatMonsterWhiteUrl}
                    bg="#111111"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: t("formattingHelp.inlineDice.attackDieCode"),
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt={t("formattingHelp.dice.attackDie")}
                    src={combatAdUrl}
                    bg="#b21d1d"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: t("formattingHelp.inlineDice.defenseDieCode"),
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt={t("formattingHelp.dice.defenseDie")}
                    src={combatDdUrl}
                    bg="#111111"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: t("formattingHelp.inlineDice.movementDieCode"),
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt={t("formattingHelp.dice.movementDie")}
                    src={combatMdUrl}
                    bg="#1f7a3b"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: t("formattingHelp.inlineDice.d6Code"),
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt={t("formattingHelp.dice.d6")}
                    src={d6Pips6Url}
                    bg="#ffffff"
                    faceColor="#111111"
                    border="#111111"
                  />
                </div>
              ),
            },
          ]}
        />
        <CheatCard
          title={t("formattingHelp.d6Variants")}
          rows={[
            {
              code: t("formattingHelp.d6Variants.d6_1w_Code"),
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt={t("formattingHelp.dice.d6")}
                    src={d6Pips1Url}
                    bg="#ffffff"
                    faceColor="#111111"
                    border="#111111"
                  />
                </div>
              ),
            },
            {
              code: t("formattingHelp.d6Variants.d6_6r_Code"),
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt={t("formattingHelp.dice.d6")}
                    src={d6Pips6Url}
                    bg="#b21d1d"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: t("formattingHelp.d6Variants.d6_3bk_Code"),
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt={t("formattingHelp.dice.d6")}
                    src={d6Pips3Url}
                    bg="#111111"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: t("formattingHelp.d6Variants.d6_6y_bk_Code"),
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt={t("formattingHelp.dice.d6")}
                    src={d6Pips6Url}
                    bg="#d6a600"
                    faceColor="#111111"
                    border="#111111"
                  />
                </div>
              ),
            },
          ]}
        />
        <CheatCard
          title={t("formattingHelp.diceAdvanced")}
          rows={[
            {
              code: t("formattingHelp.diceAdvanced.whiteSkullCode"),
            output: (
              <div className={styles.formattingHelpDiceRow}>
                <DiceIcon
                  alt={t("formattingHelp.dice.skull")}
                  src={combatSkullWhiteUrl}
                  bg="#ffffff"
                  faceColor="#111111"
                  border="#111111"
                />
              </div>
            ),
          },
          {
            code: t("formattingHelp.diceAdvanced.blackSkullCode"),
            output: (
              <div className={styles.formattingHelpDiceRow}>
                <DiceIcon
                  alt={t("formattingHelp.dice.skull")}
                  src={combatSkullWhiteUrl}
                  bg="#ffffff"
                  faceColor="#111111"
                  border="#111111"
                />
              </div>
            ),
            },
            {
              code: t("formattingHelp.diceAdvanced.yellowSkullCode"),
            output: (
              <div className={styles.formattingHelpDiceRow}>
                <DiceIcon
                  alt={t("formattingHelp.dice.skull")}
                  src={combatSkullWhiteUrl}
                  bg="#d6a600"
                  faceColor="#111111"
                  border="#111111"
                />
              </div>
            ),
          },
          {
            code: t("formattingHelp.diceAdvanced.customSkullCode"),
            output: (
              <div className={styles.formattingHelpDiceRow}>
                <DiceIcon
                  alt={t("formattingHelp.dice.skull")}
                  src={combatSkullWhiteUrl}
                  bg="#1c4aa8"
                  faceColor="#ffd200"
                  border="#ffd200"
                />
              </div>
            ),
          },
          ]}
        />
        <CheatCard
          title={t("formattingHelp.diceStructure")}
          rows={[
            {
              code: t("formattingHelp.diceStructure.combatCode"),
              output: t("formattingHelp.diceStructure.combatOutput"),
            },
            {
              code: t("formattingHelp.diceStructure.d6Code"),
              output: t("formattingHelp.diceStructure.d6Output"),
            },
            {
              code: t("formattingHelp.diceStructure.facesCode"),
              output: t("formattingHelp.diceStructure.facesOutput"),
            },
            {
              code: t("formattingHelp.diceStructure.colorsCode"),
              output: t("formattingHelp.diceStructure.colorsOutput"),
            },
            {
              code: t("formattingHelp.diceStructure.hexCode"),
              output: t("formattingHelp.diceStructure.hexOutput"),
            },
          ]}
        />
      </div>
    </div>
  );
}
