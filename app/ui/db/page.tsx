'use client'
/**
 * @file page.tsx
 * @description Client component with buttons to test database connections and create device/collection resources.
 */

import { createCollection, testConnection } from "@/app/lib/db";
import { createDevice } from "./action";

export default function DbPage() {

	return (<div className="flex flex-col gap-4">
		<button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={() => createDevice()}>Create Device</button>
		<button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={() => testConnection()}>Test Connection</button>
		<button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={() => createCollection()}>Create Collection</button>
	</div>)
}