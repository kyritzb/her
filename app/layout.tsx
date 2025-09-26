import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VRM Avatar Controller",
  description:
    "Control VRChat-style avatars in the browser using Three.js and VRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
