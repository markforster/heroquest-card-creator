(async () => {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open("hqcc");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const tx = db.transaction("assets", "readwrite");
  const store = tx.objectStore("assets");

  const records = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  records.forEach((record) => {
    delete record.assetKind;
    delete record.assetKindStatus;
    delete record.assetKindSource;
    delete record.assetKindConfidence;
    delete record.assetKindUpdatedAt;
    store.put(record);
  });

  tx.oncomplete = () => {
    window.dispatchEvent(new CustomEvent("hqcc-assets-updated"));
    console.log("Cleared asset kind fields.");
  };
})();
