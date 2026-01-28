"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/app/lib/components/ThemeProvider";
import { Key, Save, Eye, EyeOff } from "lucide-react";

export default function ApiKeySettingsPage() {
  const { theme } = useTheme();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load API key from localStorage
    const savedKey = localStorage.getItem("ai_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("ai_api_key", apiKey);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-4xl p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Key className="h-6 w-6" />
            <h1 className="text-3xl font-bold">AI API Key Settings</h1>
          </div>
          <p
            className={
              theme === "light" ? "text-gray-600" : "text-gray-400"
            }
          >
            Configure your AI API credentials for enhanced functionality
          </p>
        </div>

        <div
          className={[
            "rounded-lg border p-6",
            theme === "light"
              ? "border-gray-200 bg-white"
              : "border-gray-800 bg-gray-900",
          ].join(" ")}
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="api-key"
                className="mb-2 block text-sm font-medium"
              >
                API Key
              </label>
              <div className="relative">
                <input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className={[
                    "w-full rounded-lg border px-4 py-2 pr-10",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500",
                    theme === "light"
                      ? "border-gray-300 bg-white text-gray-900"
                      : "border-gray-700 bg-gray-800 text-gray-100",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className={[
                    "absolute right-2 top-1/2 -translate-y-1/2",
                    "rounded p-1 transition-colors",
                    theme === "light"
                      ? "hover:bg-gray-100"
                      : "hover:bg-gray-700",
                  ].join(" ")}
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p
                className={[
                  "mt-2 text-sm",
                  theme === "light" ? "text-gray-500" : "text-gray-400",
                ].join(" ")}
              >
                Your API key is stored locally in your browser and never sent to
                our servers
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                className={[
                  "flex items-center gap-2 rounded-lg px-4 py-2",
                  "font-medium transition-colors",
                  "bg-blue-600 text-white hover:bg-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                ].join(" ")}
              >
                <Save className="h-4 w-4" />
                Save API Key
              </button>

              {isSaved && (
                <span
                  className={
                    theme === "light"
                      ? "text-sm text-green-600"
                      : "text-sm text-green-400"
                  }
                >
                  ✓ Saved successfully
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className={[
            "mt-6 rounded-lg border p-4",
            theme === "light"
              ? "border-blue-200 bg-blue-50"
              : "border-blue-900 bg-blue-950",
          ].join(" ")}
        >
          <h3 className="mb-2 font-medium">How to get an API key</h3>
          <ol
            className={[
              "list-decimal space-y-1 pl-5 text-sm",
              theme === "light" ? "text-gray-700" : "text-gray-300",
            ].join(" ")}
          >
            <li>Visit your AI provider's dashboard (e.g., OpenAI, Anthropic)</li>
            <li>Navigate to the API keys section</li>
            <li>Generate a new API key</li>
            <li>Copy and paste it into the field above</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

