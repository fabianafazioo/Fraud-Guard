import './globals.css';

export const metadata = {
  title: 'FraudGuard AI',
  description: 'Elegant fraud detection dashboard powered by Isolation Forest.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
