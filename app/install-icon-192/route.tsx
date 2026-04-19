import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, rgba(171,46,32,0.12), transparent 32%), linear-gradient(180deg, #fbf7f0 0%, #efe2d1 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 144,
            height: 144,
            borderRadius: 38,
            overflow: "hidden",
            border: "2px solid rgba(171,46,32,0.16)",
            background: "#fffdfc",
            boxShadow: "0 24px 50px rgba(82,40,27,0.17)",
          }}
        >
          <div
            style={{
              width: 34,
              height: "100%",
              background: "#ab2e20",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 24,
              paddingBottom: 24,
            }}
          >
            {[0, 1, 2, 3].map((dot) => (
              <div
                key={dot}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "#f7d4cf",
                }}
              />
            ))}
          </div>
          <div
            style={{
              flex: 1,
              padding: "31px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ width: 56, height: 7, borderRadius: 999, background: "#ab2e20" }} />
            <div style={{ width: 62, height: 5, borderRadius: 999, background: "#d2b8a0" }} />
            <div style={{ width: 50, height: 5, borderRadius: 999, background: "#d2b8a0" }} />
            <div style={{ width: 40, height: 5, borderRadius: 999, background: "#d2b8a0" }} />
            <div
              style={{
                width: 28,
                height: 16,
                borderRight: "8px solid #39604f",
                borderBottom: "8px solid #39604f",
                transform: "rotate(45deg)",
                marginLeft: 20,
                marginTop: 4,
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: 192,
      height: 192,
    },
  );
}
