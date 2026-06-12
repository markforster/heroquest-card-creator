"use client";

import { useMemo } from "react";
import {
  Navigate,
  RouterProvider,
  createHashRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import AppLayout from "@/components/App/AppLayout";
import AppProviders from "@/components/App/AppProviders";
import AppStartup from "@/components/App/AppStartup";
import AssetsPage from "@/components/App/pages/AssetsPage";
import CardPage from "@/components/App/pages/CardPage";
import CardsPage from "@/components/App/pages/CardsPage";
import DeckPage from "@/components/App/pages/DeckPage";
import DecksPage from "@/components/App/pages/DecksPage";
import DatabaseVersionGate from "@/components/DatabaseVersionGate";

function createAppRouter() {
  return createHashRouter(
    createRoutesFromElements(
      <>
        <Route path="/" element={<Navigate to="/cards" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/cards" element={<CardsPage />} />
          <Route path="/cards/new" element={<CardPage />} />
          <Route path="/cards/:cardId" element={<CardPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/decks/:deckId" element={<DeckPage />} />
          <Route path="/decks/:deckId/set/:setId" element={<DeckPage />} />
          <Route path="/decks/:deckId/set/:setId/entry/:entryId" element={<DeckPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/cards" replace />} />
      </>,
    ),
  );
}

export default function IndexPage() {
  const router = useMemo(() => {
    if (typeof document === "undefined") {
      return null;
    }

    return createAppRouter();
  }, []);

  return (
    <DatabaseVersionGate>
      <AppProviders>
        <AppStartup />
        {router ? <RouterProvider router={router} /> : null}
      </AppProviders>
    </DatabaseVersionGate>
  );
}
