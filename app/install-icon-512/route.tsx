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
            width: 378,
            height: 378,
            borderRadius: 96,
            overflow: "hidden",
            border: "4px solid rgba(171,46,32,0.16)",
            background: "#fffdfc",
            boxShadow: "0 40px 100px rgba(82,40,27,0.18)",
          }}
        >
          <div
            style={{
              width: 90,
              height: "100%",
              background: "#ab2e20",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 62,
              paddingBottom: 62,
            }}
          >
            {[0, 1, 2, 3].map((dot) => (
              <div
                key={dot}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: "#f7d4cf",
                }}
              />
            ))}
          </div>
          <div
            style={{
              flex: 1,
              padding: "86px 64px",
              display: "flex",
              flexDirection: "column",
              gap: 34,
            }}
          >
            <div style={{ width: 160, height: 18, borderRadius: 999, background: "#ab2e20" }} />
            <div style={{ width: 176, height: 12, borderRadius: 999, background: "#d2b8a0" }} />
            <div style={{ width: 148, height: 12, borderRadius: 999, background: "#d2b8a0" }} />
            <div style={{ width: 122, height: 12, borderRadius: 999, background: "#d2b8a0" }} />
            <div
              style={{
                width: 78,
                height: 44,
                borderRight: "20px solid #39604f",
                borderBottom: "20px solid #39604f",
                transform: "rotate(45deg)",
                marginLeft: 58,
                marginTop: 6,
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    },
  );
}
