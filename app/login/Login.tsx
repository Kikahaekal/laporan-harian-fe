import { TextField, Button } from "@mui/material";
import { useState } from "react";
import { useAuth } from "~/context/AuthContext";
import { CircularProgress } from "@mui/material";

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const data = { email, password };
      await login(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  } 
  
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100">
      <div className="bg-white shadow-xl rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-semibold">Selamat Datang!</h1>
        <p className="text-sm text-gray-500 mb-4">Silakan masuk dengan akun Anda.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
          >
            {loading ? <CircularProgress size={25} color="inherit"/> : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
