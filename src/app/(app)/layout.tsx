import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeApplier } from "@/components/providers/ThemeApplier";
import BackgroundOrbs from "@/components/layout/BackgroundOrbs";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <ThemeApplier />
      <BackgroundOrbs />
      <Sidebar />
      <main className="pt-16 px-4 pb-8 md:pt-8 md:pl-72 md:pr-8">
        <PageTransitionWrapper>{children}</PageTransitionWrapper>
      </main>
    </div>
  );
}
