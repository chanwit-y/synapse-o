/**
 * @file page.tsx
 * @description Home page component that displays a welcome message and instructions to navigate the sidebar for accessing different sections.
 */
export default function Home() {
  return (
    <main className="flex-1 overflow-auto p-6 animate-fade-in">
      <h2 className="text-xl font-semibold">Welcome</h2>
      <p className="mt-2 text-sm text-gray-500">
        Pick a section from the sidebar to get started.
      </p>
    </main>
  );
}