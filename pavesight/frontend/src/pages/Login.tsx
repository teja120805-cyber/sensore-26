import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";

export default function Login() {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <LoginForm onSuccess={() => navigate("/dashboard")} />
    </div>
  );
}
