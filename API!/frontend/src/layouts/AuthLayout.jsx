import Header from "../components/Header";

export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <Header auth />
      <main className="auth-main">{children}</main>
    </div>
  );
}
