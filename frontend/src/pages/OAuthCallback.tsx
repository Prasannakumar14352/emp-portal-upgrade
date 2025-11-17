import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/authService";

export default function OAuthCallback() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                const url = new URL(window.location.href);

                const accessToken = url.searchParams.get("access_token");
                const refreshToken = url.searchParams.get("refresh_token");

                if (!accessToken || !refreshToken) {
                    toast.error("Microsoft login failed. Try again.");
                    navigate("/auth");
                    return;
                }

                // Store tokens temporarily
                localStorage.setItem('auth_token', accessToken);
                localStorage.setItem('refresh_token', refreshToken);

                // Fetch user details dynamically from API
                const session = await authService.getSession();
                
                if (!session) {
                    toast.error("Failed to fetch user details.");
                    navigate("/auth");
                    return;
                }

                toast.success("Signed in with Microsoft!");
                navigate("/");
            } catch (error) {
                console.error("OAuth callback error:", error);
                toast.error("Authentication failed. Please try again.");
                navigate("/auth");
            } finally {
                setIsLoading(false);
            }
        };

        handleOAuthCallback();
    }, [navigate]);

    return (
        <div className="w-full h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-lg text-muted-foreground">
                    {isLoading ? "Finishing sign-in…" : "Redirecting…"}
                </p>
            </div>
        </div>
    );
}
