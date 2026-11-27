# UFO: Flag Ball Survival — Online Multiplayer

This version adds online rooms to the flag-ball game. The server is authoritative: players send movement input and the server simulates balls, bots, and the single UFO.

## Run it on your computer first

1. Install **Node.js 20 or newer** from https://nodejs.org/.
2. Extract this ZIP file.
3. Open a terminal in the extracted folder.
4. Run:
   ```bash
   npm install
   npm start
   ```
5. Open http://localhost:3000 in your browser.
6. Create a room. Friends on the same Wi-Fi can test by opening `http://YOUR-COMPUTER-LAN-IP:3000` and entering the room code.

## Make it playable online from different homes

The game needs to be hosted as a **Node.js web service**, not just uploaded as a static HTML file.

One straightforward option is Render:
1. Create a GitHub account and a new repository.
2. Upload `server.js`, `package.json`, and the `public` folder to the repository.
3. On Render, create a **New Web Service** and connect that repository.
4. Set Build Command to `npm install` and Start Command to `npm start`.
5. Deploy. Open the `https://...onrender.com` address and share it with friends.

The first person creates the room and shares the six-character room code. The room creator presses START GAME. Friends join before the game starts.

## Notes

- Rooms are kept in server memory. If the service restarts, active rooms end.
- This starter server is intended for private games with friends, not a public production service.
- The host controls when the round starts.
- Up to 40 human players can join a room; the game fills remaining places with bot flags up to 40 total.
