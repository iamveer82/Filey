'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import CommandPalette from './CommandPalette';

export default function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
      <CommandPalette />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 13 },
        }}
      />
    </ThemeProvider>
  );
}
