import { useState } from "react";
import {
    Link,
    useNavigate,
} from "react-router-dom";

import { signupUser } from "../api/auth";


export default function Signup() {
  const navigate =
    useNavigate();


  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");


    if (!name.trim()) {
      setError(
        "Please enter your name."
      );

      return;
    }


    if (!email.trim()) {
      setError(
        "Please enter your email."
      );

      return;
    }


    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );

      return;
    }


    try {
      setLoading(true);

      await signupUser(
        name.trim(),
        email.trim(),
        password
      );


      setSuccess(
        "Customer account created successfully."
      );


      setTimeout(() => {
        navigate("/login");
      }, 1200);

    } catch (err) {
      setError(
        err.message ||
          "Signup failed."
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
            Create account
          </h2>

          <p>
            Customer registration
          </p>

        </div>


        <form
          onSubmit={
            handleSubmit
          }
        >

          <div className="form-group">

            <label>
              Name
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Your name"
            />

          </div>


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
              placeholder="At least 8 characters"
            />

          </div>


          {error && (
            <div className="error-message">
              {error}
            </div>
          )}


          {success && (
            <div className="success-message">
              {success}
            </div>
          )}


          <button
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create account"}
          </button>

        </form>


        <div className="signup-link">

          Already have an account?{" "}

          <Link to="/login">
            Sign in
          </Link>

        </div>

      </div>

    </div>
  );
}