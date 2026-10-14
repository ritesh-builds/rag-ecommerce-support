import "./globals.css";

export const metadata = {
  title: "ShopSphere AI Support",
  description: "AI-powered customer support for ShopSphere e-commerce",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
