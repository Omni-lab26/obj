import React from "react";
import { C } from "../theme";

export const Card: React.FC<{
  style?: React.CSSProperties;
  accent?: string;
  children: React.ReactNode;
}> = ({ style, accent, children }) => (
  <div
    style={{
      background: C.card,
      border: `1.5px solid ${accent ?? C.cardBorder}`,
      borderRadius: 26,
      boxSizing: "border-box",
      padding: "28px 36px",
      ...style,
    }}
  >
    {children}
  </div>
);
