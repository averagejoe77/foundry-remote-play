export interface ServerProfile {
	id: string;
	name: string;
	foundryUrl: string;
	username: string;
	password?: string;
	isActive?: boolean;
}

export const ProfileStore = {
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
	}
};
