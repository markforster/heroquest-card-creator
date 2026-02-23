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
            { code: "**bold text**", output: <strong>bold text</strong> },
            { code: "*italic text*", output: <em>italic text</em> },
            {
              code: "***bold italic text***",
              output: (
                <strong>
                  <em>bold italic text</em>
                </strong>
              ),
            },
          ]}
        />
        <CheatCard
          title={t("formattingHelp.alignment")}
          rows={[
            {
              code: ":::al This line is left aligned.:::",
              output: (
                <div className={styles.formattingHelpAlignLeft}>This line is left aligned.</div>
              ),
            },
            {
              code: ":::ac This line is centered.:::",
              output: (
                <div className={styles.formattingHelpAlignCenter}>This line is centered.</div>
              ),
            },
            {
              code: ":::ar This line is right aligned.:::",
              output: (
                <div className={styles.formattingHelpAlignRight}>This line is right aligned.</div>
              ),
            },
          ]}
        />
        <CheatCard
          title={t("formattingHelp.leaderLines")}
          rows={[
            {
              code: "[Label[.]Value]",
              output: (
                <span className={styles.formattingHelpMono}>
                  Label................................Value
                </span>
              ),
            },
            {
              code: "[Cost[.] 50 gold]",
              output: (
                <span className={styles.formattingHelpMono}>
                  Cost..............................50 gold
                </span>
              ),
            },
            {
              code: "[Range[.] 3 squares][Weight[-] Light][Difficulty[ ] Hard]",
              output: (
                <span className={styles.formattingHelpMono}>
                  Range..........................3 squares
                  {"\n"}Weight------------------------Light
                  {"\n"}Difficulty Hard
                </span>
              ),
            },
          ]}
        />
        <CheatCard
          title={t("formattingHelp.leaderGroups")}
          rows={[
            {
              code: ["[[", "[hello[.]World]", "]]"],
              output: (
                <span className={styles.formattingHelpMono}>
                  hello.............................World
                </span>
              ),
            },
            {
              code: [
                "[[",
                "[{pivot:50%, wrap:value}],",
                "[Cost[.] 50 gold],",
                "[Range[.] 3 squares],",
                "]]",
              ],
              output: (
                <span className={styles.formattingHelpMono}>
                  Cost.............................50 gold
                  {"\n"}Range...........................3 squares
                </span>
              ),
            },
            {
              code: ["[[[{wrap:none}],", "[hello[.]World],", "[hello[.]Universe]]]"],
              output: (
                <span className={styles.formattingHelpMono}>
                  hello............................World
                  {"\n"}hello..........................Universe
                </span>
              ),
            },
          ]}
        />
        <CheatCard
          title={t("formattingHelp.inlineDice")}
          rows={[
            {
              code: "&cd-s-w;",
            output: (
              <div className={styles.formattingHelpDiceRow}>
                <DiceIcon
                  alt="Skull"
                  src={combatSkullWhiteUrl}
                  bg="#ffffff"
                  faceColor="#111111"
                  border="#111111"
                />
              </div>
            ),
            },
            {
              code: "&cd-h-r;",
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt="Hero shield"
                    src={combatShieldWhiteUrl}
                    bg="#b21d1d"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: "&cd-m-bk;",
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt="Monster shield"
                    src={combatMonsterWhiteUrl}
                    bg="#111111"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: "&cd-ad-r;",
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt="Attack die"
                    src={combatAdUrl}
                    bg="#b21d1d"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: "&cd-dd-bk;",
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt="Defense die"
                    src={combatDdUrl}
                    bg="#111111"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: "&cd-md-g;",
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt="Movement die"
                    src={combatMdUrl}
                    bg="#1f7a3b"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: "&d6-6-w;",
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt="D6"
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
              code: "&d6-1-w;",
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt="D6"
                    src={d6Pips1Url}
                    bg="#ffffff"
                    faceColor="#111111"
                    border="#111111"
                  />
                </div>
              ),
            },
            {
              code: "&d6-6-r;",
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt="D6"
                    src={d6Pips6Url}
                    bg="#b21d1d"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: "&d6-3-bk;",
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt="D6"
                    src={d6Pips3Url}
                    bg="#111111"
                    faceColor="#ffffff"
                    border="#ffffff"
                  />
                </div>
              ),
            },
            {
              code: "&d6-6-y-bk;",
              output: (
                <div className={styles.formattingHelpDiceRow}>
                  <DiceIcon
                    alt="D6"
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
              code: "&cd-w-s;",
            output: (
              <div className={styles.formattingHelpDiceRow}>
                <DiceIcon
                  alt="Skull"
                  src={combatSkullWhiteUrl}
                  bg="#ffffff"
                  faceColor="#111111"
                  border="#111111"
                />
              </div>
            ),
          },
          {
            code: "&cd-s-w;",
            output: (
              <div className={styles.formattingHelpDiceRow}>
                <DiceIcon
                  alt="Skull"
                  src={combatSkullWhiteUrl}
                  bg="#ffffff"
                  faceColor="#111111"
                  border="#111111"
                />
              </div>
            ),
            },
            {
              code: "&cd-y-s-bk;",
            output: (
              <div className={styles.formattingHelpDiceRow}>
                <DiceIcon
                  alt="Skull"
                  src={combatSkullWhiteUrl}
                  bg="#d6a600"
                  faceColor="#111111"
                  border="#111111"
                />
              </div>
            ),
          },
          {
            code: "&cd-#1c4aa8-s-#ffd200;",
            output: (
              <div className={styles.formattingHelpDiceRow}>
                <DiceIcon
                  alt="Skull"
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
              code: "&cd-<face>-<color>-<faceColor?>;",
              output: "Combat die token",
            },
            {
              code: "&d6-<number>-<color>-<faceColor?>;",
              output: "D6 token",
            },
            {
              code: "Faces: s, h, m, cd, ad, dd, md",
              output: "Valid faces",
            },
            {
              code: "Colors: w, bk, r, bl, g, y, o, p, gy",
              output: "Valid colors",
            },
            {
              code: "Hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA",
              output: "Hex colors",
            },
          ]}
        />
      </div>
    </div>
  );
}
