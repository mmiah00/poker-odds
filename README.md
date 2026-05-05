# poker-odds
<img width="2880" height="1728" alt="image" src="https://github.com/user-attachments/assets/5c6877ba-3c68-4192-846d-48630284ae3d" />

# Poker Odds Trainer

A web app for practicing post-flop poker equity estimation. Two hole hands are dealt alongside a three-card flop — pick the hand you think has better odds before the timer runs out.

## How it works

Each round deals two hole hands and a flop (3 community cards). You pick which hand you think is the favorite. After picking, the app reveals the exact win percentage for each hand, the current best hand type, and a visual equity bar showing the split.

If the timer hits zero before you pick, the board stays the same but two new hole hands are dealt.

Equity is calculated exactly — not estimated. The app enumerates all 990 possible turn/river runouts (C(45,2)) and evaluates both hands against each one to produce a precise win percentage.

## Features

- Exact post-flop equity calculation across all runouts
- 30-second countdown timer with visual ring
- Tracks accuracy, rounds played, and current streak
- Same board re-deal on timeout for pattern recognition
- Full hand evaluation: high card through straight flush, including the A-2-3-4-5 wheel

## Tech stack

- React + Vite
- No external dependencies — all poker logic is implemented from scratch

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build and deploy

```bash
npm run build
```

Output goes to `dist/`. Deploy to Vercel, Netlify, or any static host.
