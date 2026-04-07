<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { FoundrySocket, ServerProfile } from '../api/foundry-socket';

const router = useRouter();

const profiles = ref<ServerProfile[]>([]);
const editingId = ref<string | null>(null);
const isLoading = ref(true);

onMounted(async () => {
  await loadProfiles();
  isLoading.value = false;
});

const loadProfiles = async () => {
    profiles.value = await FoundrySocket.getProfiles();
};

const createCampaign = async () => {
    const newId = crypto.randomUUID();
    const newProfile: ServerProfile = {
        id: newId,
        name: "New Campaign",
        foundryUrl: "http://localhost:30000",
        username: "",
        password: ""
    };
    await FoundrySocket.saveProfile(newProfile);
    profiles.value.push(newProfile);
    editingId.value = newId; // instantly enter edit mode
};

const deleteCampaign = async (id: string) => {
    if (confirm("Delete this campaign profile permanently?")) {
        await FoundrySocket.deleteProfile(id);
        await loadProfiles(); // refresh the list
    }
};

const saveProfile = async (profile: ServerProfile) => {
    await FoundrySocket.saveProfile(JSON.parse(JSON.stringify(profile)));
    editingId.value = null; // exit edit mode
    await loadProfiles();   // refresh exact data
};

const connect = (id: string) => {
    router.push(`/remote?profileId=${id}`);
};
</script>

<template>
  <div class="h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans">
    
    <!-- Top Navigation Bar -->
    <header class="w-full bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-md z-10 flex-shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded bg-teal-500 shadow-teal-500/25 shadow-lg flex items-center justify-center">
          <img src="/favicon.png" alt="Logo" class="w-7 h-7" />
        </div>
        <h1 class="text-xl tracking-wide font-semibold bg-gradient-to-r from-teal-400 to-emerald-300 bg-clip-text text-transparent">
          Foundry Remote Play Client
        </h1>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-y-auto p-8 flex flex-col items-center min-h-0 relative">
      
      <div class="w-full max-w-6xl pb-10">
        <div class="flex justify-between items-end mb-8 relative z-10">
          <div>
            <h2 class="text-3xl font-bold text-white mb-2">Campaign Servers</h2>
            <p class="text-slate-400">Launch a remote session or manage your configured game connections.</p>
          </div>
          <button 
            @click="createCampaign"
            class="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-teal-900/50 transition-all font-medium flex items-center gap-2 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Campaign
          </button>
        </div>

        <div v-if="isLoading" class="flex justify-center items-center h-64">
           <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        </div>
        
        <div v-else-if="profiles.length === 0" class="flex flex-col items-center justify-center p-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 border-dashed mt-10">
           <svg class="w-16 h-16 text-slate-600 mb-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
           <h3 class="text-xl font-medium text-slate-300 mb-2">No campaigns found</h3>
           <p class="text-slate-500 text-center max-w-sm">You haven't setup any Foundry servers yet. Click "Add Campaign" to configure your first connection.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div v-for="profile in profiles" :key="profile.id" class="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 flex flex-col min-h-[16rem]">
             
             <!-- Edit Mode -->
             <div v-if="editingId === profile.id" class="p-5 flex flex-col gap-4 flex-1 h-full relative z-20">
                <div class="flex justify-between items-center mb-1">
                    <h3 class="font-bold text-teal-400">Edit Campaign</h3>
                    <button @click="editingId = null" class="text-slate-400 hover:text-white p-1 rounded transition-colors" title="Cancel">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <!-- Form Inputs -->
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Campaign Name</label>
                  <input v-model="profile.name" class="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-teal-500" placeholder="Campaign Name"/>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Server URL</label>
                  <input v-model="profile.foundryUrl" class="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white font-mono focus:outline-none focus:border-teal-500" placeholder="https://game.example.com"/>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">User ID</label>
                    <input v-model="profile.username" class="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white font-mono focus:outline-none focus:border-teal-500" placeholder="Username"/>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Password</label>
                    <input v-model="profile.password" type="password" class="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-teal-500" placeholder="••••••••"/>
                  </div>
                </div>
                
                <div class="flex justify-end gap-2 mt-auto pt-4">
                    <button @click="saveProfile(profile)" class="bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded text-sm font-bold transition-colors w-full shadow-lg shadow-teal-900/50 tracking-wide">SAVE CHANGES</button>
                </div>
             </div>
             
             <!-- View Mode -->
             <div v-else class="flex flex-col flex-1 relative h-full group">
                <!-- Decorative Graphic -->
                <div class="absolute top-0 right-0 p-8 text-slate-700/20 pointer-events-none group-hover:text-teal-900/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="m8 17 4 4 4-4"></path></svg>
                </div>

                <!-- Top Header: Edit / Delete -->
                <div class="flex justify-between items-end p-4 pb-2 relative z-10 w-full mb-2 opacity-100 transition-opacity">
                   <div class="flex gap-2">
                     <button @click="editingId = profile.id" class="bg-slate-700/80 hover:bg-slate-600 hover:text-white text-slate-400 p-1.5 rounded-md border border-slate-600 transition-colors shadow-sm" title="Edit Campaign Settings">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                     </button>
                     <button @click="deleteCampaign(profile.id)" class="bg-slate-700/50 hover:bg-rose-900 text-slate-500 hover:text-rose-200 p-1.5 rounded-md border border-slate-700 hover:border-rose-800 transition-colors shadow-sm" title="Delete Profile">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                     </button>
                   </div>
                </div>

                <!-- Info Block -->
                <div class="flex flex-col px-6 flex-1 relative z-10">
                   <h3 class="text-xl font-bold text-white mb-4 line-clamp-1 w-full">{{ profile.name }}</h3>
                   
                   <div class="w-full flex flex-col gap-3 mt-1 mb-6 text-sm flex-1 relative">
                        <div class="absolute inset-0 bg-slate-900/40 rounded-xl -z-10 border border-slate-700/50"></div>
                        
                        <div class="flex items-center gap-3 px-4 relative pt-4">
                            <span class="text-teal-500 w-4 group-hover:drop-shadow-[0_0_5px_rgba(20,184,166,0.8)] transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            </span>
                            <span class="text-slate-300 font-mono truncate text-[13px]" :title="profile.foundryUrl">{{ profile.foundryUrl || 'Missing URL' }}</span>
                        </div>
                        
                        <div class="flex items-center gap-3 px-4 relative">
                            <span class="text-teal-500 w-4 group-hover:drop-shadow-[0_0_5px_rgba(20,184,166,0.8)] transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            </span>
                            <span class="text-slate-300 truncate text-[13px]">{{ profile.username || 'No Identity Setup' }}</span>
                        </div>
                        
                        <div class="flex items-center gap-3 px-4 relative pb-4">
                            <span class="text-teal-500 w-4 group-hover:drop-shadow-[0_0_5px_rgba(20,184,166,0.8)] transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </span>
                            <span class="text-slate-500 tracking-widest text-lg leading-none mt-1">{{ profile.password ? '••••••••' : '••••••••' }}</span>
                        </div>
                   </div>
                </div>

                <!-- Connect Button Bottom Full Width -->
                <div class="w-full mt-auto relative z-10 px-4 pb-4">
                    <button @click="connect(profile.id)" class="text-teal-50 bg-teal-900/40 hover:bg-teal-500 border border-teal-700/50 hover:border-teal-400 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2 group w-full justify-center active:scale-95">
                        <svg class="w-5 h-5 transition-transform group-hover:scale-110" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        Connect to {{ profile.name }}
                    </button>
               </div>
             </div>

           </div>
        </div>

      </div>
    </main>
  </div>
</template>
