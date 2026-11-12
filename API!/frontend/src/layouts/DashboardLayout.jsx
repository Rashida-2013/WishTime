import Header from "../components/Header";

export default function DashboardLayout({ children }) {
  return (
    <div className="app-shell dashboard-shell">
      <Header />
      <main className="page-container">{children}</main>
    </div>
  );
}
