import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";

import AuthLayout from "../layouts/AuthLayout";
import WishArtwork from "../components/WishArtwork";
import Button from "../components/Button";
import Input from "../components/Input";
import {
  registerUser,
  loginWithGoogle,
} from "../services/api";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState("");

  const navigate = useNavigate();

  const set = (key) => (e) => {
    setForm((current) => ({
      ...current,
      [key]: e.target.value,
    }));
  };

  async function submit(e) {
    e.preventDefault();

    setError("");

    if (
      !form.name ||
      !form.email ||
      !form.password
    ) {
      setError(
        "Please complete all required fields."
      );
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await registerUser(form);
      navigate("/events");
    } catch (error) {
      console.error(
        "Registration failed:",
        error
      );

      const message =
        error?.response?.data?.detail ||
        "Unable to create your account. Please try again.";

      setError(message);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-layout">

        {/* LEFT SIDE */}
        <section className="auth-art">
          <div>
            <h1>
              Make Every Moment
              <br />
              Worth Remembering.
            </h1>

            <p>
              Build thoughtful wishes once and let
              WishTime deliver them at just the
              right moment.
            </p>
          </div>

          <WishArtwork small />
        </section>

        {/* RIGHT SIDE */}
        <section className="auth-card-wrap">
          <div className="auth-card">

            {/* TABS */}
            <div className="auth-tabs">

              <Link to="/login">
                Login
              </Link>

              <span className="active">
                Sign Up
              </span>

            </div>

            <h2>
              Create an Account
            </h2>

            <p className="auth-subtitle">
              Start making every moment memorable
            </p>

            {/* SIGNUP FORM */}
            <form onSubmit={submit}>

              <Input
                label="Full Name"
                icon={User}
                placeholder="Priya Sharma"
                value={form.name}
                onChange={set("name")}
              />

              <Input
                label="Email Address"
                icon={Mail}
                placeholder="you@example.com"
                value={form.email}
                onChange={set("email")}
              />

              <Input
                label="Password"
                icon={LockKeyhole}
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={set("password")}
              />

              <Input
                label="Confirm Password"
                icon={LockKeyhole}
                type="password"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={set("confirm")}
              />

              {error && (
                <p className="form-error">
                  {error}
                </p>
              )}

              {/* NORMAL SIGNUP */}
              <Button
                type="submit"
                className="full"
              >
                Create Account
              </Button>

            </form>

            {/* DIVIDER */}
            <div className="auth-divider">
              <span>or</span>
            </div>

            {/* GOOGLE SIGNUP */}
            <button
              type="button"
              className="google-button"
              onClick={loginWithGoogle}
            >
              <span className="google-icon">
                G
              </span>

              <span>
                Sign up with Google
              </span>
            </button>

            {/* LOGIN LINK */}
            <Link
              className="create-account"
              to="/login"
            >
              Already have an account?
            </Link>

          </div>
        </section>

      </div>
    </AuthLayout>
  );
}