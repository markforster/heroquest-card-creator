"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  HERO_STAT_TARGET_IDS,
  MONSTER_STAT_TARGET_IDS,
  useEditorTargets,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import HeroStatsInspector from "@/components/Cards/CardInspector/HeroStatsInspector";
import MonsterStatsInspector from "@/components/Cards/CardInspector/MonsterStatsInspector";
import type { HeroCardData, MonsterCardData } from "@/types/card-data";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

function FocusRequester({
  targetId,
  label,
}: {
  targetId: string;
  label: string;
}) {
  const { requestFocusTarget } = useEditorTargets();

  return (
    <button type="button" onClick={() => requestFocusTarget(targetId as never)}>
      {label}
    </button>
  );
}

function HeroHarness() {
  const form = useForm<HeroCardData>({
    defaultValues: {
      attackDice: 3,
      defendDice: 2,
      bodyPoints: 8,
      mindPoints: 2,
    } as HeroCardData,
  });

  return (
    <EditorTargetsProvider>
      <FormProvider {...form}>
        <FocusRequester targetId={EDITOR_TARGET_IDS.statsHero} label="hero-group" />
        <FocusRequester targetId={HERO_STAT_TARGET_IDS.attackDice} label="hero-attack" />
        <FocusRequester targetId={HERO_STAT_TARGET_IDS.defendDice} label="hero-defend" />
        <FocusRequester targetId={HERO_STAT_TARGET_IDS.bodyPoints} label="hero-body" />
        <FocusRequester targetId={HERO_STAT_TARGET_IDS.mindPoints} label="hero-mind" />
        <HeroStatsInspector />
      </FormProvider>
    </EditorTargetsProvider>
  );
}

function MonsterHarness() {
  const form = useForm<MonsterCardData>({
    defaultValues: {
      movementSquares: 10,
      attackDice: 5,
      defendDice: 4,
      bodyPoints: 5,
      mindPoints: 3,
    } as MonsterCardData,
  });

  return (
    <EditorTargetsProvider>
      <FormProvider {...form}>
        <FocusRequester targetId={EDITOR_TARGET_IDS.statsMonster} label="monster-group" />
        <FocusRequester
          targetId={MONSTER_STAT_TARGET_IDS.movementSquares}
          label="monster-move"
        />
        <FocusRequester targetId={MONSTER_STAT_TARGET_IDS.attackDice} label="monster-attack" />
        <FocusRequester targetId={MONSTER_STAT_TARGET_IDS.defendDice} label="monster-defend" />
        <FocusRequester targetId={MONSTER_STAT_TARGET_IDS.bodyPoints} label="monster-body" />
        <FocusRequester targetId={MONSTER_STAT_TARGET_IDS.mindPoints} label="monster-mind" />
        <MonsterStatsInspector />
      </FormProvider>
    </EditorTargetsProvider>
  );
}

describe("Stats inspector focus target registration", () => {
  it("focuses the first hero stat for the coarse target and the exact control for each child target", () => {
    const { container } = render(<HeroHarness />);

    fireEvent.click(screen.getByRole("button", { name: "hero-group" }));
    expect(document.activeElement).toBe(
      container.querySelector(`[title="tooltip.valueFor stats.attackDice"]`),
    );

    const heroTargets: Array<[string, string]> = [
      ["hero-attack", "stats.attackDice"],
      ["hero-defend", "stats.defendDice"],
      ["hero-body", "stats.bodyPoints"],
      ["hero-mind", "stats.mindPoints"],
    ];

    heroTargets.forEach(([buttonName, labelKey]) => {
      fireEvent.click(screen.getByRole("button", { name: buttonName }));
      expect(document.activeElement).toBe(
        container.querySelector(`[title="tooltip.valueFor ${labelKey}"]`),
      );
    });
  });

  it("focuses the first monster stat for the coarse target and the exact control for each child target", () => {
    const { container } = render(<MonsterHarness />);

    fireEvent.click(screen.getByRole("button", { name: "monster-group" }));
    expect(document.activeElement).toBe(
      container.querySelector(`[title="tooltip.valueFor stats.movementSquares"]`),
    );

    const monsterTargets: Array<[string, string]> = [
      ["monster-move", "stats.movementSquares"],
      ["monster-attack", "stats.attackDice"],
      ["monster-defend", "stats.defendDice"],
      ["monster-body", "stats.bodyPoints"],
      ["monster-mind", "stats.mindPoints"],
    ];

    monsterTargets.forEach(([buttonName, labelKey]) => {
      fireEvent.click(screen.getByRole("button", { name: buttonName }));
      expect(document.activeElement).toBe(
        container.querySelector(`[title="tooltip.valueFor ${labelKey}"]`),
      );
    });
  });
});
