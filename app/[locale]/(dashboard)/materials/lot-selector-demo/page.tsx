import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WorksheetMaterialSelector } from '@/components/worksheets/WorksheetMaterialSelector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default async function LotSelectorDemoPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <Link href="/materials">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-sm font-bold">LOT Selector Demo</h1>
          <p className="text-muted-foreground mt-1">
            Test the flexible LOT selection for worksheet materials
          </p>
        </div>
      </div>

      <Alert>
        <AlertTitle>Flexible LOT Selection</AlertTitle>
        <AlertDescription>
          This demonstrates how technicians will select material LOTs during worksheet creation.
          FIFO is suggested but not enforced - you can select any available LOT based on the type of work.
        </AlertDescription>
      </Alert>

      <WorksheetMaterialSelector />

      <div className="space-y-2 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold text-foreground">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Select a material from the dropdown</li>
          <li>Available LOTs appear with FIFO suggestion (blue badge)</li>
          <li>LOTs expiring within 30 days show warning (⚠️)</li>
          <li>Select any LOT - FIFO is recommended but not enforced</li>
          <li>If needed, click "Record New Stock Arrival" to add a new LOT on the spot</li>
          <li>Enter quantity needed and add to worksheet</li>
        </ol>
      </div>
    </div>
  );
}
