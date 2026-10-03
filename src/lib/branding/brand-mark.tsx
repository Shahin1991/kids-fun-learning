// Satori has no calc(), so sizes are plain numbers.
export function BrandMark({ size, padding = 0 }: { size: number; padding?: number }) {
  const inner = size - padding * 2;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#ff6fa5", padding }}>
      <div style={{ width: inner, height: inner, display: "flex", alignItems: "center", justifyContent: "center", fontSize: inner * 0.7, background: "#fffaf0", borderRadius: inner / 2 }}>
        🌈
      </div>
    </div>
  );
}
