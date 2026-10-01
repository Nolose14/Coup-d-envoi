import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { TabBar } from "@/components/TabBar";
import "./globals.css";

// Écrans de démarrage iOS : une image par taille d'écran (iPhone 13 = 390×844 @3x).
const startupImage = [
  { url: "/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
];

export const metadata: Metadata = {
  title: "Coup d'envoi",
  description: "Les prochains matchs de foot, l'heure, le stade et la chaîne.",
  manifest: "/manifest.webmanifest",
  applicationName: "Coup d'envoi",
  appleWebApp: {
    capable: true,
    title: "Coup d'envoi",
    statusBarStyle: "black-translucent", // la barre de statut se fond dans le design
    startupImage,
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans">
        <main className="mx-auto max-w-xl pb-[calc(84px+env(safe-area-inset-bottom))]">{children}</main>
        <TabBar />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
