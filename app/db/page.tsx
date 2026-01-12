'use client'

import { createDevice } from "./action";

export default function DbPage() {

	return (<div className="flex flex-col gap-4">
		<button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={() => createDevice()}>Create Device</button>
	</div>)
}