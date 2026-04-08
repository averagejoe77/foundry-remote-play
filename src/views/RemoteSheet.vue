<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { FoundrySocket, ServerProfile } from '../api/foundry-socket';

const route = useRoute();
const router = useRouter();

const webviewRef = ref<any>(null);
const profile = ref<ServerProfile | null>(null);

const isLoadingSheet = ref(true);

const wittyMessages = [
    "Fixing all the dice for nat 20s...",
    "Gathering bribes for the DM...",
    "Summoning the party...",
    "Filtering out the loot goblins...",
    "Jailing the murderhobos...",
    "Summoning creatures from the astral plane...",
    "Checking for traps...",
    "Rolling for initiative..."
];
const loadingText = ref(wittyMessages[Math.floor(Math.random() * wittyMessages.length)]);

onMounted(async () => {
  const profileId = route.query.profileId as string;
  if (!profileId) {
    router.push('/');
    return;
  }
  
  const profiles = await FoundrySocket.getProfiles();
  profile.value = profiles.find(p => p.id === profileId) || null;
  
  if (!profile.value) {
    router.push('/');
    return;
  }
});

const onWebviewConsole = (e: any) => {
    // Intercept our special completion message from the injected Foundry logic
    if (e.message && e.message.includes("WRAPPER_SHEET_READY")) {
        console.log("App: Character sheet rendered, hiding overlay!");
        isLoadingSheet.value = false;
        return;
    }
    // Proxy other webview console messages to our local Vue devtools for easy debugging
    console.log(`[Foundry Webview] ${e.message || e}`);
};

const onWebviewDomReady = () => {
    console.log("App: onWebviewDomReady triggered. webviewRef defined?", !!webviewRef.value);
    if (!webviewRef.value) return;

    const webview = webviewRef.value;

    // Inject CSS to hide unwanted Foundry elements
    const cssToInject = `
        body.game #ui-left, 
        body.game #ui-top, 
        body.game #ui-bottom, 
        body.game #ui-middle,
        body.game #board, 
        body.game #pause, 
        body.game #chat-popout,
        body.game #navigation,
        body.game #players,
        body.game #hotbar,
        body.game #controls,
        ol#notifications,
        body.game #sidebar nav menu li:not(:first-child):not(:nth-child(11)) {
            display: none !important;
            pointer-events: none !important;
            opacity: 0 !important;
        }

        /* Suppress Foundry's "resolution too small" warning */
        body.game #notifications .notification.warning {
            display: none !important;
        }

        /* Force the character sheet rigidly to the window constraints */
        body.game .app.window-app.sheet.actor {
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            border-radius: 0 !important;
        }
        /* Hide the native close/minimize buttons so the user uses our Back button */
        body.game .app.window-app.sheet.actor .window-header .close,
        body.game .app.window-app.sheet.actor .window-header .minimize {
            display: none !important;
        }
    `;
    
    console.log("App: Injecting CSS...");
    webview.insertCSS(cssToInject);

    const usernameSafe = JSON.stringify(profile.value?.username || '');
    const passwordSafe = JSON.stringify(profile.value?.password || '');

    console.log("App: Injecting JS payload...");
    const jsToInject = `
        console.log("--- WRAPPER INJECTION START ---");
        console.log("Current URL: ", window.location.href);
        console.log("Body classes: ", document.body.className);
        
        // Foundry dynamically renders the join page using Javascript after the DOM is ready.
        // We will poll for the element's existence every 250ms until it renders!
        let joinAttempts = 0;
        const joinInterval = setInterval(() => {
            const useridSelect = document.querySelector('select[name="userid"]');
            const passwordInput = document.querySelector('input[name="password"]');
            const joinButton = document.querySelector('button[name="join"]');
            
            if (useridSelect) {
                console.log("Foundry join form detected after " + joinAttempts + " attempts!");
                clearInterval(joinInterval); // Stop polling
                
                const option = Array.from(useridSelect.options).find(opt => opt.text.trim() === ${usernameSafe});
                console.log("Found User Option:", option ? option.value : "None");
                
                if (option) {
                    useridSelect.value = option.value;
                    useridSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    if (passwordInput && ${passwordSafe} !== "") {
                        passwordInput.value = ${passwordSafe};
                        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    
                    // Auto-submit form exactly once values are injected
                    if (joinButton) {
                        console.log("Auto-submitting join form...");
                        setTimeout(() => joinButton.click(), 150);
                    }
                }
            }
            
            joinAttempts++;
            if (joinAttempts > 40) {
                clearInterval(joinInterval); // Give up after 10 seconds
            }
        }, 250);

        if (typeof Hooks !== "undefined") {
            Hooks.once("ready", () => {
                console.log("Wrapper Client: Foundry Ready.");
                if (game.user && game.user.character) {
                    game.user.character.sheet.render(true);
                    
                    Hooks.on("renderActorSheet", (app, html, data) => {
                        if (app.object.id === game.user.character.id) {
                            if (!app._docked) {
                                try { app.maximize(); } catch(e) {}
                            }
                            console.log("WRAPPER_SHEET_READY");
                        }
                    });

                    // activate the first tab
                    const chatTab = document.querySelector('body.game #sidebar nav menu button[data-tab="chat"]');
                    if (chatTab) {
                        chatTab.click();
                    }
                    
                    // Fallback in case it's already rendered somehow
                    setTimeout(() => {
                        console.log("WRAPPER_SHEET_READY");
                    }, 5000);
                } else {
                    // Fallback if no character assigned
                    console.log("WRAPPER_SHEET_READY");
                }
            });
        }

        // Backup execution in case 'ready' fired before we injected
        if (typeof game !== 'undefined' && game.ready) {
            if (game.user && game.user.character) {
                game.user.character.sheet.render(true);
            }
        }
    `;
    webview.executeJavaScript(jsToInject);
};

const goBack = () => {
  router.push('/');
};

const refreshSheet = () => {
  if (webviewRef.value) {
    webviewRef.value.reload();
  }
};
</script>

<template>
  <div class="flex flex-col h-screen w-full bg-slate-900 border-none overflow-hidden">
    <!-- Thin Client Toolbar -->
    <div class="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 justify-between shadow-md z-10 flex-shrink-0">
      <div class="flex items-center gap-3">
        <button @click="goBack" class="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-sm font-medium text-slate-200 transition-colors flex items-center gap-1 shadow-sm active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Back
        </button>
        <div class="flex flex-col">
            <span class="text-slate-100 font-semibold leading-tight tracking-wide">{{ profile ? profile.name : 'Loading Server...' }}</span>
            <span v-if="profile" class="text-[10px] text-teal-400 uppercase tracking-widest">{{ profile.foundryUrl }}</span>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <span class="px-2.5 py-1 rounded bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]"></span>
            Native Client
        </span>
        <button @click="refreshSheet" class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors active:scale-95" title="Reload Connected Server">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        </button>
      </div>
    </div>
    
    <!-- Embedded Foundry Webview -->
    <div class="flex-1 w-full h-full relative bg-slate-950 flex flex-col justify-center items-center">
        <!-- Background Loading State (Before Profile Object Loads) -->
        <div v-if="!profile" class="flex flex-col items-center gap-3">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
            <p class="text-slate-500 text-sm font-medium">Connecting wrapper...</p>
        </div>
        
        <!-- Native Foundry Loading Overlay Hider -->
        <div v-if="profile && isLoadingSheet" class="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center gap-8 backdrop-blur-xl">
             <div class="relative w-32 h-32 flex items-center justify-center">
                <!-- Outer Pulse -->
                <div class="absolute inset-0 border-[4px] border-teal-500/20 rounded-full animate-ping" style="animation-duration: 2s;"></div>
                <!-- Inner Spin Spinner -->
                <div class="absolute inset-2 border-[4px] border-t-teal-400 border-r-teal-500 border-b-transparent border-l-transparent rounded-full animate-spin glow-ring"></div>
                <div class="absolute inset-4 border-[3px] border-b-emerald-400 border-l-emerald-500 border-t-transparent border-r-transparent rounded-full animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
                <!-- Core Icon -->
                <svg class="w-12 h-12 text-teal-300 drop-shadow-[0_0_10px_rgba(45,212,191,0.8)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 2 22 22 22"></polygon><polygon points="12 2 7 14 17 14"></polygon></svg>
             </div>
             
             <div class="flex flex-col items-center select-none">
                 <h2 class="text-2xl font-bold text-white tracking-widest uppercase drop-shadow-md bg-gradient-to-r from-teal-200 to-emerald-400 bg-clip-text text-transparent">{{ loadingText }}</h2>
                 <p class="text-slate-400 font-mono text-sm mt-3 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700">Connecting to session → <span class="text-teal-400">{{ profile.name }}</span></p>
             </div>
        </div>
        
        <!-- The Magical Webview -->
        <webview 
            v-if="profile"
            ref="webviewRef"
            class="w-full h-full border-none absolute inset-0"
            :src="profile.foundryUrl"
            :partition="'persist:foundry-' + profile.id"
            @dom-ready="onWebviewDomReady"
            @console-message="onWebviewConsole"
            allowpopups
        ></webview>
    </div>
  </div>
</template>
<style scoped>
/* Ensures the webview tag acts like a normal element */
webview {
    display: flex;
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
}
</style>
