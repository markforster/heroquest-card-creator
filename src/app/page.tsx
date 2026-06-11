"use client";

import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "@/components/App/AppLayout";
import AppProviders from "@/components/App/AppProviders";
import AppStartup from "@/components/App/AppStartup";
import AssetsPage from "@/components/App/pages/AssetsPage";
import CardPage from "@/components/App/pages/CardPage";
import CardsPage from "@/components/App/pages/CardsPage";
import DeckPage from "@/components/App/pages/DeckPage";
import DecksPage from "@/components/App/pages/DecksPage";
import DatabaseVersionGate from "@/components/DatabaseVersionGate";

export default function IndexPage() {
  return (
    <DatabaseVersionGate>
      <AppProviders>
        <AppStartup />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/cards" replace />} />
            <Route element={<AppLayout />}>
              <Route path="/cards" element={<CardsPage />} />
              <Route path="/cards/new" element={<CardPage />} />
              <Route path="/cards/:cardId" element={<CardPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/decks" element={<DecksPage />} />
              <Route path="/decks/:deckId" element={<DeckPage />} />
              <Route path="/decks/:deckId/set/:setId" element={<DeckPage />} />
              <Route
                path="/decks/:deckId/set/:setId/entry/:entryId"
                element={<DeckPage />}
              />
            </Route>
            <Route path="*" element={<Navigate to="/cards" replace />} />
          </Routes>
        </HashRouter>
      </AppProviders>
    </DatabaseVersionGate>
  );
}
