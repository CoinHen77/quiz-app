# InnoQuiz — Game Show '78 Implementation Guide

This is a handoff brief for implementing the **Game Show '78** visual direction across the existing `coinhen77/quiz-app` Next.js codebase.

The design reference lives in `Quiz App.html` (open the canvas, focus the `04 · Game Show '78` artboard). All visual values below are pulled from `game-show.jsx` and the host avatar in `hosts.jsx`.

---

## 0. Scope

Rebrand from **QuizBlitz** → **InnoQuiz**. Restyle every existing screen with the Game Show '78 system. The state machines, Socket.IO events, Firestore models, and routing all stay exactly the same — only presentational JSX changes.

Files you'll touch:

- `app/layout.tsx` — fonts
- `app/globals.css` — tokens, keyframes, helpers
- `app/page.tsx` — landing / join
- `app/host/page.tsx` — host quiz list
- `app/host/login/page.tsx` — host login
- `app/host/edit/[quizId]/page.tsx` — quiz editor
- `app/host/play/[quizId]/host-client.tsx` — host's live game (5 phases)
- `app/play/[roomCode]/player-client.tsx` — player's mobile game (6 phases)
- `components/HostAvatar.tsx` *(new)*
- `components/gameshow/*` *(new — shared chrome)*

---

## 1. Design tokens

Add to `app/globals.css` (above the Tailwind directives):

```css
:root {
  --gs-brown:  #3a1f0a;
  --gs-orange: #f56b1f;
  --gs-teal:   #2ec4b6;
  --gs-gold:   #ffd23f;
  --gs-cream:  #f7e9c4;
  --gs-pink:   #c44b6a;     /* 4th answer color */
  --gs-bg:     #3a1f0a;     /* same as brown */

  --gs-shadow-block: 6px 6px 0 var(--gs-brown);
  --gs-shadow-block-sm: 4px 4px 0 var(--gs-brown);
  --gs-shadow-block-lg: 8px 8px 0 var(--gs-brown);

  --gs-border: 5px solid var(--gs-brown);
  --gs-border-inner-cream: inset 0 0 0 3px var(--gs-cream);
  --gs-border-inner-gold:  inset 0 0 0 3px var(--gs-gold);
}

body { background: var(--gs-bg); color: var(--gs-cream); }
```

### Tailwind config (`tailwind.config.ts`)

```ts
extend: {
  colors: {
    gs: {
      brown: '#3a1f0a', orange: '#f56b1f', teal: '#2ec4b6',
      gold: '#ffd23f', cream: '#f7e9c4', pink: '#c44b6a',
    },
  },
  fontFamily: {
    bungee: ['var(--font-bungee)', 'Impact', 'sans-serif'],
    inter:  ['var(--font-inter)', 'system-ui', 'sans-serif'],
  },
  boxShadow: {
    'gs-block':    '6px 6px 0 #3a1f0a',
    'gs-block-sm': '4px 4px 0 #3a1f0a',
    'gs-block-lg': '8px 8px 0 #3a1f0a',
  },
}
```

### Fonts in `app/layout.tsx`

```ts
import { Bungee, Inter } from 'next/font/google'
const bungee = Bungee({ weight: '400', subsets: ['latin'], variable: '--font-bungee' })
const inter  = Inter({ subsets: ['latin'], variable: '--font-inter' })

// <html className={`${bungee.variable} ${inter.variable}`}>
```

Use `font-bungee` for headings, scores, labels, and stat chips. Use `font-inter` for question body text and any plain prose.

---

## 2. Shared chrome components (`components/gameshow/`)

Create these once; reuse everywhere.

### `Bulbs.tsx`

Animated marquee bulb row.

```tsx
export function Bulbs({ count = 20, color = '#ffd23f' }: { count?: number; color?: string }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-full animate-gs-bulb"
          style={{
            background: `radial-gradient(circle at 30% 30%, #fff, ${color})`,
            boxShadow: `0 0 8px ${color}aa`,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  )
}
```

Add to `globals.css`:

```css
@keyframes gs-bulb { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
.animate-gs-bulb { animation: gs-bulb 1.4s steps(2) infinite; }

@keyframes gs-pop {
  0%   { transform: scale(0.5) rotate(-4deg); opacity: 0; }
  60%  { transform: scale(1.15) rotate(-4deg); }
  100% { transform: scale(1) rotate(-4deg); opacity: 1; }
}
.animate-gs-pop { animation: gs-pop 0.35s ease-out; }
```

### `Sunburst.tsx`

Background that goes on most screens.

```tsx
export function Sunburst() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'repeating-conic-gradient(from 0deg at 50% 50%, #f56b1f22 0deg, #f56b1f22 8deg, transparent 8deg, transparent 16deg)',
        opacity: 0.7,
      }}
    />
  )
}
```

### `CarpetStripe.tsx`

```tsx
export function CarpetStripe() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
      style={{
        background:
          'repeating-linear-gradient(135deg, #f56b1f 0 20px, #ffd23f 20px 40px, #2ec4b6 40px 60px, #3a1f0a 60px 80px)',
        opacity: 0.55,
      }}
    />
  )
}
```

### `Logo.tsx`

```tsx
export function Logo({ size = 80 }: { size?: number }) {
  return (
    <div
      className="font-bungee text-gs-orange"
      style={{
        fontSize: size,
        lineHeight: 0.9,
        letterSpacing: '0.04em',
        WebkitTextStroke: '3px #3a1f0a',
        textShadow: '0 6px 0 #3a1f0a, 4px 10px 0 #2ec4b6',
        paintOrder: 'stroke fill',
        transform: 'skewX(-6deg)',
      }}
    >
      INNOQUIZ
    </div>
  )
}
```

### `Panel.tsx`

The cream/orange bordered card with offset shadow. Used everywhere.

```tsx
export function Panel({
  variant = 'cream',
  className = '',
  children,
}: {
  variant?: 'cream' | 'stage' | 'orange' | 'teal' | 'gold'
  className?: string
  children: React.ReactNode
}) {
  const variants = {
    cream:  'bg-gs-cream text-gs-brown shadow-[inset_0_0_0_3px_#ffd23f,6px_6px_0_#3a1f0a]',
    stage:  'text-gs-cream shadow-[inset_0_0_0_3px_#3a1f0a,6px_6px_0_#3a1f0a]',
    orange: 'bg-gs-orange text-gs-cream shadow-[inset_0_0_0_3px_#f7e9c4,6px_6px_0_#3a1f0a]',
    teal:   'bg-gs-teal text-gs-cream shadow-[inset_0_0_0_3px_#f7e9c4,6px_6px_0_#3a1f0a]',
    gold:   'bg-gs-gold text-gs-brown shadow-[inset_0_0_0_3px_#3a1f0a,6px_6px_0_#3a1f0a]',
  }
  const stageBg =
    variant === 'stage'
      ? { background: 'radial-gradient(ellipse at 50% 20%, #f56b1f, #3a1f0a)' }
      : undefined
  return (
    <div
      className={`relative border-[5px] border-gs-brown rounded-xl ${variants[variant]} ${className}`}
      style={stageBg}
    >
      {children}
    </div>
  )
}
```

### `BlockButton.tsx`

The chunky offset-shadow button used for primary actions.

```tsx
export function BlockButton({
  children,
  variant = 'gold',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'gold' | 'orange' | 'teal' }) {
  const variants = {
    gold:   'bg-gradient-to-b from-gs-gold to-gs-orange text-gs-brown',
    orange: 'bg-gs-orange text-gs-cream',
    teal:   'bg-gs-teal text-gs-cream',
  }
  return (
    <button
      {...props}
      className={`font-bungee tracking-[0.2em] border-4 border-gs-brown shadow-gs-block px-8 py-4 transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
```

---

## 3. Host avatars (`components/HostAvatar.tsx`)

Copy the `HostAvatar` component verbatim from `hosts.jsx` (in this project), convert to TSX, type the props:

```ts
type Reaction = 'idle' | 'correct' | 'wrong' | 'thinking' | 'cheer'
type Who = 'mira' | 'theo'
interface HostAvatarProps { who: Who; reaction?: Reaction; size?: number; bobOffset?: number }
```

Used **only on host screens**. Player phones never render it (no room).

---

## 4. Answer button styling

In both player and host clients, replace the existing `OPTION_STYLES` array:

```ts
const OPTION_STYLES = [
  { bg: 'bg-gs-orange', text: 'text-gs-cream', shape: '▲' },
  { bg: 'bg-gs-teal',   text: 'text-gs-cream', shape: '◆' },
  { bg: 'bg-gs-gold',   text: 'text-gs-brown', shape: '●' },
  { bg: 'bg-gs-pink',   text: 'text-gs-cream', shape: '■' },
] as const
```

Button shell (apply to every answer tile across host + player):

```tsx
<button
  className={`${style.bg} ${style.text} font-bungee border-[5px] border-gs-brown rounded-xl
              shadow-[inset_0_0_0_3px_#f7e9c4,6px_6px_0_#3a1f0a]
              px-7 flex items-center gap-5 text-left
              active:translate-x-1 active:translate-y-1
              transition-transform`}
>
  <span className="w-15 h-15 rounded-full bg-gs-cream text-gs-brown
                   border-4 border-gs-brown flex items-center justify-center
                   text-2xl flex-shrink-0">{LABEL}</span>
  <span className="text-2xl leading-tight flex-1 tracking-wide">{opt}</span>
</button>
```

Reveal-correct: swap bg to `bg-gs-gold`, add `-translate-x-[3px] -translate-y-[3px] -rotate-1` and a star `★` glyph at the right.

Reveal-wrong: bg `bg-[#5a2a1a]`, opacity 100; non-correct dimmed siblings get `opacity-45`.

---

## 5. Screen-by-screen instructions

### `app/page.tsx` — landing / join

- Background: dark brown, `<Sunburst />`, `<CarpetStripe />` at bottom.
- Center column: kicker chip ("★ STEP RIGHT UP ★" in gold on brown), `<Logo size={120} />`, then the join form.
- Inputs: cream bg, brown 4px border, `shadow-gs-block-sm`, font-bungee for the room code (track-widest, uppercase), inter for the name input.
- Submit: `<BlockButton variant="gold">JOIN GAME</BlockButton>`.
- Host link: small gold underline below.

### `app/host/login/page.tsx`

Same skeleton as join page — kicker, Logo, single password input, gold BlockButton "ENTER".

### `app/host/page.tsx` — host quiz list

- Header: `<Logo size={48} />` left, "Sign out" gold-underline link right.
- "Your Quizzes" h2 in font-bungee gold, with two-tone underline.
- Each quiz card = `<Panel variant="cream">` with title (bungee brown), question count chip (teal/cream), and "PLAY" + "EDIT" BlockButtons.
- "+ NEW QUIZ" = full-width dashed-border cream Panel with gold plus.

### `app/host/edit/[quizId]/page.tsx` — quiz editor

Mostly utility, lighter treatment to keep editing fast:

- Top bar: Logo + "Back" + "Save" BlockButton (gold).
- Title input: cream Panel, large font-bungee.
- Each question row: cream Panel; question text input (font-inter), 4 answer rows each with the option color swatch on the left + radio for "correct" + delete button.
- "+ Add question" = dashed cream Panel, full width.

### `app/host/play/[quizId]/host-client.tsx` — host live screens (the showcase)

This is where the design shines. Reference `game-show.jsx` directly for the question + reveal layouts.

#### `pre`
Center: small `<Logo />`, quiz title in cream font-bungee, question count in gold. Single `<BlockButton variant="gold">CREATE ROOM</BlockButton>`. Sunburst behind.

#### `lobby`
- Top: `<Bulbs count={36} />` row.
- Center: cream Panel containing label "ROOM CODE" (brown bungee tracking), then giant orange WebkitTextStroke chrome digits sized ~140px. Beneath: "Players go to innoquiz.app and enter this code" in inter brown.
- Below: header row "PLAYERS · {n} JOINED" + gold BlockButton "START GAME".
- Players list: 2-column grid of teal Panels with cream player names in font-bungee.
- Bottom bulbs row.

#### `question`
Use the exact 2×2 layout from `game-show.jsx`:
- Hosts panel (top-left, stage gradient): `<HostAvatar who="mira"/>` + `<HostAvatar who="theo"/>`, each with their bungee gold name plate, marquee bulbs top + bottom.
- Question panel (top-right, cream): "ROUND X OF Y" teal chip, "{CATEGORY}" orange chip, question text in font-bungee brown, score in chrome orange ($X,XXX), 5-dot question progress on the right.
- Answers (bottom 2×2): the colored buttons spec'd in §4.
- Add a small "ANSWERS RECEIVED" pill above the reveal action: cream Panel showing `{answersReceived} / {players.length}`.
- "REVEAL ANSWER" BlockButton bottom-right of the question panel.

#### `reveal`
- Hosts panel: same, but with `reaction={isCorrect ? 'cheer' : 'wrong'}` driven by `revealData.correctIndex`.
- Question panel: same question text, dimmed slightly.
- Bottom: bar chart. Each row = full-width cream Panel containing color swatch + shape, option label, count number, and a horizontal bar fill in that option's color. Correct row gets `border-gs-gold` outer ring + glowing `box-shadow: 0 0 24px #ffd23f` + a tilted gold star badge `★` floating top-right.
- Tilted gold "★ +500! ★" pop badge over the hosts (use `animate-gs-pop`).
- Top-5 leaderboard inline (cream Panel, gold ranks, brown names, orange scores in font-bungee).
- "NEXT ROUND ▶" / "FINAL RESULTS ▶" BlockButton bottom-right.

#### `game-over`
- Big "FINAL RESULTS" headline in chrome bungee.
- 1st-2nd-3rd podium: 3 vertical cream Panels with heights 36/24/16 rem, gold/teal/orange backgrounds, dollar-sign scores.
- Below podium: full standings as cream Panels in a list, ranks shown in gold bungee circles.
- Bottom: gold BlockButton "BACK TO QUIZZES".

### `app/play/[roomCode]/player-client.tsx` — player mobile (390 wide)

Same brown bg + sunburst, but no `<HostAvatar>` (saves vertical space).

#### `name-form`
Small Logo, "JOINING ROOM" label, big bungee gold room code, name input in cream Panel, gold BlockButton "JOIN".

#### `lobby`
"ROOM" small label + bungee gold code, then cream Panel "Waiting for the host..." with a list of cream/teal player chips. Animated bulb row above and below.

#### `question`
- Top: thick brown timer bar that drains, color-shifts orange→pink at 5s. Then a row: "Q3/10" left, big bungee timer right.
- Center: question text in cream Panel (font-inter, brown text).
- Bottom: 2×2 grid of large color-coded shape buttons (the §4 spec), each min-h `90px`, just shape + label, no question text on the buttons (Kahoot-style — text was on host screen).

#### `answer-locked`
Big "ANSWER LOCKED!" bungee gold, the picked option color tile centered with its shape, "Waiting for host..." in cream below.

#### `reveal`
- Big pop badge: `<div className="animate-gs-pop">` with "★ CORRECT ★" gold or "OH NO!" pink.
- Question text Panel.
- 4 option rows with bar chart (same as host reveal but compact).
- Personal rank chip (gold bungee).
- "WAITING FOR NEXT QUESTION..." cream small text.

#### `game-over`
"GAME OVER!" bungee chrome headline, big gold rank #X for the player, $score in orange chrome, top-10 standings as cream Panels, gold BlockButton "PLAY AGAIN".

---

## 6. Implementation order

Do them in this order so you can demo progress at each step:

1. **Tokens, fonts, globals.css.** Verify with a dummy "Hello" using font-bungee on the brown background.
2. **Shared chrome components** (`components/gameshow/*`).
3. **`HostAvatar.tsx`** — port from `hosts.jsx`.
4. **`app/page.tsx`** — quickest visual win, validates fonts + tokens.
5. **Host live screens** in this order: `lobby` → `question` → `reveal` → `game-over` → `pre`.
6. **Player live screens**: `name-form` → `lobby` → `question` → `answer-locked` → `reveal` → `game-over`.
7. **`app/host/page.tsx`** + **login**.
8. **Quiz editor** (lighter touch, save for last).

Don't change `app/host/play/[quizId]/page.tsx` or any actions/server files — the data flow is fine.

---

## 7. Things to keep / not touch

- The phase state machines in `host-client.tsx` and `player-client.tsx`. The phase names (`pre`, `lobby`, `question`, `reveal`, `answer-locked`, `game-over`) and their transitions stay identical.
- All Socket.IO event names in `server/src/index.ts`.
- The `Quiz` / `Question` / `Standing` types from `lib/firebase.ts` and `lib/quizzes.ts`.
- Timer logic — keep the `Date.now() - startTimestamp` countdown.
- Existing animation classnames if you're already using `animate-fade-in`, `animate-slide-up`, `animate-pop-in` — they still fit. You're adding `animate-gs-bulb` and `animate-gs-pop` on top.

---

## 8. Acceptance checklist

- [ ] All routes render without console errors on localhost
- [ ] `npm run build` succeeds (no TS errors in new components)
- [ ] Two browsers (one host /host/play, one player /play/CODE) can complete a full game end-to-end
- [ ] Question 1 → reveal → next question advances on host screen and player phone in lockstep
- [ ] Final podium shows top 3 and full standings on both views
- [ ] No remaining "QuizBlitz" / "Quizline" strings anywhere (`grep -ri "quizblitz\|quizline" .`)
- [ ] Mobile view (390px wide Chrome devtools) is usable — no horizontal scroll, tap targets ≥ 44px
- [ ] Bungee + Inter both load via next/font and render on first paint (no FOUT)

---

## 9. Reference files in this project — READ THESE FIRST

Open `Quiz App.html` in this project. **Sections 05, 06, and 07** of the canvas are the pixel-accurate source of truth for every screen you need to build. When the prose in §5 above conflicts with the artboards, **the artboards win**.

| Source file | What's in it | What it maps to |
|---|---|---|
| `gs-kit.jsx` | All design tokens (`GS.*` color constants, `FONT.*`), shared chrome (`Bulbs`, `Sunburst`, `CarpetStripe`, `Logo`, `Panel`, `BlockButton`, `Chip`, `ChromeNumber`, `OptionButton`, `ScreenFrame`), and global keyframes (`GSKeyframes`). | Port to `app/globals.css` + `components/gameshow/*.tsx` |
| `hosts.jsx` | `HostAvatar` SVG component (Mira & Theo) with reactions: `idle` / `correct` / `wrong` / `thinking` / `cheer`. | Copy verbatim into `components/HostAvatar.tsx` |
| `host-screens.jsx` | All 5 host phases: `HostPre`, `HostLobby`, `HostQuestion`, `HostReveal`, `HostGameOver`. | `app/host/play/[quizId]/host-client.tsx` |
| `player-screens.jsx` | All 6 player phases: `PlayerNameForm`, `PlayerLobby`, `PlayerQuestion`, `PlayerLocked`, `PlayerReveal` (takes `correct` prop), `PlayerGameOver` + `MobileFrame` wrapper. | `app/play/[roomCode]/player-client.tsx` |
| `admin-screens.jsx` | `AdminLogin`, `AdminQuizList`, `AdminEditor`. | `app/host/login/page.tsx`, `app/host/page.tsx`, `app/host/edit/[quizId]/page.tsx` |
| `game-show.jsx` | The original interactive flow (intro + question + reveal). Use only as a secondary reference — the screens in `host-screens.jsx` supersede it. | — |

### Recommended workflow

For each screen you implement:

1. Open the matching artboard in `Quiz App.html` (focus mode → fullscreen).
2. Open the matching JSX file in this project.
3. Lift values **directly** — exact pixel sizes, colors (use the `GS.*` constants), `boxShadow` strings, `letterSpacing`, `fontSize`, panel paddings, grid templates.
4. Convert inline-style objects to Tailwind classes only where it's a clean win (colors via `tailwind.config.ts`, simple sizing). Keep `style={{}}` for the chrome-text shadow stacks, repeating-conic-gradient sunburst, and `boxShadow: 'inset 0 0 0 3px ..., 6px 6px 0 ...'` patterns — those don't translate cleanly to utilities and the inline form is more readable.
5. Replace sample data (`SAMPLE_PLAYERS` from `host-screens.jsx`, `QUIZ_QUESTIONS` from `quiz-data.js`) with real Firestore/socket data.
6. Wire up the existing event handlers and state machine — **do not** change phase names or socket events.

### Sample data placeholders to swap

When porting, these constants in the JSX become real props/state:

- `SAMPLE_PLAYERS` → `players` from socket
- `QUIZ_QUESTIONS[2]` → `currentQuestion` from server tick
- Hardcoded `'7K2P'` room code → `roomCode` from URL/server
- Hardcoded `'AVERY'` player name → `playerName` from join form
- Hardcoded scores (`$2,400`) → `players.find(p => p.id === self).score`
- Hardcoded counts (`6 / 10`, `4 / 6 answered`) → derived from server state
- `phase = 'question' | 'reveal'` prop on `HostQuestion` → drive from server phase

### Acceptance, revisited

The visual implementation is correct when, with sample data, your localhost screens look indistinguishable from the corresponding artboard at 100% zoom. Use side-by-side screenshots to verify before merging.
