import { Manrope, DM_Mono } from "next/font/google";
import "./globals.css";

// Manrope carries display and body both — hierarchy comes from weight
// (800 display / 700 titles / 400 reading), not from a second family.
// It's variable, so one file covers the whole range.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

// Data only: percentages, pH, dates, step numbers, uppercase labels.
// Never prose.
const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata = {
  title: "GlowLog",
  description: "Your skincare routine, products, and progress — all in one place.",
  applicationName: "GlowLog",
  appleWebApp: {
    capable: true,
    title: "GlowLog",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  // Must match --paper, or iOS paints a different colour behind the
  // status bar than the page itself.
  themeColor: "#12161C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
