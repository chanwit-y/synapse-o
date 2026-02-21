/**
 * @file page.tsx
 * @description Import path explorer — renders a searchable tree view of file
 * import relationships from import_path.json.
 */
import ImportPathTreeView, {
  type ImportPathEntry,
} from "@/app/lib/components/ImportPathTreeView";
import importPathData from "@/import_path.json";

export default function ImportPathPage() {
  return (
    <main className="flex-1 overflow-hidden flex flex-col h-full animate-fade-in">
      <div className="px-6 py-4 shrink-0 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-semibold">Import Path</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Browse file import relationships across the project.
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <ImportPathTreeView data={importPathData as ImportPathEntry[]} />
      </div>
    </main>
  );
}
