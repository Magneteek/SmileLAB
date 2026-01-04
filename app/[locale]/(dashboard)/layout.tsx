import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/toaster';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto p-8">
          {children}
        </div>
      </main>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
