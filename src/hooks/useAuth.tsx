import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface MockUser {
  id: string;
  email: string;
  full_name: string;
}

export function useAuth() {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("mockUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signOut = () => {
    localStorage.removeItem("mockUser");
    setUser(null);
    navigate("/auth");
  };

  return {
    user,
    loading,
    signOut,
  };
}
