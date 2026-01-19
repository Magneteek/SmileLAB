import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/toaster';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 pt-16 lg:pt-0 min-w-0">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
