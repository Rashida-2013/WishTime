import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";

import AuthLayout from "../layouts/AuthLayout";
import WishArtwork from "../components/WishArtwork";
import Button from "../components/Button";
import Input from "../components/Input";
import {
  loginUser,
  loginWithGoogle,
} from "../services/api";

export default function Login() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();

    try {
      await loginUser({
        email,
        password,
      });

      navigate("/events");
    } catch (error) {
      console.error("Login failed:", error);
      alert(
        error?.response?.data?.detail ||
        "Unable to login. Please check your email and password."
      );
    }
  }

  return (
    <AuthLayout>
      <div className="auth-layout">

        {/* LEFT SIDE */}
        <section className="auth-art">
          <div>
            <h1>
              Never Miss a Moment
              <br />
              That Matters.
            </h1>

            <p>
              Create, schedule and share beautiful wishes
              for life's special moments.
            </p>
          </div>

          <WishArtwork small />
        </section>

        {/* RIGHT SIDE */}
        <section className="auth-card-wrap">
          <div className="auth-card">

            {/* TABS */}
            <div className="auth-tabs">
              <span className="active">
                Login
              </span>

              <Link to="/signup">
                Sign Up
              </Link>
            </div>

            <h2>Welcome Back</h2>

            <p className="auth-subtitle">
              Sign in to your WishTime account
            </p>

            {/* LOGIN FORM */}
            <form onSubmit={submit}>

              <Input
                label="Email Address"
                icon={Mail}
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />

              <label className="field">
                <span className="field-label">
                  Password
                </span>

                <span className="input-wrap">

                  <LockKeyhole
                    size={15}
                    className="input-icon"
                  />

                  <input
                    type={
                      show
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                  />

                  <button
                    type="button"
                    className="field-action"
                    onClick={() =>
                      setShow(
                        (value) => !value
                      )
                    }
                    aria-label="Toggle password visibility"
                  >
                    {show ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>

                </span>
              </label>

              {/* REMEMBER / FORGOT */}
              <div className="form-row">

                <label className="check">
                  <input type="checkbox" />

                  <span>
                    Remember me
                  </span>
                </label>

                <a href="#forgot">
                  Forgot Password?
                </a>

              </div>

              {/* NORMAL LOGIN */}
              <Button
                type="submit"
                className="full"
              >
                Login
              </Button>

            </form>

            {/* DIVIDER */}
            <div className="auth-divider">
              <span>or</span>
            </div>

            {/* GOOGLE LOGIN */}
            <button
              type="button"
              className="google-button"
              onClick={loginWithGoogle}
            >
              <span className="google-icon">
                G
              </span>

              <span>
                Continue with Google
              </span>
            </button>

            {/* CREATE ACCOUNT */}
            <Link
              className="create-account"
              to="/signup"
            >
              Create an Account
            </Link>

          </div>
        </section>

      </div>
    </AuthLayout>
  );
}