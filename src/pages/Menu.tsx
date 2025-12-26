import { useParams } from "react-router-dom";

export default function Menu() {
  const { restaurantId, tableCode } = useParams();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4">
        <h1 className="text-lg font-semibold text-foreground">Menu</h1>
        <p className="text-sm text-muted-foreground">
          Restaurant: {restaurantId} | Table: {tableCode}
        </p>
      </header>

      {/* Empty content container */}
      <main className="container mx-auto px-4 py-6">
        {/* Placeholder - to be completed manually */}
      </main>
    </div>
  );
}
