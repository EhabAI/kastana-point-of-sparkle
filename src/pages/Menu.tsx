import React, { useEffect } from "react";
import { useParams } from "react-router-dom";

export default function Menu() {
  const { restaurantId, tableCode } = useParams<{
    restaurantId: string;
    tableCode: string;
  }>();

  // Minimal SEO (placeholder page)
  useEffect(() => {
    document.title = "Menu | Placeholder";

    const description = "Placeholder restaurant menu page.";
    let meta = document.querySelector('meta[name="description"]') as
      | HTMLMetaElement
      | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;

    let canonical = document.querySelector('link[rel="canonical"]') as
      | HTMLLinkElement
      | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto w-full max-w-3xl p-4">
          <h1 className="text-lg font-semibold">Menu</h1>
          <p className="text-sm text-muted-foreground">
            Restaurant: {restaurantId} • Table: {tableCode}
          </p>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl p-4">
        <div
          className="min-h-[240px] rounded-md border"
          aria-label="Menu content placeholder"
        />
      </section>
    </main>
  );
}
