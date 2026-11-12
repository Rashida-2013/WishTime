import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, UserRound, LogOut } from "lucide-react";
import Logo from "./Logo";

// Use the backend root for authentication routes.
const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

export default function Header({ auth = false }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve the currently logged-in user.
  useEffect(() => {
    let active = true;

    async function loadUser() {
      setLoading(true);

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          if (active) {
            setUser(null);
          }
          return;
        }

        const profile = await response.json();

        if (active) {
          setUser(profile);
        }
      } catch (error) {
        console.error("Unable to retrieve user profile:", error);

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [location.pathname]);

  // Log out the current user.
  async function handleLogout() {
  if (loggingOut) return;

  setLoggingOut(true);

  try {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      let message = `Logout failed: HTTP ${response.status}`;

      try {
        const data = await response.json();

        if (data?.detail) {
          message = data.detail;
        }
      } catch {
        // Keep the default error message.
      }

      throw new Error(message);
    }

    // Clear the local user state.
    setUser(null);
    setOpen(false);

    // Go to the home page after successful logout.
    navigate("/", { replace: true });
  } catch (error) {
    console.error("Logout failed:", error);
    alert(
      error?.message ||
        "Unable to log out. Please try again."
    );
  } finally {
    setLoggingOut(false);
  }
}

  // Minimal header for login and other authentication pages.
  if (auth) {
    return (
      <header className="site-header auth-header">
        <Link to="/" aria-label="WishTime home">
          <Logo />
        </Link>
      </header>
    );
  }

  const links =
  location.pathname === "/events"
    ? [
        ["/create-event", "Create Event"],
        ["/events", "My Events"],
      ]
    : [
        ["/", "Home"],
        ["/create-event", "Create Event"],
        ["/events", "My Events"],
      ];

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          to="/"
          aria-label="WishTime home"
          onClick={() => setOpen(false)}
        >
          <Logo />
        </Link>

        <nav className={`main-nav ${open ? "is-open" : ""}`}>
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                isActive && location.pathname === to ? "active" : ""
              }
            >
              {label}
            </NavLink>
          ))}

          {loading ? (
            <span className="header-loading" aria-live="polite">
              Loading...
            </span>
          ) : user ? (
            <div className="user-menu">
              <div className="user-profile">
                <span className="user-avatar" aria-hidden="true">
                  <UserRound size={18} />
                </span>

                <span className="user-name">
                  {user.name || user.email || "User"}
                </span>
              </div>

              <button
                type="button"
                className="logout-btn"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut size={16} />
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Login
            </NavLink>
          )}
        </nav>

        <button
          type="button"
          className="icon-btn menu-btn"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}