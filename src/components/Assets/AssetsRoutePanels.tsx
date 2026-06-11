"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AssetRecord } from "@/api/assets";
import styles from "@/app/page.module.css";
import AssetsInspector from "@/components/Assets/AssetsInspector";
import AssetsMainPanel from "@/components/Assets/AssetsMainPanel";
import { useAssetKindQueue } from "@/components/Providers/AssetKindBackfillProvider";

export default function AssetsRoutePanels() {
  const [selectedAssets, setSelectedAssets] = useState<AssetRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const { setIsActive } = useAssetKindQueue();
  const selectedAssetIdsSignature = useMemo(
    () => selectedAssets.map((asset) => asset.id).join("|"),
    [selectedAssets],
  );
  const previousSelectedAssetIdsSignatureRef = useRef("");

  useEffect(() => {
    setIsActive(true);
    return () => {
      setIsActive(false);
    };
  }, [setIsActive]);

  useEffect(() => {
    if (selectedAssets.length === 0) {
      previousSelectedAssetIdsSignatureRef.current = "";
      setCurrentIndex(0);
      return;
    }
    if (previousSelectedAssetIdsSignatureRef.current === selectedAssetIdsSignature) {
      return;
    }
    previousSelectedAssetIdsSignatureRef.current = selectedAssetIdsSignature;
    setCurrentIndex(0);
  }, [selectedAssetIdsSignature, selectedAssets.length]);

  useEffect(() => {
    if (currentIndex >= selectedAssets.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, selectedAssets.length]);

  return (
    <>
      <section className={`${styles.leftPanel} d-flex align-items-stretch gap-3 p-3`}>
        <AssetsMainPanel onSelectionChange={setSelectedAssets} refreshKey={refreshKey} />
      </section>
      {selectedAssets.length > 0 ? (
        <AssetsInspector
          assets={selectedAssets}
          currentIndex={currentIndex}
          onSelectIndex={setCurrentIndex}
          onReplaceComplete={() => setRefreshKey((prev) => prev + 1)}
          onOptimizeComplete={() => setRefreshKey((prev) => prev + 1)}
          refreshKey={refreshKey}
        />
      ) : null}
    </>
  );
}
