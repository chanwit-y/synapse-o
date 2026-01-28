"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/app/lib/components/ThemeProvider";
import { Key, Save, Eye, EyeOff, Trash2 } from "lucide-react";
import { saveApiKey, getAllApiKeys, deleteApiKey } from "./action";
import type { ApiKeyRow } from "@/app/lib/db/repository/api-key";

export default function ApiKeySettingsPage() {
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    loadApiKeys();
    // Trigger animation on mount
    setIsAnimating(false);
  }, []);

  const loadApiKeys = async () => {
    const result = await getAllApiKeys();
    if (result.success && result.data) {
      setApiKeys(result.data);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !apiKey.trim()) {
      return;
    }

    setIsLoading(true);
    const result = await saveApiKey({
      name: name.trim(),
      description: description.trim() || undefined,
      apiKey: apiKey.trim(),
    });

    if (result.success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      
      // Clear form
      setName("");
      setDescription("");
      setApiKey("");
      setShowKey(false);

      // Reload API keys list
      await loadApiKeys();
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) {
      return;
    }

    const result = await deleteApiKey(id);
    if (result.success) {
      await loadApiKeys();
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex-1  overflow-y-auto">
      <div 
        className="mx-auto max-w-4xl p-8"
        style={{
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating ? 'translateY(20px)' : 'translateY(0)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out'
        }}
      >
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
                htmlFor="api-key-name"
                className="mb-2 block text-sm font-medium"
              >
                Name
              </label>
              <input
                id="api-key-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., OpenAI Production Key"
                className={[
                  "w-full rounded-lg border px-4 py-2",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  theme === "light"
                    ? "border-gray-300 bg-white text-gray-900"
                    : "border-gray-700 bg-gray-800 text-gray-100",
                ].join(" ")}
              />
            </div>

            <div>
              <label
                htmlFor="api-key-description"
                className="mb-2 block text-sm font-medium"
              >
                Description
              </label>
              <textarea
                id="api-key-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description or notes about this API key"
                rows={3}
                className={[
                  "w-full rounded-lg border px-4 py-2",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  theme === "light"
                    ? "border-gray-300 bg-white text-gray-900"
                    : "border-gray-700 bg-gray-800 text-gray-100",
                ].join(" ")}
              />
            </div>

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
                disabled={isLoading || !name.trim() || !apiKey.trim()}
                className={[
                  "flex items-center gap-2 rounded-lg px-4 py-2",
                  "font-medium transition-colors",
                  "bg-blue-600 text-white hover:bg-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                <Save className="h-4 w-4" />
                {isLoading ? "Saving..." : "Save API Key"}
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

        {/* Saved API Keys Table */}
        {apiKeys.length > 0 && (
          <div
            className={[
              "mt-6 rounded-lg border",
              theme === "light"
                ? "border-gray-200 bg-white"
                : "border-gray-800 bg-gray-900",
            ].join(" ")}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">Saved API Keys</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead
                  className={
                    theme === "light"
                      ? "bg-gray-50 border-b border-gray-200"
                      : "bg-gray-800 border-b border-gray-700"
                  }
                >
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      API Key
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Created At
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => (
                    <tr
                      key={key.id}
                      className={
                        theme === "light"
                          ? "border-b border-gray-200 hover:bg-gray-50"
                          : "border-b border-gray-800 hover:bg-gray-800"
                      }
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {key.name}
                      </td>
                      <td
                        className={[
                          "px-4 py-3 text-sm",
                          theme === "light"
                            ? "text-gray-600"
                            : "text-gray-400",
                        ].join(" ")}
                      >
                        {key.description || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <code
                            className={[
                              "text-xs",
                              theme === "light"
                                ? "text-gray-700"
                                : "text-gray-300",
                            ].join(" ")}
                          >
                            {showKeys[key.id]
                              ? key.apiKey
                              : "•".repeat(32)}
                          </code>
                          <button
                            type="button"
                            onClick={() => toggleShowKey(key.id)}
                            className={[
                              "rounded p-1 transition-colors",
                              theme === "light"
                                ? "hover:bg-gray-100"
                                : "hover:bg-gray-700",
                            ].join(" ")}
                            aria-label={
                              showKeys[key.id]
                                ? "Hide API key"
                                : "Show API key"
                            }
                          >
                            {showKeys[key.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td
                        className={[
                          "px-4 py-3 text-sm",
                          theme === "light"
                            ? "text-gray-600"
                            : "text-gray-400",
                        ].join(" ")}
                      >
                        {key.createdAt
                          ? new Date(key.createdAt * 1000).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(key.id)}
                          className={[
                            "rounded p-2 transition-colors",
                            theme === "light"
                              ? "text-red-600 hover:bg-red-50"
                              : "text-red-400 hover:bg-red-950",
                          ].join(" ")}
                          aria-label="Delete API key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

