import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Quick Pay. Less paying. More living.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(
    path.join(process.cwd(), "public/brand/header-dark@2x.png"),
  );
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#2E1065",
          padding: 88,
          color: "#FAF9FF",
        }}
      >
        <img
          src={`data:image/png;base64,${logo.toString("base64")}`}
          alt="Quick Pay"
          width={700}
          height={(700 * 540) / 2180}
        />
        <div
          style={{
            display: "flex",
            marginTop: 52,
            fontSize: 58,
            fontWeight: 700,
            color: "#D9F86C",
          }}
        >
          Less paying. More living.
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 28 }}>
          Your everyday payments, together.
        </div>
      </div>
    ),
    size,
  );
}
