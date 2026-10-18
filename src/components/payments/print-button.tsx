'use client';

import { Printer } from 'lucide-react';
import { Button } from '../ui/kit';

export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden /> Imprimir o guardar PDF
    </Button>
  );
}
