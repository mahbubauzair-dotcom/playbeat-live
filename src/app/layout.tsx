import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import "./site-theme.css";
import { SITE } from "@/lib/site";
import { homeTitle, homeDescription } from "@/lib/site-seo";
import { Toaster } from "@/components/ui/toaster";
import { SITE_NAME, SITE_URL, OG_IMAGE, websiteJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/stream/json-ld";

/* NEXA-style: self-hosted Mona Sans variable (build-safe, no runtime fetch) */
const monaSans = localFont({
  src: "./fonts/mona-sans-var.woff2",
  variable: "--font-mona",
  weight: "200 900",
  display: "swap",
});

const siteDisplay = localFont({
  src: "./fonts/site-display.woff2",
  variable: "--font-site-display",
  weight: "100 900",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* restores the visitor's chosen accent before paint (no FOUC) */
const THEME_INIT = `try{var t=localStorage.getItem("pb-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${homeTitle()}`,
    template: `%s`,
  },
  description: `${homeDescription()}`,
  authors: [{ name: SITE_NAME }],
  icons: {
    icon: [
      { url: "/brand/logo-mark-512.png", type: "image/png", sizes: "512x512" },
      { url: "/icons/pwa-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  applicationName: SITE_NAME,
  /* Google Search Console — same token as /google6512a067cc9e5944.html (meta tag survives asset redirects) */
  verification: {
    google: "google6512a067cc9e5944",
  },
  openGraph: {
    title: `${homeTitle()}`,
    description: `${homeDescription()}`,
    siteName: SITE_NAME,
    url: `${SITE_URL}/`,
    images: [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: OG_IMAGE.alt }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${homeTitle()}`,
    description: `${homeDescription()}`,
    images: [OG_IMAGE.url],
  },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="violet" data-site={SITE.id}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body
        className={`${monaSans.variable} ${siteDisplay.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <JsonLd data={websiteJsonLd()} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
