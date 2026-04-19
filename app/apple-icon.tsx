import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 134,
            height: 134,
            borderRadius: 34,
            overflow: "hidden",
            border: "2px solid rgba(171,46,32,0.16)",
            background: "#fffdfc",
            boxShadow: "0 24px 50px rgba(82,40,27,0.17)",
          }}
        >
          <div
            style={{
              width: 30,
              height: "100%",
              background: "#ab2e20",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 22,
              paddingBottom: 22,
            }}
          >
            {[0, 1, 2, 3].map((dot) => (
              <div
                key={dot}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background: "#f7d4cf",
                }}
              />
            ))}
          </div>
          <div
            style={{
              flex: 1,
              padding: "28px 21px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ width: 54, height: 7, borderRadius: 999, background: "#ab2e20" }} />
            <div style={{ width: 58, height: 5, borderRadius: 999, background: "#d2b8a0" }} />
            <div style={{ width: 48, height: 5, borderRadius: 999, background: "#d2b8a0" }} />
            <div style={{ width: 38, height: 5, borderRadius: 999, background: "#d2b8a0" }} />
            <div
              style={{
                width: 26,
                height: 15,
                borderRight: "8px solid #39604f",
                borderBottom: "8px solid #39604f",
                transform: "rotate(45deg)",
                marginLeft: 18,
                marginTop: 4,
              }}
            />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
