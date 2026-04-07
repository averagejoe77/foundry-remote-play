import { io, Socket } from 'socket.io-client';

export interface ServerProfile {
	id: string;
	name: string;
	foundryUrl: string;
	username: string;
	password?: string;
	isActive?: boolean;
}

export const FoundrySocket = {
	socket: null as Socket | null,

	async getProfiles(): Promise<ServerProfile[]> {
		const profiles = await window.ipcRenderer.store.get('relay-profiles');
		return Array.isArray(profiles) ? profiles : [];
	},

	async saveProfile(profile: ServerProfile): Promise<void> {
		const profiles = await this.getProfiles();
		const index = profiles.findIndex(p => p.id === profile.id);
		if (index >= 0) {
			profiles[index] = profile;
		} else {
			profiles.push(profile);
		}
		await window.ipcRenderer.store.set('relay-profiles', profiles);
	},

	async deleteProfile(id: string): Promise<void> {
		const profiles = await this.getProfiles();
		const filtered = profiles.filter(p => p.id !== id);
		await window.ipcRenderer.store.set('relay-profiles', filtered);

		const activeId = await this.getActiveProfileId();
		if (activeId === id) {
			await this.setActiveProfileId(null);
		}
	},

	async getActiveProfileId(): Promise<string | null> {
		const id = await window.ipcRenderer.store.get('active-relay-profile');
		return id || null;
	},

	async setActiveProfileId(id: string | null): Promise<void> {
		await window.ipcRenderer.store.set('active-relay-profile', id);
	},

	async getActiveProfile(): Promise<ServerProfile | null> {
		const activeId = await this.getActiveProfileId();
		if (!activeId) return null;
		const profiles = await this.getProfiles();
		return profiles.find(p => p.id === activeId) || null;
	},

	/**
	 * Authenticate and establish a Socket.io connection using session cookies.
	 */
	async connectSession(profileId: string): Promise<ServerProfile> {
		const profiles = await this.getProfiles();
		const profile = profiles.find(p => p.id === profileId);
		if (!profile) throw new Error("Profile not found.");

		let foundryUrl = profile.foundryUrl;
		if (foundryUrl.endsWith('/')) {
			foundryUrl = foundryUrl.slice(0, -1);
		}

		// 1. Perform HTTP Login to establish shared session cookie in Electron main process
		const authPayload = new URLSearchParams();
		authPayload.append('action', 'join');

		// The user provides their 16-character User ID in the "username" field now.
		authPayload.append('userid', profile.username);
		authPayload.append('password', profile.password || '');

		const loginResp = await window.ipcRenderer.fetch(`${foundryUrl}/join`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: authPayload.toString()
		});

		if (!loginResp.ok && loginResp.status !== 302) {
			throw new Error(`Authentication failed (${loginResp.status})`);
		}

		// At this point, `net.fetch` in electron has saved the standard session cookies.

		// 2. Open socket.io connection
		return new Promise((resolve, reject) => {
			if (this.socket) {
				this.socket.disconnect();
			}

			this.socket = io(foundryUrl, {
				// Using standard polling or websockets, electron session automatically injects cookies
				transports: ['websocket', 'polling'],
			});

			this.socket.on('connect', async () => {
				console.log("Connected to Foundry Socket API");
				profile.isActive = true;
				await this.saveProfile(profile);
				await this.setActiveProfileId(profile.id);
				resolve(profile);
			});

			this.socket.on('connect_error', (err) => {
				console.error("Socket error", err);
				reject(err);
			});
		});
	},

	async disconnectSession(): Promise<void> {
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}
		const activeProfile = await this.getActiveProfile();
		if (activeProfile) {
			activeProfile.isActive = false;
			await this.saveProfile(activeProfile);
			await this.setActiveProfileId(null);
		}
	},

	/**
	 * Listen for arbitrary socket events
	 */
	on(event: string, callback: (data: any) => void) {
		if (!this.socket) {
			console.warn(`Attempted to listen to event ${event} without an active socket.`);
			return;
		}
		this.socket.on(event, callback);
	},

	/**
	 * Send socket events
	 */
	emit(event: string, data: any) {
		if (!this.socket) {
			throw new Error("No active socket connection.");
		}
		this.socket.emit(event, data);
	},

	async getCharacters(): Promise<any[]> {
		if (!this.socket) {
			throw new Error("No active socket connection.");
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.socket?.off('module.character-manager-direct');
				reject(new Error("Timeout waiting for characters."));
			}, 5000);

			// Set up listener for the sync event
			const handler = (msg: any) => {
				if (msg.action === 'characterSync') {
					clearTimeout(timeout);
					this.socket?.off('module.character-manager-direct', handler);
					resolve(msg.data);
				}
			};

			this.socket?.on('module.character-manager-direct', handler);

			// Request characters
			this.socket?.emit('module.character-manager-direct', { action: 'fetchCharacters' });
		});
	}
};
