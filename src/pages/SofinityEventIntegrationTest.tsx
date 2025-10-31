import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

interface TestResult {
  name: string;
  status: "pass" | "fail" | "running";
  message: string;
  details?: any;
}

export default function SofinityEventIntegrationTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runIntegrationTest = async () => {
    setIsRunning(true);
    setResults([]);
    const testResults: TestResult[] = [];

    console.log("🧪 Starting sofinity-event integration test...");

    // Test 1: POST request with valid structure
    try {
      testResults.push({
        name: "Test 1: POST with valid event structure",
        status: "running",
        message: "Sending request..."
      });
      setResults([...testResults]);

      const testPayload = {
        project_id: "00000000-0000-0000-0000-000000000001",
        event_name: "test_event",
        sofinity_api_key: "test-api-key-12345",
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        }
      };

      console.log("📤 Sending POST request to sofinity-event:", testPayload);

      const response = await fetch(
        "https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-event",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testPayload)
        }
      );

      const status = response.status;
      const headers = Object.fromEntries(response.headers.entries());
      let body;
      try {
        body = await response.json();
      } catch {
        body = await response.text();
      }

      console.log("📥 Response received:", { status, headers, body });

      // Verify verify_jwt=false is effective (should not get 401)
      if (status === 401) {
        testResults[0] = {
          name: "Test 1: POST with valid event structure",
          status: "fail",
          message: `❌ CRITICAL: Got 401 Unauthorized - verify_jwt may still be enabled!`,
          details: { status, headers, body }
        };
      } else if (status === 200 || status === 400) {
        testResults[0] = {
          name: "Test 1: POST with valid event structure",
          status: "pass",
          message: `✅ Function responded with status ${status} (verify_jwt=false is working)`,
          details: { status, headers, body }
        };
      } else {
        testResults[0] = {
          name: "Test 1: POST with valid event structure",
          status: "fail",
          message: `⚠️ Unexpected status: ${status}`,
          details: { status, headers, body }
        };
      }
    } catch (error: any) {
      console.error("❌ Test 1 failed:", error);
      testResults[0] = {
        name: "Test 1: POST with valid event structure",
        status: "fail",
        message: `Error: ${error.message}`,
        details: { error: error.toString() }
      };
    }

    // Test 2: POST request without JWT header
    try {
      testResults.push({
        name: "Test 2: POST without JWT (verify_jwt=false test)",
        status: "running",
        message: "Testing public access..."
      });
      setResults([...testResults]);

      const testPayload = {
        project_id: "test-project-id",
        event_name: "no_jwt_test",
        sofinity_api_key: "test-key"
      };

      console.log("📤 Sending POST without JWT:", testPayload);

      const response = await fetch(
        "https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-event",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testPayload)
        }
      );

      const status = response.status;
      const body = await response.text();

      console.log("📥 Response:", { status, body });

      if (status === 401) {
        testResults[1] = {
          name: "Test 2: POST without JWT (verify_jwt=false test)",
          status: "fail",
          message: "❌ CRITICAL: Function requires JWT authentication - verify_jwt=false not working!",
          details: { status, body }
        };
      } else {
        testResults[1] = {
          name: "Test 2: POST without JWT (verify_jwt=false test)",
          status: "pass",
          message: `✅ Function accessible without JWT (status ${status})`,
          details: { status, body }
        };
      }
    } catch (error: any) {
      console.error("❌ Test 2 failed:", error);
      testResults[1] = {
        name: "Test 2: POST without JWT (verify_jwt=false test)",
        status: "fail",
        message: `Error: ${error.message}`,
        details: { error: error.toString() }
      };
    }

    // Test 3: OPTIONS preflight request
    try {
      testResults.push({
        name: "Test 3: OPTIONS preflight (CORS)",
        status: "running",
        message: "Testing CORS..."
      });
      setResults([...testResults]);

      console.log("📤 Sending OPTIONS request...");

      const response = await fetch(
        "https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-event",
        {
          method: "OPTIONS",
        }
      );

      const status = response.status;
      const corsHeader = response.headers.get("access-control-allow-origin");

      console.log("📥 CORS response:", { status, corsHeader });

      if (status === 200 && corsHeader) {
        testResults[2] = {
          name: "Test 3: OPTIONS preflight (CORS)",
          status: "pass",
          message: `✅ CORS configured correctly`,
          details: { status, corsHeader }
        };
      } else {
        testResults[2] = {
          name: "Test 3: OPTIONS preflight (CORS)",
          status: "fail",
          message: `⚠️ CORS may not be configured properly`,
          details: { status, corsHeader }
        };
      }
    } catch (error: any) {
      console.error("❌ Test 3 failed:", error);
      testResults[2] = {
        name: "Test 3: OPTIONS preflight (CORS)",
        status: "fail",
        message: `Error: ${error.message}`,
        details: { error: error.toString() }
      };
    }

    setResults(testResults);
    setIsRunning(false);

    const allPassed = testResults.every(r => r.status === "pass");
    const criticalFailed = testResults.some(r => r.status === "fail" && r.message.includes("CRITICAL"));

    if (allPassed) {
      console.log("✅ All tests passed!");
      toast.success("All integration tests passed!");
    } else if (criticalFailed) {
      console.error("❌ CRITICAL TEST FAILURE - verify_jwt may not be disabled!");
      toast.error("Critical failure: JWT verification may still be enabled!");
    } else {
      console.warn("⚠️ Some tests failed");
      toast.warning("Some tests failed - check results");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass":
        return <Badge variant="default" className="bg-green-500">PASS</Badge>;
      case "fail":
        return <Badge variant="destructive">FAIL</Badge>;
      case "running":
        return <Badge variant="secondary">RUNNING</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Sofinity Event Integration Test</h1>
        <p className="text-muted-foreground">
          Automated test suite to verify sofinity-event function configuration and verify_jwt=false setting
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>
            Tests the deployed sofinity-event function at:<br />
            <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
              https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-event
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runIntegrationTest}
            disabled={isRunning}
            size="lg"
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Integration Tests
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              {results.filter(r => r.status === "pass").length} / {results.length} tests passed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <h3 className="font-semibold">{result.name}</h3>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      View Details
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>What This Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span><strong>Test 1:</strong> POST request with valid event data and sofinity_api_key</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span><strong>Test 2:</strong> Verifies verify_jwt=false is working (no 401 errors)</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span><strong>Test 3:</strong> CORS preflight request handling</span>
          </div>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> A 401 response indicates JWT verification is still enabled.
              Status 200 or 400 confirms verify_jwt=false is working correctly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
