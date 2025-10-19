import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import AuthInput from "./AuthInput";
import { authService } from "../../shared/api/authService";

export default function AuthForm() {
  const [searchParams] = useSearchParams();
  const authType = searchParams.get("mode");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    login: "",
    password: "",
    confirmPassword: "",
    role: "CANDIDATE",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authType !== "login" && authType !== "signup") {
      navigate("/auth?mode=login", { replace: true });
    }
  }, [authType, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (authType === "login") {
        await authService.login({
          username: formData.login,
          password: formData.password,
        });
        navigate("/");
      } else if (authType === "signup") {
        await authService.register({
          username: formData.login,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          role: formData.role,
        });
        setError("Registration successful! Redirecting to login...");
        setTimeout(() => navigate("/auth?mode=login"), 2000);
      }
    } catch (err: any) {
      setError(err.response?.data || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-[35%] justify-center flex flex-col shadow-xl bg-white rounded-[8px] gap-8 p-8 border-[1px] border-gray-300"
    >
      <h2 className="text-2xl font-semibold text-center">
        {authType === "login" ? "Login" : "Sign Up"}
      </h2>
      {error && <div className={`text-sm ${error.includes("successful") ? "text-green-600" : "text-red-600"} text-center`}>{error}</div>}
      <section className="flex flex-col gap-4 justify-center items-center">
        <AuthInput
          name="login"
          placeholder="Please enter your username"
          label="Username"
          value={formData.login}
          onChange={handleChange}
        />
        <AuthInput
          label="Password"
          name="password"
          type="password"
          placeholder="Please enter your password"
          value={formData.password}
          onChange={handleChange}
        />
        {authType === "signup" && (
          <>
            <AuthInput
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            
            {/* Role Selection */}
            <div className="w-full flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Register as:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="CANDIDATE"
                    checked={formData.role === "CANDIDATE"}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">Candidate</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="RECRUITER"
                    checked={formData.role === "RECRUITER"}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">Employer</span>
                </label>
              </div>
            </div>
          </>
        )}
      </section>
      <section className="w-full flex flex-col gap-2 justify-center items-center">
        <button
          className="border-[1px] w-[70%] py-[10px] rounded-[8px] text-white bg-blue-600 hover:bg-blue-400 cursor-pointer disabled:opacity-50"
          type="submit"
          disabled={loading}
        >
          {loading ? "Loading..." : authType === "login" ? "Log in" : "Sign up"}
        </button>
        <button
          type="button"
          onClick={() =>
            navigate(`/auth?mode=${authType === "login" ? "signup" : "login"}`)
          }
          className="text-sm text-blue-600 hover:underline"
        >
          {authType === "login"
            ? "Don't have an account? Sign up"
            : "Already have an account? Log in"}
        </button>
      </section>
    </form>
  );
}
