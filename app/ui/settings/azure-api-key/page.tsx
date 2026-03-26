"use client";
/**
 * @file page.tsx
 * @description Settings page for Azure DevOps PAT: input/save PAT and manage saved tokens.
 */

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/app/lib/components/ThemeProvider";
import { Cloud, Save, Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteAzurePat, getAllAzurePats, saveAzurePat } from "./action";
import { useSnackbar } from "@/app/lib/components/Snackbar";
import type { ApiKeyRow } from "@/app/lib/db/repository/api-key";

export default function AzureApiKeySettingsPage() {
	const { theme } = useTheme();
	const { showSnackbar } = useSnackbar();
	const [organization, setOrganization] = useState("banpudev");
	const [pat, setPat] = useState("");
	const [showPat, setShowPat] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [saved, setSaved] = useState<ApiKeyRow[]>([]);
	const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
	const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});

	const parseOrganization = (description: string | null) => {
		if (!description) return "";
		const match = description.match(/org=([^\s]+)/);
		return match?.[1] ?? "";
	};

	const loadSaved = useCallback(async () => {
		setIsLoading(true);
		try {
			const result = await getAllAzurePats();
			if (result.success && result.data) {
				setSaved(result.data);
				// Prefill input with the most recent / first token.
				if (result.data[0]?.apiKey) setPat(result.data[0].apiKey);
				const org = parseOrganization(result.data[0]?.description ?? null);
				if (org) setOrganization(org);
			} else {
				setSaved([]);
			}
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		(async () => {
			await loadSaved();
		})();
	}, [loadSaved]);

	const handleSave = async () => {
		if (!pat.trim()) {
			showSnackbar({ message: "PAT is required", variant: "error" });
			return;
		}
		setIsSaving(true);
		const result = await saveAzurePat(pat, organization);
		if (result.success) {
			showSnackbar({ message: "Azure PAT saved", variant: "success" });
			await loadSaved();
		} else {
			showSnackbar({ message: result.error ?? "Failed to save", variant: "error" });
		}
		setIsSaving(false);
	};

	const handleDelete = async (id: string) => {
		if (isDeleting[id]) return;
		setIsDeleting((prev) => ({ ...prev, [id]: true }));
		try {
			const result = await deleteAzurePat(id);
			if (result.success) {
				showSnackbar({ message: "Azure PAT deleted", variant: "success" });
				await loadSaved();
			} else {
				showSnackbar({ message: result.error ?? "Failed to delete", variant: "error" });
			}
		} finally {
			setIsDeleting((prev) => ({ ...prev, [id]: false }));
		}
	};

	const toggleShowKey = (id: string) => {
		setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const isDark = theme === "dark";
	const inputClass = [
		"w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500",
		isDark ? "border-gray-700 bg-gray-800 text-gray-100" : "border-gray-300 bg-white text-gray-900",
	].join(" ");
	const labelClass = "mb-2 block text-sm font-medium";

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="mx-auto max-w-4xl p-8">
				<div className="mb-8">
					<div className="flex items-center gap-3 mb-2">
						<Cloud className="h-6 w-6" />
						<h1 className="text-3xl font-bold">Azure API Key (PAT)</h1>
					</div>
					<p className={isDark ? "text-gray-400" : "text-gray-600"}>
						Configure your Azure DevOps Personal Access Token (PAT).
					</p>
				</div>

				<div
					className={[
						"rounded-lg border p-6",
						isDark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white",
					].join(" ")}
				>
					<h2 className="text-lg font-semibold mb-4">Azure DevOps PAT</h2>
					{isLoading ? (
						<p className={isDark ? "text-gray-400" : "text-gray-500"}>Loading saved keys…</p>
					) : (
						<div className="space-y-4">
							<div>
								<label htmlFor="azure-org" className={labelClass}>
									Organization
								</label>
								<input
									id="azure-org"
									type="text"
									value={organization}
									onChange={(e) => setOrganization(e.target.value)}
									placeholder="e.g. banpudev"
									className={inputClass}
								/>
							</div>
							<div>
								<label htmlFor="azure-pat" className={labelClass}>
									Personal Access Token (PAT)
								</label>
								<div className="relative">
									<input
										id="azure-pat"
										type={showPat ? "text" : "password"}
										value={pat}
										onChange={(e) => setPat(e.target.value)}
										placeholder="Enter your Azure DevOps PAT"
										className={inputClass + " pr-10"}
									/>
									<button
										type="button"
										onClick={() => setShowPat(!showPat)}
										className={[
											"absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors",
											isDark ? "hover:bg-gray-700" : "hover:bg-gray-100",
										].join(" ")}
										aria-label={showPat ? "Hide PAT" : "Show PAT"}
									>
										{showPat ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
								<p className={["mt-2 text-sm", isDark ? "text-gray-400" : "text-gray-500"].join(" ")}>
									Create a PAT at dev.azure.com → User settings → Personal access tokens. Use
									&quot;Work Items (Read)&quot; scope.
								</p>
							</div>
							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={handleSave}
									disabled={isSaving || !pat.trim()}
									className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Save className="h-4 w-4" />
									{isSaving ? "Saving…" : "Save PAT"}
								</button>
							</div>
						</div>
					)}
				</div>

				<div
					className={[
						"mt-6 rounded-lg border p-6",
						isDark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white",
					].join(" ")}
				>
					<h2 className="text-lg font-semibold mb-4">Saved API Keys</h2>
					{isLoading ? (
						<p className={isDark ? "text-gray-400" : "text-gray-500"}>Loading…</p>
					) : saved.length === 0 ? (
						<p className={isDark ? "text-gray-400" : "text-gray-500"}>No Azure PAT saved yet.</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead
									className={
										isDark
											? "bg-gray-800 border-b border-gray-700"
											: "bg-gray-50 border-b border-gray-200"
									}
								>
									<tr>
										<th className="px-4 py-3 text-left text-sm font-medium">Organization</th>
										<th className="px-4 py-3 text-left text-sm font-medium">API Key</th>
										<th className="px-4 py-3 text-left text-sm font-medium">Created At</th>
										<th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
									</tr>
								</thead>
								<tbody>
									{saved.map((row) => (
										<tr
											key={row.id}
											className={
												isDark
													? "border-b border-gray-800 hover:bg-gray-800/50"
													: "border-b border-gray-100 hover:bg-gray-50"
											}
										>
											<td className="px-4 py-3 text-sm">{parseOrganization(row.description ?? null) || "-"}</td>
											<td className="px-4 py-3 text-sm font-mono">
												<div className="flex items-center gap-2">
													<span>
														{showKeys[row.id] ? row.apiKey : "•".repeat(Math.min(28, row.apiKey.length || 28))}
													</span>
													<button
														type="button"
														onClick={() => toggleShowKey(row.id)}
														className={isDark ? "text-gray-300 hover:text-gray-100" : "text-gray-600 hover:text-gray-900"}
														aria-label={showKeys[row.id] ? "Hide key" : "Show key"}
													>
														{showKeys[row.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
													</button>
												</div>
											</td>
											<td className="px-4 py-3 text-sm">
												{row.createdAt ? new Date(Number(row.createdAt)).toLocaleString() : "-"}
											</td>
											<td className="px-4 py-3 text-right">
												<button
													type="button"
													onClick={() => handleDelete(row.id)}
													disabled={Boolean(isDeleting[row.id])}
													className={[
														"inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
														"bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed",
													].join(" ")}
												>
													<Trash2 className="h-4 w-4" />
													{isDeleting[row.id] ? "Deleting…" : "Delete"}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
