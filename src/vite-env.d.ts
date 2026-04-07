/// <reference types="vite/client" />

interface Window {
	ipcRenderer: {
		store: {
			get: (key: string) => Promise<any>;
			set: (key: string, val: any) => Promise<boolean>;
			delete: (key: string) => Promise<boolean>;
			getAll: () => Promise<Record<string, any>>;
		};
		on: (channel: string, listener: (event: any, ...args: any[]) => void) => () => void;
		off: (channel: string, listener: (...args: any[]) => void) => void;
		send: (channel: string, ...args: any[]) => void;
		invoke: (channel: string, ...args: any[]) => Promise<any>;
		fetch: (url: string, options?: any) => Promise<{ ok: boolean, status: number, statusText: string, data: string }>;
	}
}
