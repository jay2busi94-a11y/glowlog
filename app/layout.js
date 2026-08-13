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
  // Must match --paper, or iOS paints a different colour behind the status
  // bar than the page itself. Two entries so it tracks the device the same
  // way the palette does.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F6FA" },
    { media: "(prefers-color-scheme: dark)", color: "#12161C" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

// Runs before the browser paints anything. A saved theme has to be stamped
// on <html> synchronously — do it in an effect and the page renders in the
// device theme first, then snaps, which is the flash every themed site has.
// "system" (or nothing saved) leaves the attribute off so the CSS media
// query decides.
const APPLY_THEME = `
try {
  var t = localStorage.getItem('glowlog-theme');
  if (t && t !== 'system') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${dmMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_THEME }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
