import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../auth/AuthContext";


export default function Login() {
  const navigate =
    useNavigate();

  const { login } =
    useAuth();


  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setError("");


    if (!email.trim()) {
      setError(
        "Please enter your email."
      );

      return;
    }


    if (!password) {
      setError(
        "Please enter your password."
      );

      return;
    }


    try {
      setLoading(true);

      const data =
        await login(
          email.trim(),
          password
        );


      if (
        data.user.role ===
        "ADMIN"
      ) {
        navigate("/admin");

      } else if (
        data.user.role ===
        "SALES"
      ) {
        navigate("/sales");

      } else if (
        data.user.role ===
        "CUSTOMER"
      ) {
        navigate("/customer");

      } else {
        setError(
          "Unknown account role."
        );
      }

    } catch (err) {
      setError(
        err.message ||
          "Invalid email or password."
      );

    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="brand-section">

          <div className="brand-icon">
            D
          </div>

          <div>
            <h1>
              DealFlow360
            </h1>

            <p>
              Intelligent Sales Operations
            </p>
          </div>

        </div>


        <div className="auth-heading">

          <h2>
            Welcome back
          </h2>

          <p>
            Sign in to your workspace
          </p>

        </div>


        <form
          onSubmit={
            handleSubmit
          }
        >

          <div className="form-group">

            <label>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="you@example.com"
              autoComplete="email"
            />

          </div>


          <div className="form-group">

            <label>
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Enter your password"
              autoComplete="current-password"
            />

          </div>


          {error && (
            <div className="error-message">
              {error}
            </div>
          )}


          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>

        </form>


        <div className="divider" />


        <div className="demo-accounts">

          <h3>
            Hackathon demo accounts
          </h3>

          <p>
            <strong>
              Admin:
            </strong>{" "}
            admin@dealflow360.com
          </p>

          <p>
            <strong>
              Sales:
            </strong>{" "}
            sales@dealflow360.com
          </p>

          <p>
            <strong>
              Customer:
            </strong>{" "}
            customer@dealflow360.com
          </p>

        </div>


        <div className="signup-link">

          New customer?{" "}

          <Link to="/signup">
            Create an account
          </Link>

        </div>

      </div>

    </div>
  );
}
