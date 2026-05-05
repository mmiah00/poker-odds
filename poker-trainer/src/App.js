import { useState, useEffect, useCallback, useRef } from "react";

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['c','d','h','s'];
const RANK_VALUE = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14};
const RANK_DISPLAY = {'T':'10','J':'J','Q':'Q','K':'K','A':'A'};
const SUIT_SYMBOL = {c:'♣',d:'♦',h:'♥',s:'♠'};
const HAND_NAMES = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush'];
const STAGE_NAMES = {3:'The Flop',4:'The Turn',5:'The River'};
const TIMER_MAX = 30;

const cardKey = c => c.rank + c.suit;
const fullDeck = () => RANKS.flatMap(rank => SUITS.map(suit => ({rank, suit})));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function combinations(arr, k) {
  const result = [];
  const combo = new Array(k);
  function rec(start, depth) {
    if (depth === k) { result.push([...combo]); return; }
    for (let i = start; i <= arr.length - k + depth; i++) {
      combo[depth] = arr[i];
      rec(i + 1, depth + 1);
    }
  }
  rec(0, 0);
  return result;
}

function evaluateHand5(cards) {
  const ranks = cards.map(c => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const cnt = {};
  ranks.forEach(r => (cnt[r] = (cnt[r] || 0) + 1));
  const groups = Object.entries(cnt).map(([r, c]) => [Number(r), c]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const counts = groups.map(g => g[1]);
  const byCount = groups.map(g => g[0]);
  const uniq = [...new Set(ranks)].sort((a, b) => b - a);
  let straight = false, strHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) { straight = true; strHigh = uniq[0]; }
    if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) { straight = true; strHigh = 5; }
  }
  if (isFlush && straight) return [8, strHigh];
  if (counts[0] === 4) return [7, byCount[0], byCount[1]];
  if (counts[0] === 3 && counts[1] === 2) return [6, byCount[0], byCount[1]];
  if (isFlush) return [5, ...ranks];
  if (straight) return [4, strHigh];
  if (counts[0] === 3) return [3, byCount[0], byCount[1], byCount[2]];
  if (counts[0] === 2 && counts[1] === 2) return [2, byCount[0], byCount[1], byCount[2]];
  if (counts[0] === 2) return [1, byCount[0], byCount[1], byCount[2], byCount[3]];
  return [0, ...ranks];
}

function compareScore(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i] ?? 0, bi = b[i] ?? 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}

function bestHand(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards];
  if (all.length <= 5) return evaluateHand5(all.length < 5 ? [...all, ...Array(5 - all.length).fill({rank:'2',suit:'c'})] : all);
  const combos = combinations(all, 5);
  let best = null;
  for (const combo of combos) {
    const score = evaluateHand5(combo);
    if (!best || compareScore(score, best) > 0) best = score;
  }
  return best;
}

function calculateEquity(hand1, hand2, community) {
  const used = new Set([...hand1, ...hand2, ...community].map(cardKey));
  const deck = fullDeck().filter(c => !used.has(cardKey(c)));
  const needed = 5 - community.length;
  const runouts = needed === 0 ? [[]] : combinations(deck, needed);
  let w1 = 0, w2 = 0, ties = 0;
  for (const runout of runouts) {
    const board = [...community, ...runout];
    const cmp = compareScore(bestHand(hand1, board), bestHand(hand2, board));
    if (cmp > 0) w1++; else if (cmp < 0) w2++; else ties++;
  }
  const n = runouts.length;
  return { equity1: w1 / n, equity2: w2 / n, tieRate: ties / n };
}

function dealFreshRound() {
  const deck = shuffle(fullDeck());
  const communityCount = 3 + Math.floor(Math.random() * 3);
  return {
    hand1: [deck[0], deck[1]],
    hand2: [deck[2], deck[3]],
    community: deck.slice(4, 4 + communityCount),
  };
}

function dealNewHands(community) {
  const usedKeys = new Set(community.map(cardKey));
  const deck = shuffle(fullDeck().filter(c => !usedKeys.has(cardKey(c))));
  return { hand1: [deck[0], deck[1]], hand2: [deck[2], deck[3]], community };
}

function TimerRing({ timeLeft, max }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = circ * (timeLeft / max);
  const urgent = timeLeft <= 8;
  const color = timeLeft > 15 ? '#c9a84c' : timeLeft > 8 ? '#e08030' : '#d04040';
  return (
    <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0 }}>
      <svg width="70" height="70" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
        <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.5s' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'Georgia, serif', fontWeight: 700,
        fontSize: urgent ? 20 : 18, color,
        animation: urgent ? 'timerFlash 0.7s ease-in-out infinite' : 'none',
      }}>
        {timeLeft}
      </div>
    </div>
  );
}

function PlayingCard({ card, size }) {
  const red = card.suit === 'd' || card.suit === 'h';
  const rankD = RANK_DISPLAY[card.rank] || card.rank;
  const sym = SUIT_SYMBOL[card.suit];
  const color = red ? '#c0392b' : '#1c1c2e';
  const dims = size === 'sm' ? { w: 48, h: 66, fz: 12, symFz: 18 } : { w: 70, h: 98, fz: 16, symFz: 30 };
  return (
    <div style={{
      width: dims.w, height: dims.h, background: '#fdfcf5', borderRadius: 6,
      border: '1px solid #ddd6c0', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', position: 'relative',
      userSelect: 'none', boxShadow: '0 3px 10px rgba(0,0,0,0.55)', flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', top: 3, left: 4, color, fontSize: dims.fz, fontWeight: 700, lineHeight: 1.1, fontFamily: 'Georgia, serif', textAlign: 'center' }}>
        {rankD}<br/><span style={{fontSize: dims.fz * 0.75}}>{sym}</span>
      </div>
      <div style={{ color, fontSize: dims.symFz, lineHeight: 1 }}>{sym}</div>
      <div style={{ position: 'absolute', bottom: 3, right: 4, color, fontSize: dims.fz, fontWeight: 700, lineHeight: 1.1, fontFamily: 'Georgia, serif', textAlign: 'center', transform: 'rotate(180deg)' }}>
        {rankD}<br/><span style={{fontSize: dims.fz * 0.75}}>{sym}</span>
      </div>
    </div>
  );
}

function HandPanel({ cards, label, equity, handName, winner, loser, onClick, revealed }) {
  const borderCol = winner ? '#c9a84c' : loser ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';
  const bgCol = winner ? 'rgba(201,168,76,0.09)' : loser ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.03)';
  return (
    <div onClick={!revealed ? onClick : undefined} style={{
      cursor: revealed ? 'default' : 'pointer', opacity: loser ? 0.42 : 1,
      transition: 'transform 0.25s, opacity 0.4s, border-color 0.2s',
      transform: winner ? 'scale(1.04)' : 'scale(1)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '18px 20px', borderRadius: 13, border: `1.5px solid ${borderCol}`,
      background: bgCol, minWidth: 160, gap: 11,
    }}>
      <div style={{ color: '#c9a84c', fontSize: 10, fontWeight: 600, letterSpacing: 3, fontFamily: "Georgia, serif" }}>{label}</div>
      <div style={{ display: 'flex', gap: 7 }}>
        {cards.map((c, i) => <PlayingCard key={i} card={c} size="md" />)}
      </div>
      {revealed ? (
        <div style={{ textAlign: 'center', minHeight: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <div style={{ color: winner ? '#e8c060' : '#777', fontSize: 26, fontWeight: 700, fontFamily: 'Georgia, serif', lineHeight: 1 }}>
            {(equity * 100).toFixed(1)}%
          </div>
          <div style={{ color: '#7a9a86', fontSize: 11 }}>{handName}</div>
          {winner && <div style={{ color: '#c9a84c', fontSize: 9, letterSpacing: 2, marginTop: 2 }}>▲ AHEAD</div>}
        </div>
      ) : (
        <div style={{ color: '#3a6044', fontSize: 11, letterSpacing: 1 }}>CLICK TO PICK</div>
      )}
    </div>
  );
}

function OddsBar({ equity1, equity2, tieRate }) {
  const pct1 = Math.round(equity1 * 100);
  const pctTie = Math.round(tieRate * 100);
  const pct2 = 100 - pct1 - pctTie;
  return (
    <div style={{ width: '100%', maxWidth: 340, margin: '0 auto' }}>
      <div style={{ height: 7, borderRadius: 4, overflow: 'hidden', display: 'flex', background: '#1a3a26' }}>
        <div style={{ width: `${pct1}%`, background: '#c9a84c', transition: 'width 0.6s ease' }} />
        {pctTie > 0 && <div style={{ width: `${pctTie}%`, background: '#3a5a48' }} />}
        <div style={{ width: `${pct2}%`, background: '#4a7aa6', transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ color: '#c9a84c', fontSize: 11 }}>A {pct1}%</span>
        {pctTie > 0 && <span style={{ color: '#5a7a6a', fontSize: 11 }}>Tie {pctTie}%</span>}
        <span style={{ color: '#5a9ad0', fontSize: 11 }}>{pct2}% B</span>
      </div>
    </div>
  );
}

export default function PokerOddsTrainer() {
  const [round, setRound] = useState(() => dealFreshRound());
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState({ correct: 0, total: 0, streak: 0 });
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIMER_MAX);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    setTimeLeft(TIMER_MAX);
    setTimedOut(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !result && !timedOut) {
      clearInterval(timerRef.current);
      setTimedOut(true);
    }
  }, [timeLeft, result, timedOut]);

  useEffect(() => {
    if (!timedOut) return;
    const t = setTimeout(() => {
      setRound(r => dealNewHands(r.community));
      setSelected(null);
      setResult(null);
      setFeedbackMsg('');
      setTimedOut(false);
      startTimer();
    }, 1400);
    return () => clearTimeout(t);
  }, [timedOut, startTimer]);

  const handlePick = useCallback((picked) => {
    if (result || timedOut) return;
    clearInterval(timerRef.current);
    const { hand1, hand2, community } = round;
    const equity = calculateEquity(hand1, hand2, community);
    const s1 = bestHand(hand1, community);
    const s2 = bestHand(hand2, community);
    let winner;
    if (Math.abs(equity.equity1 - equity.equity2) < 0.001) winner = 'tie';
    else winner = equity.equity1 > equity.equity2 ? 1 : 2;
    const correct = winner === 'tie' || picked === winner;
    setSelected(picked);
    setResult({ ...equity, winner, hand1Name: HAND_NAMES[s1[0]], hand2Name: HAND_NAMES[s2[0]] });
    setStats(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1, streak: correct ? s.streak + 1 : 0 }));
    if (winner === 'tie') setFeedbackMsg("It's a coin flip — both hands are equal!");
    else if (correct) setFeedbackMsg(`Correct! Hand ${winner === 1 ? 'A' : 'B'} is the favorite.`);
    else setFeedbackMsg(`Wrong. Hand ${winner === 1 ? 'A' : 'B'} had the edge.`);
  }, [round, result, timedOut]);

  const handleDeal = useCallback(() => {
    clearInterval(timerRef.current);
    setRound(dealFreshRound());
    setSelected(null);
    setResult(null);
    setFeedbackMsg('');
    startTimer();
  }, [startTimer]);

  const { hand1, hand2, community } = round;
  const stageName = STAGE_NAMES[community.length];
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : '--';
  const isCorrect = result && (result.winner === 'tie' || selected === result.winner);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a3a22 0%, #0c1a10 60%, #060d08 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '28px 16px 48px', fontFamily: 'system-ui, sans-serif',
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes timerFlash { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .hand-panel:hover { border-color: rgba(201,168,76,0.45) !important; }
        .deal-btn:hover { background: rgba(201,168,76,0.18) !important; }
        .deal-btn:active { transform: scale(0.97); }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <h1 style={{ fontFamily: "Georgia, serif", color: '#c9a84c', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: 3 }}>
          POKER ODDS TRAINER
        </h1>
        <div style={{ color: '#4a7a5a', fontSize: 10, marginTop: 5, letterSpacing: 2 }}>WHICH HAND HAS BETTER ODDS?</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
        <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, overflow: 'hidden' }}>
          {[
            { label: 'ACCURACY', value: accuracy === '--' ? '—' : `${accuracy}%` },
            { label: 'ROUNDS', value: stats.total },
            { label: 'STREAK', value: stats.streak, hot: stats.streak >= 3 },
          ].map((s, i) => (
            <div key={i} style={{ padding: '8px 16px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div style={{ color: s.hot ? '#f0a030' : '#c9a84c', fontSize: 17, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{s.value}</div>
              <div style={{ color: '#3a6044', fontSize: 8, letterSpacing: 2, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <TimerRing timeLeft={result ? TIMER_MAX : timeLeft} max={TIMER_MAX} />
      </div>

      {timedOut && (
        <div style={{ marginBottom: 12, color: '#d04040', fontSize: 14, fontWeight: 600, animation: 'fadeUp 0.3s ease', letterSpacing: 1 }}>
          Time's up! Dealing new hands...
        </div>
      )}

      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{ color: '#3a5a44', fontSize: 9, letterSpacing: 3, marginBottom: 8, fontFamily: "Georgia, serif" }}>
          {stageName.toUpperCase()} {timedOut && <span style={{color:'#5a3a3a', marginLeft: 6}}>— SAME BOARD</span>}
        </div>
        <div style={{ display: 'flex', gap: 7, justifyContent: 'center', padding: '12px 16px', borderRadius: 9, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {community.map((c, i) => <PlayingCard key={cardKey(c)} card={c} size="sm" />)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center', opacity: timedOut ? 0.3 : 1, transition: 'opacity 0.4s' }}>
        <HandPanel cards={hand1} label="HAND A" equity={result?.equity1} handName={result?.hand1Name}
          winner={result?.winner === 1} loser={result !== null && result.winner === 2}
          selected={selected === 1} onClick={() => handlePick(1)} revealed={result !== null} />
        <div style={{ display: 'flex', alignItems: 'center', color: '#2a4a34', fontSize: 15, fontWeight: 700, userSelect: 'none' }}>VS</div>
        <HandPanel cards={hand2} label="HAND B" equity={result?.equity2} handName={result?.hand2Name}
          winner={result?.winner === 2} loser={result !== null && result.winner === 1}
          selected={selected === 2} onClick={() => handlePick(2)} revealed={result !== null} />
      </div>

      {result && (
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center', animation: 'fadeUp 0.35s ease' }}>
          <OddsBar equity1={result.equity1} equity2={result.equity2} tieRate={result.tieRate} />
          <div style={{ marginTop: 14, color: result.winner === 'tie' ? '#c9a84c' : isCorrect ? '#50c878' : '#c05050', fontSize: 15, fontWeight: 600 }}>
            {isCorrect && result.winner !== 'tie' && '✓ '}
            {!isCorrect && result.winner !== 'tie' && '✗ '}
            {feedbackMsg}
          </div>
          {result.tieRate > 0.005 && (
            <div style={{ color: '#3a5a44', fontSize: 10, marginTop: 5 }}>Ties {(result.tieRate * 100).toFixed(1)}% of runouts</div>
          )}
          <button className="deal-btn" onClick={handleDeal} style={{ marginTop: 18, background: 'transparent', border: '1.5px solid #c9a84c', color: '#c9a84c', padding: '10px 36px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, letterSpacing: 3, fontFamily: "Georgia, serif", transition: 'background 0.2s' }}>
            DEAL AGAIN
          </button>
        </div>
      )}

      {!result && !timedOut && (
        <div style={{ color: '#2a4a34', fontSize: 11, letterSpacing: 1, marginTop: 4 }}>
          Click a hand to reveal the odds
        </div>
      )}
    </div>
  );
}