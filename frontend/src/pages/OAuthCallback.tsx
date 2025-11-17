import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/authService";

export default function OAuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const url = new URL(window.location.href);

        const accessToken = url.searchParams.get("access_token");
        const refreshToken = url.searchParams.get("refresh_token");
        const email = url.searchParams.get("email") || "azure-user@domain.com";
        const name = url.searchParams.get("name") || "Microsoft User";

        if (!accessToken || !refreshToken) {
            toast.error("Microsoft login failed. Try again.");
            navigate("/auth");
            return;
        }

        // Save tokens and user into your real session system
        authService.applyOAuthTokens(accessToken, refreshToken, {
            id: "azure-user",
            email,
            full_name: name,
        });

        toast.success("Signed in with Microsoft!");

        navigate("/");
    }, [navigate]);

    return (
        <div className="w-full h-screen flex items-center justify-center text-lg">
            Finishing sign-in…
        </div>
    );
}
