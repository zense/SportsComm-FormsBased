import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { auth, signInWithMicrosoft, logout } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Dashboard from "./Dashboard";
import Login from "./Login";

// ProtectedRoute ensures only logged-in users with valid token can access
function ProtectedRoute({ user, accessToken, children }) {
  if (!user || !accessToken) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// PublicRoute redirects logged-in users away from login page
function PublicRoute({ user, children }) {
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  localStorage.clear();
  sessionStorage.clear();
  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Load token from sessionStorage if available
      const storedToken = sessionStorage.getItem("accessToken");
      if (currentUser && storedToken) {
        setAccessToken(storedToken);
      } else {
        setAccessToken(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Microsoft sign-in
  const handleLogin = async () => {
    try {
      const result = await signInWithMicrosoft();
      if (result?.user && result?.accessToken) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        sessionStorage.setItem("accessToken", result.accessToken);
      } else {
        console.error("Login succeeded but no access token returned");
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert(error.message || "Login failed. Please try again.");
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      sessionStorage.removeItem("accessToken");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute user={user}>
              <Login signIn={handleLogin} />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} accessToken={accessToken}>
              <Dashboard user={user} accessToken={accessToken} logout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

