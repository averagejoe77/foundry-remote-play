// Add an API endpoint to explicitly expose users to the desktop app.
// Since Foundry v10+, modules can't easily register unauthenticated express routes.
// However, the GM can just grab their User ID from the console.

const MODULE_ID = 'character-manager-direct';
const SOCKET_NAME = `module.${MODULE_ID}`;

Hooks.once('init', () => {
    console.log(`${MODULE_ID} | Initializing Character Manager Direct Sync`);
});

Hooks.once('ready', () => {
    console.log(`${MODULE_ID} | Ready`);
    
    // Register socket listener
    game.socket.on(SOCKET_NAME, (data) => {
        if (!game.user.isGM) return; // Only process requests on the GM client to avoid duplicate processing

        if (data.action === 'fetchCharacters') {
            const characters = getPlayerCharacters();
            
            // Emit the response back over the socket
            game.socket.emit(SOCKET_NAME, {
                action: 'characterSync',
                data: characters
            });
            console.log(`${MODULE_ID} | Broadcasted initial characters payload`);
        }
    });

    // Provide a helper in the console to easily copy the User ID
    console.log(`%cTo connect your external Character Manager app, use this User ID: %c${game.user.id}`, 
        "color: #20b2aa; font-weight: bold; font-size: 14px;", 
        "color: #ffffff; background: #333; padding: 2px 5px; border-radius: 4px; font-family: monospace;"
    );
});

// Broadcast character updates whenever an actor is updated
// This hook fires when ANY actor document updates
Hooks.on('updateActor', (actor, changes, options, userId) => {
    // We only care if it's a character and the GM is doing the broadcasting to prevent duplicate emits
    if (actor.type !== 'character') return;
    if (!game.user.isGM) return;

    const payload = actor.toJSON();

    console.log(`${MODULE_ID} | Broadcasting actor update for ${actor.name}`);
    game.socket.emit(SOCKET_NAME, {
        action: 'actorUpdate',
        data: payload
    });
});

/**
 * Gets all player characters from the world
 */
function getPlayerCharacters() {
    return game.actors.filter(a => a.type === 'character').map(a => a.toJSON());
}
