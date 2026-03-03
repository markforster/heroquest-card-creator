"use client";

export const BASE_CARD_WIDTH = 750;
export const BASE_CARD_HEIGHT = 1050;

export const CARD_WIDTH = 756;
export const CARD_HEIGHT = 1056;

export const CARD_ASPECT = CARD_HEIGHT / CARD_WIDTH;

export const SCALE_X = CARD_WIDTH / BASE_CARD_WIDTH;
export const SCALE_Y = CARD_HEIGHT / BASE_CARD_HEIGHT;
export const SCALE_AVG = (SCALE_X + SCALE_Y) / 2;

export const sx = (value: number): number => value * SCALE_X;
export const sy = (value: number): number => value * SCALE_Y;
export const savg = (value: number): number => value * SCALE_AVG;
