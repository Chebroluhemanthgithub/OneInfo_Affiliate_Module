import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";
import { User } from "lucide-react";

const Login = () => {
  // DEV testing credentials
  const [email, setEmail] = useState("hemanthchebrolu21@gmail.com");
  const [password, setPassword] = useState("123");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await api.post("/creators/login", {
        email,
        password,
      });

      if (res.data && res.data.token) {
        localStorage.setItem("token", res.data.token);
        navigate("/dashboard");
      } else {
        setError("Invalid server response");
      }
    } catch (err) {
      console.error("Login error:", err);

      if (err.response) {
        setError(err.response.data?.error || "Login failed");
      } else if (err.request) {
        setError("Server not responding");
      } else {
        setError("Unexpected error occurred");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">

        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <User size={32} className="text-blue-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-6 text-slate-800">
          Creator Login
        </h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default Login;