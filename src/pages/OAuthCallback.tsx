import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function OAuthCallback() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const handleOAuthCallback = async () => {
            try {
                const url = new URL(window.location.href);

                const accessToken = url.searchParams.get("access_token");
                const refreshToken = url.searchParams.get("refresh_token");

                if (!accessToken || !refreshToken) {
                    if (mounted) {
                        toast.error("Microsoft login failed. Try again.");
                        navigate("/auth");
                    }
                    return;
                }

                // Store tokens
                localStorage.setItem('token', accessToken);
                localStorage.setItem('refresh_token', refreshToken);

                // Wait a bit for storage to complete
                await new Promise(resolve => setTimeout(resolve, 100));

                if (mounted) {
                    toast.success("Signed in with Microsoft!");
                    navigate("/");
                }
            } catch (error) {
                console.error("OAuth callback error:", error);
                if (mounted) {
                    toast.error("Authentication failed. Please try again.");
                    navigate("/auth");
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        handleOAuthCallback();

        return () => {
            mounted = false;
        };
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
