import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf7f0",
          borderRadius: 18,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 56,
            height: 56,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(171,46,32,0.14)",
            background: "#fffdfc",
            boxShadow: "0 10px 24px rgba(82,40,27,0.15)",
          }}
        >
          <div
            style={{
              width: 14,
              height: "100%",
              background: "#ab2e20",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            {[0, 1, 2, 3].map((dot) => (
              <div
                key={dot}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 999,
                  background: "#f7d4cf",
                }}
              />
            ))}
          </div>
          <div
            style={{
              flex: 1,
              padding: "11px 9px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ width: 26, height: 3, borderRadius: 999, background: "#ab2e20" }} />
            <div style={{ width: 28, height: 2, borderRadius: 999, background: "#d2b8a0" }} />
            <div style={{ width: 24, height: 2, borderRadius: 999, background: "#d2b8a0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRight: "3px solid #39604f",
                  borderBottom: "3px solid #39604f",
                  transform: "rotate(45deg)",
                  marginLeft: 4,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
