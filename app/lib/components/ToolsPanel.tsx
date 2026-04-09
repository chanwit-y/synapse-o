"use client";
/**
 * @file ToolsPanel.tsx
 * @description A tools panel for generating AI-powered test cases from file content, with modal interfaces for editing prompts and creating test case files.
 */

import { useState } from "react";
import { Braces, Clapperboard, Code, FlaskConical } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import type { TreeNode } from "./@types/treeViewTypes";
import CreateTestCaseModal from "./CreateTestCaseModal";
import CodeMappingModal from "./CodeMappingModal";
import TestCaseToolModal from "./TestCaseToolModal";

interface ToolsPanelProps {
  fileId: string;
  fileName: string;
  collectionId: string;
  selectedFilePath: string | null;
  disableScenario?: boolean;
  disableCodebase?: boolean;
  disableTestCase?: boolean;
  onAfterCreateTestCaseFile?: (opts: { node: TreeNode; nodePath: string }) => void;
  onAfterCreateSubFile?: () => void;
  onModalClose?: () => void;
}

export default function ToolsPanel({
  fileId,
  fileName,
  collectionId,
  selectedFilePath,
  disableScenario,
  disableCodebase,
  disableTestCase,
  onAfterCreateTestCaseFile,
  onAfterCreateSubFile,
  onModalClose,
}: ToolsPanelProps) {
  const { theme } = useTheme();
  const [isTestCaseModalOpen, setIsTestCaseModalOpen] = useState(false);
  const [isCodeMappingModalOpen, setIsCodeMappingModalOpen] = useState(false);
  const [isTestCaseToolModalOpen, setIsTestCaseToolModalOpen] = useState(false);

  const handleOpenCodeMapping = () => {
    setIsCodeMappingModalOpen(true);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        E2E Tools
      </div>
      <div className="flex items-center gap-2">
        <div className="group relative">
          <button
            type="button"
            onClick={() => setIsTestCaseModalOpen(true)}
            disabled={disableScenario}
            className={[
              "flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors",
              disableScenario
                ? "opacity-40 cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                : theme === "dark"
                  ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
            aria-label="Scenario"
          >
            <Clapperboard className="h-4 w-4" />
          </button>
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Scenario
          </span>
        </div>
        <div className="group relative">
          <button
            type="button"
            onClick={handleOpenCodeMapping}
            disabled={disableCodebase}
            className={[
              "flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors",
              disableCodebase
                ? "opacity-40 cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                : theme === "dark"
                  ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
            aria-label="Code base indexing"
          >
            <Braces className="h-4 w-4" />
          </button>
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Code base indexing
          </span>
        </div>
        <div className="group relative">
          <button
            type="button"
            onClick={() => setIsTestCaseToolModalOpen(true)}
            disabled={disableTestCase}
            className={[
              "flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors",
              disableTestCase
                ? "opacity-40 cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                : theme === "dark"
                  ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
            aria-label="Test case"
          >
            <FlaskConical className="h-4 w-4" />
          </button>
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Test case
          </span>
        </div>
        <div className="group relative">
          <button
            type="button"
            className={[
              "flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
            aria-label="Create e2e"
          >
            <Code className="h-4 w-4" />
          </button>
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Create e2e
          </span>
        </div>
      </div>

      <CreateTestCaseModal
        isOpen={isTestCaseModalOpen}
        onClose={() => {
          setIsTestCaseModalOpen(false);
          onModalClose?.();
        }}
        fileId={fileId}
        fileName={fileName}
        collectionId={collectionId}
        selectedFilePath={selectedFilePath}
        onAfterCreateTestCaseFile={onAfterCreateTestCaseFile}
        onAfterCreateSubFile={onAfterCreateSubFile}
        onNextStep={handleOpenCodeMapping}
      />

      <CodeMappingModal
        isOpen={isCodeMappingModalOpen}
        onClose={() => {
          setIsCodeMappingModalOpen(false);
          onModalClose?.();
        }}
        fileId={fileId}
        fileName={fileName}
        collectionId={collectionId}
        selectedFilePath={selectedFilePath}
        onAfterCreateSubFile={onAfterCreateSubFile}
        onNextStep={() => {
          setIsCodeMappingModalOpen(false);
          setIsTestCaseToolModalOpen(true);
        }}
      />

      <TestCaseToolModal
        isOpen={isTestCaseToolModalOpen}
        onClose={() => {
          setIsTestCaseToolModalOpen(false);
          onModalClose?.();
        }}
        fileId={fileId}
        fileName={fileName}
        collectionId={collectionId}
        selectedFilePath={selectedFilePath}
        onAfterCreateSubFile={onAfterCreateSubFile}
      />
    </div>
  );
}
