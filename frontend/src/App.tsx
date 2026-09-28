import { useCallback, useEffect, useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import type { PageKey } from "./components/Sidebar";
import { Toasts } from "./components/Toast";
import { VendorDrawer } from "./components/VendorDrawer";
import { Dashboard } from "./pages/Dashboard";
import { Decisions } from "./pages/Decisions";
import { Memory } from "./pages/Memory";
import { Requests } from "./pages/Requests";
import { Settings } from "./pages/Settings";
import { Vendors } from "./pages/Vendors";
import { AppStateProvider } from "./state/AppState";

const PAGES: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Procurement Intelligence",
    subtitle: "Current supplier KPIs combined with organizational memory of what actually happened on past orders.",
  },
  requests: { title: "Purchase Requests", subtitle: "Every request stored by the VendorPulse backend and where it is in the decision loop." },
  vendors: { title: "Vendor Intelligence", subtitle: "Baseline supplier KPIs, with memory-adjusted risk once a request has been evaluated." },
  decisions: { title: "Decision History", subtitle: "Human procurement decisions and the outcomes that followed." },
  memory: { title: "Memory", subtitle: "Procurement experiences available to Hindsight-powered evaluation." },
  settings: { title: "Settings", subtitle: "Backend connection and data utilities." },
};

function pageFromHash(): PageKey {
  const key = window.location.hash.replace(/^#\/?/, "") as PageKey;
  return key in PAGES ? key : "dashboard";
}

function Shell() {
  const [page, setPage] = useState<PageKey>(pageFromHash);
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((p: PageKey) => {
    if (pageFromHash() !== p) window.location.hash = `/${p}`;
    setPage(p);
    window.scrollTo({ top: 0 });
  }, []);

  const closeDrawer = useCallback(() => setVendorId(null), []);
  const meta = PAGES[page];

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Sidebar page={page} onNavigate={navigate} />
      <div className="main-col">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main id="main" tabIndex={-1}>
          {page === "dashboard" && <Dashboard onOpenVendor={setVendorId} onNavigate={navigate} />}
          {page === "requests" && <Requests onNavigate={navigate} />}
          {page === "vendors" && <Vendors onOpenVendor={setVendorId} />}
          {page === "decisions" && <Decisions onNavigate={navigate} />}
          {page === "memory" && <Memory onOpenVendor={setVendorId} />}
          {page === "settings" && <Settings />}
        </main>
      </div>
      {vendorId && <VendorDrawer vendorId={vendorId} onClose={closeDrawer} />}
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}
