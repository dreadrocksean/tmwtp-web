// Run with: npm test
//
// Uses the Node test runner and Node's native type stripping, so this repo
// gains a test suite without gaining a dependency — it has two lockfiles
// (package-lock.json and yarn.lock, both tracked), and adding a devDependency
// would update one and leave the other to drift.
//
// These mirror src/utils/soundGovernor.test.ts in the TellMeWhatToPlay client.
// The two governors enforce different halves of the same rules, so the numbers
// have to agree; if you change one table, this is what tells you.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSoundBoard,
  GAME_CUE_IDS,
  SOUND_LIST,
  isFanSoundId,
  isGameCue,
  pickNextVariant,
} from './soundFx.ts';
import {
  createRoomGovernor,
  resolvePlaying,
  SOUND_KIND,
  ruleFor,
  type SoundBlockReason,
  type SoundDecision,
  ARTIST_SIGNAL_STALE_MS,
  CONFIRM_FRESH_MS,
} from './soundGovernor.ts';

const T0 = 1_700_000_000_000;
const at = (nowMs: number, playing: boolean | null = null) => ({ nowMs, playing });

// Narrows a decision to the blocked case so the reason can be read. Asserting
// it here rather than in each test keeps a typo'd id — which would pass as
// `ok` — from quietly reading as "no reason given".
const reasonOf = (d: SoundDecision): SoundBlockReason => {
  assert.equal(d.ok, false, 'expected this to be blocked');
  return (d as Extract<SoundDecision, { ok: false }>).reason;
};

describe('crowd noise is exempt', () => {
  test('the room may mash applause without limit', () => {
    const g = createRoomGovernor();
    for (let i = 0; i < 40; i += 1) {
      assert.equal(g.tryPlay('applause', at(T0 + i * 10)).ok, true, `tap ${i}`);
    }
  });

  test('and a different crowd sound does not trip a budget', () => {
    const g = createRoomGovernor();
    g.tryPlay('applause', at(T0));
    assert.equal(g.tryPlay('cheers', at(T0 + 1)).ok, true);
  });
});

describe('the density brake', () => {
  test('blocks a different phrase that no per-sound rule would stop', () => {
    // The failure per-sound cooldowns cannot catch: twenty fans each firing a
    // DIFFERENT phrase once breaks no per-sound rule and still sounds like a
    // cartoon.
    const g = createRoomGovernor();
    assert.equal(g.tryPlay('we-love-you-landon', at(T0)).ok, true);
    assert.deepEqual(g.tryPlay('we-love-you-guys', at(T0 + 2000)), {
      ok: false,
      reason: 'budget',
      retryInMs: 18_000,
    });
    assert.equal(g.tryPlay('we-love-you-guys', at(T0 + 20_000)).ok, true);
  });

  test('keeps hits apart even when they are different hits', () => {
    const g = createRoomGovernor();
    g.tryPlay('thunder', at(T0));
    assert.equal(g.tryPlay('fog-horn', at(T0 + 500)).ok, false);
    assert.equal(g.tryPlay('fog-horn', at(T0 + 2500)).ok, true);
  });
});

describe('shared clocks and lifetime caps', () => {
  test('the same hit cannot repeat inside its cooldown', () => {
    const g = createRoomGovernor();
    g.tryPlay('thunder', at(T0));
    assert.equal(g.tryPlay('thunder', at(T0 + 1000)).ok, false);
  });

  test('a per-user cooldown is the phone’s job, not the board’s', () => {
    // crowd is scope 'user'; the board must not re-enforce it.
    const g = createRoomGovernor();
    g.tryPlay('applause', at(T0));
    assert.equal(g.tryPlay('applause', at(T0 + 1)).ok, true);
  });

  test('shh is spent after two and stays spent', () => {
    const g = createRoomGovernor();
    assert.equal(g.tryPlay('shh', at(T0)).ok, true);
    assert.equal(g.tryPlay('shh', at(T0 + 60_000)).ok, true);
    assert.equal(reasonOf(g.tryPlay('shh', at(T0 + 600_000))), 'spent');
  });

  test('a new show gets its caps back', () => {
    const g = createRoomGovernor();
    g.tryPlay('shh', at(T0));
    g.tryPlay('shh', at(T0 + 60_000));
    g.reset();
    assert.equal(g.tryPlay('shh', at(T0 + 120_000)).ok, true);
  });
});

describe('presets', () => {
  test('dueling pianos lifts the phrase cap, because heckling is the format', () => {
    const g = createRoomGovernor('dueling-pianos');
    for (let i = 0; i < 8; i += 1) {
      assert.equal(
        g.tryPlay('we-love-you-landon', at(T0 + i * 60_000)).ok,
        true,
        `chant ${i}`
      );
    }
  });

  test('a listening room holds hits until a gap', () => {
    const g = createRoomGovernor('listening-room');
    assert.equal(reasonOf(g.check('thunder', at(T0, true))), 'when');
    assert.equal(g.check('thunder', at(T0, false)).ok, true);
  });

  test('a sound override survives the loosest preset', () => {
    // shh is self-defeating when mashed wherever it is played.
    const g = createRoomGovernor('dueling-pianos');
    g.tryPlay('shh', at(T0));
    g.tryPlay('shh', at(T0 + 60_000));
    assert.equal(reasonOf(g.tryPlay('shh', at(T0 + 120_000))), 'spent');
  });

  test('switching preset mid-show takes effect', () => {
    const g = createRoomGovernor();
    assert.equal(g.check('thunder', at(T0, true)).ok, true);
    g.setPreset('listening-room');
    assert.equal(reasonOf(g.check('thunder', at(T0, true))), 'when');
  });
});

describe('check() is free', () => {
  test('does not consume the budget it reports on', () => {
    const g = createRoomGovernor();
    for (let i = 0; i < 10; i += 1) assert.equal(g.check('thunder', at(T0)).ok, true);
    assert.equal(g.tryPlay('thunder', at(T0)).ok, true);
  });
});

describe('resolvePlaying', () => {
  test('believes the artist over a fan who says otherwise', () => {
    assert.equal(
      resolvePlaying(
        { artistPlaying: { on: false, atMs: T0 }, playConfirmAtMs: T0 + 1000 },
        T0 + 2000
      ),
      false
    );
  });

  test('falls through once the artist signal goes stale', () => {
    assert.equal(
      resolvePlaying({ artistPlaying: { on: true, atMs: T0 } }, T0 + ARTIST_SIGNAL_STALE_MS + 1),
      null
    );
  });

  test('takes a recent fan confirmation as playing', () => {
    assert.equal(resolvePlaying({ playConfirmAtMs: T0 }, T0 + 1000), true);
    assert.equal(resolvePlaying({ playConfirmAtMs: T0 }, T0 + CONFIRM_FRESH_MS + 1), null);
  });

  test('takes a crowd on one song’s lyrics as playing', () => {
    assert.equal(resolvePlaying({ lyricsPresenceCount: 3 }, T0), true);
    assert.equal(resolvePlaying({ lyricsPresenceCount: 2 }, T0), null);
  });

  test('unknown never blocks', () => {
    assert.equal(resolvePlaying({}, T0), null);
    const g = createRoomGovernor('listening-room');
    assert.equal(g.check('thunder', at(T0, null)).ok, true);
  });
});


// Hecklers are the first kind to actually use the when-gate, so the gate and
// the kind are tested together. Numbers must match the client suite's
// 'hecklers wait for a gap' block.
describe('hecklers', () => {
  test('wait for a gap, and run out eventually but not after two', () => {
    const g = createRoomGovernor();
    assert.equal(reasonOf(g.check('freebird', at(T0, true))), 'when');
    for (let i = 0; i < 6; i += 1) {
      assert.equal(g.tryPlay('freebird', at(T0 + i * 200_000, false)).ok, true);
    }
    assert.equal(
      reasonOf(g.tryPlay('freebird', at(T0 + 7 * 200_000, false))),
      'spent'
    );
  });

  test('still fire when nobody knows whether a song is on', () => {
    const g = createRoomGovernor();
    assert.equal(g.tryPlay('freebird', at(T0, null)).ok, true);
  });

  test('stop a second heckler riding in behind the first', () => {
    // Different sound, so no per-sound cooldown applies — the kind budget is
    // the only thing between one gag and a comedy club.
    const g = createRoomGovernor();
    assert.equal(g.tryPlay('freebird', at(T0, false)).ok, true);
    assert.deepEqual(g.tryPlay('boo', at(T0 + 1000, false)), {
      ok: false,
      reason: 'budget',
      retryInMs: 24_000,
    });
    assert.equal(g.tryPlay('boo', at(T0 + 25_000, false)).ok, true);
  });

  test('dueling pianos heckles over the playing, uncapped', () => {
    const g = createRoomGovernor('dueling-pianos');
    for (let i = 0; i < 5; i += 1) {
      assert.equal(g.tryPlay('freebird', at(T0 + i * 30_000, true)).ok, true);
    }
  });

  test('a listening room gets exactly one all night', () => {
    const g = createRoomGovernor('listening-room');
    assert.equal(g.tryPlay('freebird', at(T0, false)).ok, true);
    assert.equal(
      reasonOf(g.tryPlay('freebird', at(T0 + 600_000, false))),
      'spent'
    );
  });
});

// Rain is the only bed with no `url`, so a typo in its spec would show up as
// silence at a gig rather than as a build error.
describe('rain', () => {
  test('is an ambience bed the board knows how to render', () => {
    const rain = SOUND_LIST.find((s) => s.id === 'rain');
    assert.ok(rain, 'rain missing from the catalogue');
    assert.equal(rain.bed, true);
    assert.equal(SOUND_KIND.rain, 'ambience');
  });

  test('shares the ambience clock rather than getting its own', () => {
    const g = createRoomGovernor();
    assert.equal(g.tryPlay('rain', at(T0)).ok, true);
    assert.equal(reasonOf(g.tryPlay('surf', at(T0 + 1000))), 'budget');
  });
});


// A button is a FAMILY and a press picks a take. The shift that skips the
// previous pick is the one line in the engine that can be wrong without
// anybody hearing it: drop a take out of the rotation and the board still
// sounds fine, just less varied than it is supposed to be.
describe('variant picker', () => {
  test('a family of one always plays its only take', () => {
    for (const last of [undefined, 0]) {
      assert.equal(pickNextVariant(last, 1, () => 0.99), 0);
    }
  });

  test('never repeats the previous take', () => {
    for (let count = 2; count <= 6; count += 1) {
      for (let last = 0; last < count; last += 1) {
        for (let r = 0; r < 100; r += 1) {
          const i = pickNextVariant(last, count, () => r / 100);
          assert.notEqual(i, last, `count=${count} last=${last} r=${r}`);
          assert.ok(i >= 0 && i < count, `out of range: ${i}`);
        }
      }
    }
  });

  test('can still reach every other take', () => {
    // The off-by-one this guards: a shift applied on the wrong side of the
    // comparison excludes an index permanently rather than just the last one.
    const count = 4;
    for (let last = 0; last < count; last += 1) {
      const seen = new Set<number>();
      for (let r = 0; r < 1000; r += 1) {
        seen.add(pickNextVariant(last, count, () => r / 1000));
      }
      const expected = [0, 1, 2, 3].filter((i) => i !== last);
      assert.deepEqual([...seen].sort(), expected, `last=${last}`);
    }
  });

  test('with no history every take is reachable', () => {
    const seen = new Set<number>();
    for (let r = 0; r < 1000; r += 1) {
      seen.add(pickNextVariant(undefined, 3, () => r / 1000));
    }
    assert.deepEqual([...seen].sort(), [0, 1, 2]);
  });

  test('a random() of almost 1 stays in range', () => {
    // Math.random() is [0,1), but a stubbed or patched rand is not always, and
    // an index one past the end is a silent no-op play rather than a throw.
    assert.ok(pickNextVariant(undefined, 4, () => 0.9999999) < 4);
    assert.ok(pickNextVariant(2, 4, () => 0.9999999) < 4);
  });

  test('draws uniformly over the takes it is allowed', () => {
    const count = 4;
    const last = 1;
    const counts = [0, 0, 0, 0];
    for (let r = 0; r < 300; r += 1) {
      counts[pickNextVariant(last, count, () => r / 300)] += 1;
    }
    assert.equal(counts[last], 0);
    for (const i of [0, 2, 3]) {
      assert.equal(counts[i], 100, `index ${i} got ${counts[i]}`);
    }
  });
});

// The manifest is generated from whatever is in public/sfx, so these assert
// the WIRING rather than the contents — a family that loses its files should
// fail here, not at a gig.
describe('sound families', () => {
  test('cheers has grown into a real family', () => {
    const cheers = SOUND_LIST.find((s) => s.id === 'cheers');
    assert.ok(cheers);
    assert.ok(cheers.variants > 1, `expected >1 take, got ${cheers.variants}`);
  });

  test('every button has at least one take or a synth to fall back on', () => {
    const dead = SOUND_LIST.filter((s) => s.variants === 0).map((s) => s.id);
    assert.deepEqual(dead, [], `buttons with nothing to play: ${dead}`);
  });

  test('the new ids are wired to the board', () => {
    for (const id of ['battle', 'explosion', 'rain']) {
      const entry = SOUND_LIST.find((s) => s.id === id);
      assert.ok(entry, `${id} missing from SOUND_LIST`);
      assert.ok(entry.variants >= 1, `${id} has no takes`);
    }
    assert.equal(SOUND_KIND.explosion, 'hit');
    assert.equal(SOUND_KIND.battle, 'ambience');
  });
});

// The game's own voice. A fanfare means "somebody won" and a sparkle means
// "here is the answer", so unlike every other sound on the board these two
// make a CLAIM — which is exactly why no fan may fire them.
describe('game cues', () => {
  test('every cue can actually make a noise', () => {
    for (const id of GAME_CUE_IDS) {
      const entry = SOUND_LIST.find((s) => s.id === id);
      assert.ok(entry, `${id} missing from SOUND_LIST`);
      assert.ok(entry.variants >= 1, `${id} has nothing to play`);
    }
  });

  test('no fan can fire one, however the request is shaped', () => {
    for (const id of GAME_CUE_IDS) {
      assert.equal(isFanSoundId(id), false, `${id} is fan-playable`);
    }
  });

  // GongSong's gong, which has two constraints the other cues do not.
  test('the gong is one file, not a family', () => {
    // The engine picks from a family at random. A second gong*.m4a would make
    // a branded moment play a different gong sometimes, which is the one
    // thing a signature sound must never do.
    const entry = SOUND_LIST.find((s) => s.id === 'gong');
    assert.ok(entry, 'gong missing from SOUND_LIST');
    assert.equal(entry.variants, 1, 'gong must be exactly one sample');
  });

  test('the gong outlasts its own decay before it can ring again', () => {
    // A gong rings for five or six seconds. On the `hit` default of 6s a
    // second one could start under the first, which does not read as mud --
    // it reads as a second song being gonged, which is a lie.
    assert.ok(
      ruleFor('gong').cooldownMs > 6000,
      'gong cooldown must clear its own decay'
    );
  });

  test('the reference tone is not mistaken for a game cue', () => {
    assert.equal(isFanSoundId('test'), false);
    assert.equal(isGameCue('test'), false);
  });

  test('every ordinary effect is still fan-playable', () => {
    const blocked = SOUND_LIST.filter(
      (s) => s.id !== 'test' && !isGameCue(s.id) && !isFanSoundId(s.id)
    ).map((s) => s.id);
    assert.deepEqual(blocked, [], `unexpectedly blocked: ${blocked}`);
  });
});

// The board stopped making noise mid-gig, and refreshing never brought it
// back — only closing the page and typing the URL again did. Three faults
// compounded, and these pin the two that were testable without a browser.
describe('a board that fails to arm can try again', () => {
  // Minimal stand-ins. The real ones live in the browser; what is under test
  // is the engine's own bookkeeping when they misbehave.
  const withFakeAudio = async (
    makeContext: () => unknown,
    fn: (board: ReturnType<typeof createSoundBoard>) => Promise<void>
  ) => {
    const g = globalThis as Record<string, unknown>;
    const saved = { AudioContext: g.AudioContext, OfflineAudioContext: g.OfflineAudioContext, window: g.window };
    g.AudioContext = makeContext;
    g.OfflineAudioContext = undefined;
    g.window = g;
    try {
      await fn(createSoundBoard());
    } finally {
      g.AudioContext = saved.AudioContext;
      g.OfflineAudioContext = saved.OfflineAudioContext;
      g.window = saved.window;
    }
  };

  test('an unlock that throws reports failure rather than rejecting', async () => {
    await withFakeAudio(
      function () {
        throw new Error('too many audio contexts');
      },
      async (board) => {
        // The bug: this rejected, nothing caught it, and the board sat on
        // "locked" with no way back.
        await assert.doesNotReject(() => board.unlock());
        assert.equal(await board.unlock(), false);
        assert.equal(board.isReady(), false);
      }
    );
  });

  test('a failed attempt does not poison every attempt after it', async () => {
    let attempts = 0;
    await withFakeAudio(
      function () {
        attempts += 1;
        throw new Error('nope');
      },
      async (board) => {
        await board.unlock();
        await board.unlock();
        await board.unlock();
        // Each press is a real retry. The cached failed render used to make
        // every attempt after the first a no-op that returned the same
        // failure without trying anything.
        assert.equal(attempts, 3, `expected 3 real attempts, got ${attempts}`);
      }
    );
  });
});

// Three mechanisms were each producing what looked like a one-voice board, and
// only one of them was the voice count. Adrian, 2026-11-18: "someone pressing
// rain while its still playing from someone else's previous press should
// smoothly just overlap making sound keep goin on."
//
// A browser is the only place to HEAR this, so what is under test is the
// bookkeeping it rests on: who gets refused, and what level each run is handed.
describe('a bed press during that bed extends it', () => {
  const SAMPLE_RATE = 44100;
  // Short takes, so a retirement scheduled against a tail fade can be
  // observed inside a test rather than thirty seconds after it.
  const TAKE_S = 0.6;
  // What the engine picks for a take this short: min(BED_TAIL_FADE_S, len/3).
  const TAIL_S = TAKE_S / 3;

  const makeParam = () => {
    const log: string[] = [];
    const p = {
      value: 1,
      log,
      setValueAtTime(v: number, t: number) {
        log.push(`set ${v.toFixed(4)}@${t.toFixed(3)}`);
        p.value = v;
        return p;
      },
      linearRampToValueAtTime(v: number, t: number) {
        log.push(`ramp ${v.toFixed(4)}@${t.toFixed(3)}`);
        p.value = v;
        return p;
      },
      cancelScheduledValues() {
        log.push('cancel');
        return p;
      },
    };
    return p;
  };

  // Every gain node the engine creates, in creation order. A bed makes two
  // of them, trim first and level second, and the split is the whole reason a
  // bed can overlap itself: the trim node holds a tail fade scheduled once
  // and never touched again, while the level node is cancelled and re-ramped
  // every time a run arrives or leaves. On one node those jobs collide.
  //
  // So the run just started owns the LAST node created. Identifying it by its
  // schedule instead would miss the newest run, which has nothing to share
  // with yet and so has never been cancelled.
  type FakeGain = { gain: ReturnType<typeof makeParam> };
  // Why the sound was refused. lastDecision() is null until something has
  // been decided, which is never the case where this is used.
  const refusedFor = (board: ReturnType<typeof createSoundBoard>) => {
    const decided = board.lastDecision();
    assert.ok(decided && !decided.ok, 'expected a refusal, got none');
    return decided.reason;
  };

  const levelOf = (gains: FakeGain[]) => {
    const node = gains[gains.length - 1];
    assert.ok(node, 'no gain node was created');
    return node;
  };

  const armBoard = async (
    fn: (
      board: ReturnType<typeof createSoundBoard>,
      gains: FakeGain[]
    ) => Promise<void>
  ) => {
    const gains: FakeGain[] = [];
    const take = () => {
      const data = new Float32Array(Math.round(TAKE_S * SAMPLE_RATE)).fill(0.3);
      return {
        duration: TAKE_S,
        length: data.length,
        sampleRate: SAMPLE_RATE,
        numberOfChannels: 1,
        getChannelData: () => data,
      };
    };
    const context = {
      state: 'running',
      destination: {},
      currentTime: 0,
      createGain() {
        const node = { gain: makeParam(), connect: () => undefined };
        gains.push(node);
        return node;
      },
      createBufferSource: () => ({
        buffer: null,
        onended: null,
        connect: () => undefined,
        start: () => undefined,
        stop: () => undefined,
        addEventListener: () => undefined,
      }),
      resume: async () => undefined,
      close: async () => undefined,
      decodeAudioData: async () => take(),
    };

    const g = globalThis as Record<string, unknown>;
    const saved = {
      AudioContext: g.AudioContext,
      OfflineAudioContext: g.OfflineAudioContext,
      window: g.window,
      fetch: g.fetch,
      error: console.error,
    };
    g.AudioContext = function () {
      return context;
    };
    // Present, so renderAll gets past its guard, and useless, so the handful
    // of synthesized sounds are skipped. The engine catches that per sound
    // and logs it, which is the only reason console.error is held down here.
    g.OfflineAudioContext = function () {
      throw new Error('no synth under test');
    };
    g.window = g;
    g.fetch = async () => ({ arrayBuffer: async () => new ArrayBuffer(8) });
    console.error = () => undefined;
    try {
      const board = createSoundBoard();
      assert.equal(await board.unlock(), true, 'board failed to arm');
      await fn(board, gains);
    } finally {
      g.AudioContext = saved.AudioContext;
      g.OfflineAudioContext = saved.OfflineAudioContext;
      g.window = saved.window;
      g.fetch = saved.fetch;
      console.error = saved.error;
    }
  };

  test('a second press is a sustain, not an arrival', async () => {
    await armBoard(async (board) => {
      // Ambience carries an 8s room cooldown AND an 8s density budget. Both
      // were written about a texture arriving, and both used to refuse this.
      assert.equal(board.play('rain'), true, 'first rain');
      assert.equal(board.play('rain'), true, 'rain during rain');
      assert.equal(board.play('rain'), true, 'and again');
    });
  });

  test('a DIFFERENT bed is still an arrival, still budgeted', async () => {
    await armBoard(async (board) => {
      board.play('rain');
      assert.equal(board.play('surf'), false);
      assert.equal(refusedFor(board), 'budget');
    });
  });

  test('with nothing of it left running it is an arrival again', async () => {
    await armBoard(async (board) => {
      board.play('rain');
      // Past the take and its tail, so every run has retired.
      await new Promise((r) => setTimeout(r, TAKE_S * 1000 + 200));
      assert.equal(board.play('rain'), false);
      assert.equal(refusedFor(board), 'cooldown');
    });
  });

  test('the runs of one bed share one level', async () => {
    await armBoard(async (board, gains) => {
      board.play('rain');
      const first = levelOf(gains);
      // Alone, it gets the whole level.
      assert.equal(first.gain.log[0], 'set 1.0000@0.000');

      board.play('rain');
      const second = levelOf(gains);
      // Handed down as the second arrives -- 1/sqrt(2). Ramped, because a
      // step in the level of a long wash is audible as a click.
      assert.ok(
        first.gain.log.some((e) => e.startsWith('ramp 0.7071')),
        first.gain.log.join(' | ')
      );
      // And the newcomer opens AT its share rather than ramping down from
      // full, which would put a bump at the front of every overlap.
      assert.equal(second.gain.log[0], 'set 0.7071@0.000');
    });
  });

  test('equal power: ten runs sum to where one run sat', async () => {
    await armBoard(async (board, gains) => {
      const runs: FakeGain[] = [];
      for (let i = 0; i < 10; i += 1) {
        assert.equal(board.play('rain'), true, `rain ${i + 1}`);
        runs.push(levelOf(gains));
      }
      // The point of 1/sqrt(n): ten rains are as loud as one rain, so the
      // press buys duration rather than volume. Anything else and a fan
      // holding the weather open is leaning on the fader.
      const power = runs.reduce((sum, r) => sum + r.gain.value ** 2, 0);
      assert.ok(
        Math.abs(power - 1) < 1e-9,
        `ten runs should sum to unit power, got ${power}`
      );
      assert.equal(runs[9].gain.log[0], 'set 0.3162@0.000');
    });
  });

  test('ten of the same sound is the ceiling, and only for that sound', async () => {
    await armBoard(async (board) => {
      let through = 0;
      for (let i = 0; i < 30; i += 1) if (board.play('rain')) through += 1;
      assert.equal(through, 10);
      assert.equal(refusedFor(board), 'voices');
      // The cap is per id. A global one would have let rain starve the room.
      assert.equal(board.play('applause'), true);
    });
  });

  test('a retiring run hands its share back as its own fade begins', async () => {
    await armBoard(async (board, gains) => {
      board.play('rain');
      board.play('rain');
      // Both takes are the same length here, so the first one in is the first
      // one out and the second is what is left to come back up.
      const survivor = levelOf(gains);
      // Retirement is scheduled for (take - tail), so the two slopes cross.
      // Waiting for `ended` would put a 3dB dip and then a quarter-second
      // swell where a seamless hand-off belongs.
      await new Promise((r) => setTimeout(r, (TAKE_S - TAIL_S) * 1000 + 150));
      const back = survivor.gain.log.filter((e) => e.startsWith('ramp 1.0000'));
      assert.equal(back.length, 1, survivor.gain.log.join(' | '));
      // Over the DEPARTING run's own fade, not the shorter arrival crossfade:
      // that is what makes the sum hold instead of dipping.
      assert.equal(back[0], `ramp 1.0000@${TAIL_S.toFixed(3)}`);
    });
  });
});
