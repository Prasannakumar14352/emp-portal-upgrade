import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { API_CONFIG } from "@/config/api";

export default function ApiTest() {
  const [backendUrl, setBackendUrl] = useState(API_CONFIG.local.baseURL);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message: string;
    data?: any;
  }>({ status: "idle", message: "" });

  const testConnection = async () => {
    setTestResult({ status: "loading", message: "Testing connection..." });
    
    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: "GET",
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult({
          status: "success",
          message: "✅ Backend is reachable!",
          data,
        });
      } else {
        setTestResult({
          status: "error",
          message: `❌ Backend responded with status: ${response.status}`,
          data: await response.text(),
        });
      }
    } catch (error) {
      setTestResult({
        status: "error",
        message: `❌ Cannot reach backend: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  };

  const testOAuthEndpoint = async () => {
    setTestResult({ status: "loading", message: "Testing OAuth endpoint..." });
    
    try {
      const response = await fetch(`${backendUrl}/auth/oauth/azure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_to: window.location.origin + "/auth/callback",
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult({
          status: "success",
          message: "✅ OAuth endpoint is working!",
          data,
        });
      } else {
        setTestResult({
          status: "error",
          message: `❌ OAuth endpoint error: ${response.status}`,
          data: await response.text(),
        });
      }
    } catch (error) {
      setTestResult({
        status: "error",
        message: `❌ Cannot reach OAuth endpoint: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Backend API Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Current mode: <strong>{API_CONFIG.mode}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="backendUrl">Backend URL</Label>
            <Input
              id="backendUrl"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:3000/api"
            />
            <p className="text-sm text-muted-foreground mt-2">
              ⚠️ Note: localhost:3000 won't work from lovableproject.com. You need to either:
              <br />• Run this app on localhost:5173 (npm run dev) and access it there
              <br />• Deploy your backend and update this URL to the deployed URL
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>API Tests</CardTitle>
          <CardDescription>Test your backend endpoints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testConnection}>
              Test Connection (Health Check)
            </Button>
            <Button onClick={testOAuthEndpoint} variant="secondary">
              Test OAuth Endpoint
            </Button>
          </div>

          {testResult.status !== "idle" && (
            <Alert variant={testResult.status === "error" ? "destructive" : "default"}>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.data && (
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-64">
                      {typeof testResult.data === "string" 
                        ? testResult.data 
                        : JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Fix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Option 1: Run Everything Locally</h3>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Start your backend: <code className="bg-muted px-1 rounded">cd backend && npm start</code></li>
              <li>Start your frontend locally: <code className="bg-muted px-1 rounded">npm run dev</code></li>
              <li>Access the app at <code className="bg-muted px-1 rounded">http://localhost:5173</code></li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Option 2: Deploy Your Backend</h3>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Deploy your backend to a service (Railway, Render, Heroku, etc.)</li>
              <li>Update the backend URL above to your deployed URL</li>
              <li>Update <code className="bg-muted px-1 rounded">src/config/api.ts</code> with the new URL</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Option 3: Use Supabase Auth (Recommended)</h3>
            <p>Migrate to Supabase's built-in authentication - no separate backend needed!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}