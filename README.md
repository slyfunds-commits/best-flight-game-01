# best-flight-game-01

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/slyfunds-commits/best-flight-game-01/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/slyfunds-commits/best-flight-game-01/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Last Light Mail** — a bush pilot's mail run across a golden-hour archipelago. Fly the rings, mind the wind, land soft. The weather forecast is the game, and cargo weight is the handling: each leg opens with a named wind you must crab into, and a heavy crate physically retunes the aircraft — sluggish climb, wide turns, a longer landing roll. Seven legs, from the First Light tutorial to the timed Dusk Finale and the seeded daily run, with a full-screen delivery logbook at the end of every leg.

## Run it

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080
```

W/S throttle · A/D bank · ↑/↓ pitch · F flaps · C camera · P pause · M mute. No build step, no network — every file the game loads lives under `game/`, with three.js vendored at `game/vendor/three.module.min.js`. The flight model is pure math in `game/src/flight.js` and is unit-tested in Node; the autopilot (`?auto=1`) flies the same physics a player flies.

---

<sub>Entered on [make.fun](https://make.fun/?ref=t2zg4r38&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
