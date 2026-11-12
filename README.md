# 👾 Monsteraunt

A cooperative restaurant for two little friends. **Phase 3** includes a complete two-player strawberry pizza loop: welcome Bubbles, send the order, add ingredients, cook, deliver, serve, and earn shared stars and coins. It now adds generated Bubbles artwork, illustrated rooms, animated reactions, original synthesized sounds, spoken guidance and shared hugs. More content and persistent progress are planned for later phases.

## Run locally

Use Node.js 22+ and npm:

```sh
npm install
npm run dev
```

Open http://localhost:5173. Vite serves the client on port 5173 and proxies Socket.IO to the Node server on port 3001. Both listen on all network interfaces. Stop both with Ctrl+C.

## Two players

1. In tab one, choose Raelyn and Dining room, then Create Restaurant.
2. Note the five-character restaurant code shown above the game.
3. Open a **fresh tab** at http://localhost:5173 (do not duplicate an existing tab, which can copy its session storage).
4. Choose Cooper and Kitchen, enter the code and tap Join. Names and roles are independent; either child can choose either role.
5. Once both players are connected, the dining player taps **Open restaurant**. Either player can bounce Bubbles while waiting in the lobby.
6. Dining: tap the visiting monster or **Welcome**. Drag the glowing menu card from the counter onto the monster; it opens the menu, reads it for about three seconds (timed by the server, so a refresh does not interrupt it) and sets it back down. Then tap **Send order**. A missed drop returns the menu with a gentle hint. Each visit brings one of five monsters (Bubbles, Mo, Fizz, Gloop or Puff), never the same one twice in a row.
7. Kitchen: drag each glowing ingredient onto the pizza: **dough → tomato sauce → cheese → strawberry**. The pizza changes after each server-approved drop. Tapping an ingredient does not add it; missed drops return to the tray. Lemons and chocolate chip cookies give a gentle, funny hint and leave the pizza unchanged.
8. Kitchen: tap **Into the oven**, wait about two seconds, then **Send to your friend**. Cooking never burns or times out.
9. Dining: tap the delivered pizza or **Serve Bubbles**. Both screens receive **3 stars and 5 coins**. Tap **Next hungry visit** to repeat.
10. While waiting, tap the visiting monster, pop bubbles, or tap Pip the chef in the kitchen for local effects. These do not change orders or rewards.
11. Tap **♥** on either screen: hearts appear locally immediately and on your friend’s screen after server confirmation. Hugs work in the lobby and every order phase; the button rests for 2.5 seconds between hugs. They do not change orders or rewards.
12. Tap **🔊** to repeat your role’s current instruction. The glowing action also receives sparkles, including in quiet mode.
13. Open **Parent** to enable quiet mode, switch spoken guidance on/off, or change volume. These preferences stay on this browser, independently of the other player. Audio wakes after a tap; narration depends on browser voice support.
14. Refresh a tab or temporarily disconnect its network, including during cooking. Its private session token restores the same player, role, current order and rewards. Disconnected slots are reserved for ten minutes. Leave releases a slot immediately. The remaining player can finish their role’s actions and keep playing with local effects while waiting.

Session tokens live in tab-specific sessionStorage and are never part of the room code. A room code lets someone join an unoccupied slot; it cannot take over an existing player. Avoid sharing room codes publicly. A link ending in `?room=CODE` still pre-fills the code box.

## Two phones on your Wi-Fi

Find your computer’s LAN address (for example `192.168.1.25`). Open `http://192.168.1.25:5173` on both phones on the same network. Allow incoming connections through the computer firewall if prompted. Create the room on one phone and type its code on the other. The frontend uses its own origin; no backend address needs configuring.

## Phase 3 playtest

- Complete a pizza with both tabs. Listen for ingredient notes, the oven, ready chime, serving bell, a little celebration tune, chewing and a silly burp. Sound effects are generated locally, with no downloaded audio samples.
- On each device, tap a game picture once to unlock audio. Confirm spoken prompts describe dragging the next ingredient and the appropriate job. Tap 🔊 to repeat a prompt. Narration does not repeat on routine snapshots or hugs.
- Send hugs in the lobby, while preparing, during cooking, and after serving. Both screens should show hearts; rapid taps should not flood the other screen. A hug should not interrupt a cooking or celebration animation.
- Enable quiet mode and finish another pizza using glowing pictures. Confirm sound and voices stop, and that the setting survives refreshing that browser. Restore sound and try a hug. Test volume zero and narration off separately.
- Refresh during cooking or celebration; game state and rewards should recover correctly. A reconnect does not replay old hugs or completed celebrations.
- Check portrait layout on two actual phones, including the safe area, voice availability and device volume. Safari artwork/layout and the parent dialog have been inspected; real-device audio playback still needs a listening check.

## Checks and production

```sh
npm test
npm run lint
npm run build
npm start
```

After building, `npm start` serves the built client and Socket.IO from port 3001 (override with `PORT`). For remote testing, deploy this single Node process behind an HTTPS reverse proxy or a Node hosting service with managed TLS and WebSocket support. Forward both ordinary HTTP and `/socket.io` to the same server. Use a single instance: rooms are in memory. Do not expose the development server to the internet. Room state resets on server restart; persistence is deliberately deferred.

## Layout and decisions

- `client/src/scenes`: separate dining and kitchen Phaser scenes with common scene controls.
- `client/src/data/assets.js`: centralized image manifest and preload helper with a procedural character fallback.
- `client/src/entities`: generated character integration, Pip the chef sprite (`chef.js`), layered pizza drawing and room illustrations.
- `artwork/svg`: editable sources for Pip's sprite sheet and the back and front layers of both rooms. Run `npm run art` (headless Chrome; set `CHROME` if it is not in the macOS default location) to re-export the PNGs in `client/public/assets`.
- `client/src/animations/effects.js`: reusable pulse, wiggle, curved flight, particles and monster reactions. Eye-only blinks run at gentle randomized intervals; monsters stay still while idle.
- `client/src/managers`: original Web Audio effects, gesture activation, narration and parent audio settings.
- `artwork/README.md`: generated artwork provenance and exact prompt.
- `client/src/networking`: same-origin Socket.IO connection and acknowledged requests.
- `server/src/rooms.js`: authoritative membership, roles, deduplicated actions, reconnect expiry and sanitized snapshots.
- `server/src/game/restaurant.js`: legal order transitions, ingredient validation, server-clock cooking, and fixed reward allocation.
- `server/src/app.js`: Express, socket validation, request limits and effects broadcast only within the member’s room.
- `shared`: event contract, roles, dimensions, reconnect policy, recipe definitions and the monster customer list (`monsters.js`).
- `tests`: room invariants, gameplay validation and Socket.IO integration of the full pizza loop, cooking reconnect and room isolation; hug authorization/cooldown and audio activation/muting/voice guidance.

Clients request actions; the server alone updates orders, selected ingredients, cooking status, shared rewards and the bounce count. Every gameplay action after opening includes the current order ID to reject stale taps. Roles come from membership, never from the action payload. Hugs use a validated `HUG` action on the same contract, a separate per-player 2.5-second cooldown and a room-scoped effect. They do not publish redundant state snapshots. The sender renders a local hug immediately and ignores its server echo; everyone else renders only the authorized effect. Hug cooldowns survive reconnection on the server. Clients render authoritative snapshots and animate lightweight effects. An action ID prevents repeat processing within a bounded 2,048-action window. Actions are limited to one bounce per player per 500ms, and sockets to 30 requests per ten seconds. Rooms are capped at 1,000. These are development safeguards, not a complete production abuse system.

The game uses Phaser’s Canvas renderer with a modest 30 fps timer loop (avoiding a stalled animation-frame loop observed in Safari during local testing), portrait FIT scaling, large tap targets and no time pressure or punishment. Menu reading and the short oven animation are paced by the server clock, independent of animation completion. Closing or refreshing a tab cannot strand a cooking order. A served order becomes complete immediately, so interrupted celebration animations cannot lose or duplicate rewards. The next visit starts only when dining taps the door button. Identical snapshots do not restart tweens or narration. Sound preferences are local; game progress remains authoritative on the server.

Order lifecycle: `CUSTOMER_ARRIVED → CUSTOMER_SEATED → READING_MENU → READY_TO_ORDER → ORDER_SENT → PREPARING → COOKING → READY_TO_DELIVER → DELIVERED → COMPLETE`. Eating and celebration are presentation effects over the completed state. One active order and one fixed recipe keep this milestone simple.

The bundled Bubbles image is generated artwork; backgrounds and food are drawn locally, and no external fonts are needed. Both children can bounce while waiting for their friend; opening requires both players. All current progress is in memory and is lost if the server restarts or the room expires. Build tooling, Phaser and game code are all JavaScript.

## Next milestone

Phase 4: additional monsters, pizza combinations, cupcakes and ice cream, followed by the first configurable cooperative special event. Review Phase 3 on two phones before proceeding. Persistence and unlocks belong to Phase 5.
