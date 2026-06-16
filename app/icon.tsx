import { ImageResponse } from "next/og";

// Metadados da imagem
export const size = {
  width: 512,
  height: 512,
};
export const contentType = "image/png";

// Geração da imagem: quadrado laranja com a letra "C" branca.
// Vira o ícone do app (favicon + ícone da PWA na tela inicial).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 360,
          fontWeight: 700,
          background: "#EA580C",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
        }}
      >
        C
      </div>
    ),
    {
      ...size,
    },
  );
}
