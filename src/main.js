// main.js - Master Game Controller & start.ng Integration
import { MysteryScene } from './scene.js';
import { MysteryGame } from './game.js';
import {
  getCurrentPlayer,
  onUserChange,
  signIn,
  submitScore,
  fetchLeaderboard
} from './platform.js';

async function initGame() {
  const canvas = document.getElementById('webgl-canvas');
  const scene = new MysteryScene(canvas);
  const game = new MysteryGame();

  let currentPlayer = null;

  // Render Loop
  function animate(t) {
    requestAnimationFrame(animate);
    scene.render(t);
  }
  requestAnimationFrame(animate);

  // ---- 1. Initialize Player & Central Styling ----
  async function applyPlayer(player) {
    currentPlayer = player;
    const nameEl = document.getElementById('player-name');
    const handleEl = document.getElementById('player-handle');
    const avatarEl = document.getElementById('player-avatar');
    const signinBtn = document.getElementById('btn-signin');

    if (nameEl) nameEl.textContent = player.name;
    if (handleEl) handleEl.textContent = player.isGuest ? 'Guest Detective' : `@${player.account}`;
    if (signinBtn) signinBtn.hidden = !player.isGuest;

    if (avatarEl) {
      if (player.face) {
        avatarEl.innerHTML = `<img src="${player.face}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        avatarEl.textContent = '🕵️';
      }
    }

    // Centrally update 3D Detective character in Three.js!
    scene.updateDetective(player.style);
  }

  // Load initial player
  const initialPlayer = await getCurrentPlayer();
  await applyPlayer(initialPlayer);

  // Listen to central styling changes on start.ng
  onUserChange((updatedPlayer) => {
    applyPlayer(updatedPlayer);
    showToast("Central Style Updated", "Your detective's appearance has been refreshed from start.ng!");
  });

  // Sign-in button
  const signinBtn = document.getElementById('btn-signin');
  if (signinBtn) {
    signinBtn.addEventListener('click', () => signIn());
  }

  // ---- 2. UI Elements & Suspect Management ----
  const turnsPill = document.getElementById('turns-count');
  const dialogueBox = document.getElementById('dialogue-box');
  const questionInput = document.getElementById('question-input');
  const askForm = document.getElementById('ask-form');
  const stressFill = document.getElementById('stress-fill');
  const stressVal = document.getElementById('stress-val');
  const suspectStatus = document.getElementById('suspect-status');

  const suspectTabs = document.querySelectorAll('.suspect-tab');

  function updateSuspectUI(suspectId) {
    game.activeSuspect = suspectId;
    scene.setFocus(suspectId);

    suspectTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.suspect === suspectId);
    });

    const suspect = game.suspects[suspectId];
    if (stressFill) stressFill.style.width = `${suspect.stress}%`;
    if (stressVal) stressVal.textContent = `${suspect.stress}%`;

    let statusText = "Guarded";
    if (suspectId === 'butler') {
      statusText = suspect.confessed ? "CONFESSED WITNESS" : (suspect.stress > 50 ? "Panicking & Trembling" : "Nervous & Stiff");
    } else if (suspectId === 'partner') {
      statusText = suspect.revealedAlibi ? "EXONERATED ALIBI" : (suspect.stress > 50 ? "Furious & Hostile" : "Arrogant & Dismissive");
    } else if (suspectId === 'doctor') {
      statusText = suspect.slippedUp ? "CAUGHT IN SLIP" : (suspect.stress > 40 ? "Hesitant & Guarded" : "Clinically Calm");
    }
    if (suspectStatus) suspectStatus.textContent = statusText;

    // Set quick chips
    renderQuickChips(suspectId);
  }

  suspectTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      updateSuspectUI(tab.dataset.suspect);
    });
  });

  // ---- 3. Quick Chips ----
  const quickChipsContainer = document.getElementById('quick-chips');
  const chipSets = {
    butler: [
      "Where were you at 10:00 PM?",
      "Were you really asleep in the pantry?",
      "Did you hear any footsteps in the hallway?",
      "Who poured Lord Harrington's wine?"
    ],
    partner: [
      "Why were you shouting at Harrington at 9:30 PM?",
      "What time did you leave the estate?",
      "Did you see Lord Harrington drinking?",
      "Were you in financial debt to Harrington?"
    ],
    doctor: [
      "What was Lord Harrington's medical condition?",
      "Could someone have poisoned the vintage wine?",
      "How fast would potassium cyanide kill someone?",
      "Where were you between 9:30 and 10:00 PM?"
    ]
  };

  function renderQuickChips(suspectId) {
    if (!quickChipsContainer) return;
    quickChipsContainer.innerHTML = '';
    const list = chipSets[suspectId] || [];
    list.forEach((text) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = text;
      chip.addEventListener('click', () => {
        if (questionInput) questionInput.value = text;
        askQuestion(text);
      });
      quickChipsContainer.appendChild(chip);
    });
  }

  // Initial chips
  renderQuickChips('butler');

  // ---- 4. Dialogue and Interrogation ----
  function appendMessage(senderName, text, type) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${type}`;
    bubble.innerHTML = `
      <div class="bubble-sender">${senderName}</div>
      <div class="bubble-text">${text}</div>
    `;
    dialogueBox.appendChild(bubble);
    dialogueBox.scrollTop = dialogueBox.scrollHeight;
  }

  async function askQuestion(text) {
    if (!text || game.isGameOver) return;
    if (questionInput) questionInput.value = '';

    const suspect = game.suspects[game.activeSuspect];
    appendMessage(currentPlayer?.name || 'Detective', text, 'detective');

    // Show temporary thinking state
    const res = await game.askQuestion(game.activeSuspect, text);

    // Update turns display
    if (turnsPill) turnsPill.textContent = `${res.turnsLeft}/10`;

    // Append Suspect Reply
    appendMessage(suspect.name, res.reply, 'suspect');

    // Update 3D Character Emotion
    scene.setSuspectEmotion(game.activeSuspect, res.emotion);

    // Update UI Stress Bar
    if (stressFill) stressFill.style.width = `${res.stress}%`;
    if (stressVal) stressVal.textContent = `${res.stress}%`;

    // If a new clue was uncovered, show notification toast!
    if (res.newClue) {
      showToast("🔍 New Clue Uncovered!", res.newClue);
    }

    // Check if turns ran out
    if (res.turnsLeft <= 0 && !game.isGameOver) {
      showToast("⏳ Out of Turns!", "You must make your final deduction now.");
      openModal('modal-accuse');
    }
  }

  if (askForm) {
    askForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = (questionInput?.value || '').trim();
      if (val) askQuestion(val);
    });
  }

  // ---- 5. Modals Management ----
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.hidden = true;
    });
  });

  // Notebook Button
  const btnNotebook = document.getElementById('btn-notebook');
  if (btnNotebook) {
    btnNotebook.addEventListener('click', () => {
      const container = document.getElementById('clues-list');
      if (container) {
        if (game.clues.size === 0) {
          container.innerHTML = '<p style="color:var(--text-dim)">No definitive evidence gathered yet. Press the suspects on timelines and the vintage wine!</p>';
        } else {
          container.innerHTML = Array.from(game.clues)
            .map((c) => `<div class="clue-item">📌 ${c}</div>`)
            .join('');
        }
      }
      openModal('modal-notebook');
    });
  }

  // Camera Overview Button
  const btnOverview = document.getElementById('btn-overview');
  if (btnOverview) {
    btnOverview.addEventListener('click', () => {
      scene.setFocus('overview');
    });
  }

  // Crime Scene Desk / Wine Glass View
  const btnWine = document.getElementById('btn-wine');
  if (btnWine) {
    btnWine.addEventListener('click', () => {
      scene.setFocus('wine');
      showToast("Crime Scene Desk", "Lord Harrington's vintage wine glass sits half-empty. Faint odor of bitter almonds lingers.");
    });
  }

  // Accuse Button
  const btnAccuse = document.getElementById('btn-accuse');
  if (btnAccuse) {
    btnAccuse.addEventListener('click', () => {
      openModal('modal-accuse');
    });
  }

  // Accusation Form Submission
  const formAccuse = document.getElementById('form-accuse');
  if (formAccuse) {
    formAccuse.addEventListener('submit', async (e) => {
      e.preventDefault();
      closeModal('modal-accuse');

      const culprit = document.getElementById('accuse-suspect').value;
      const weapon = document.getElementById('accuse-weapon').value;
      const motive = document.getElementById('accuse-motive').value;

      const result = game.solveCase({ culprit, weapon, motive });

      // Open Result Modal
      const titleEl = document.getElementById('result-title');
      const debriefEl = document.getElementById('result-debrief');
      const scoreEl = document.getElementById('result-score');
      const boardStatusEl = document.getElementById('board-status');

      if (titleEl) titleEl.textContent = result.title;
      if (debriefEl) debriefEl.textContent = result.debrief;
      if (scoreEl) scoreEl.textContent = `Score: ${result.score} pts (Turns Left: ${result.turnsLeft})`;

      openModal('modal-result');

      // Submit score to start.ng leaderboard
      if (boardStatusEl) boardStatusEl.textContent = "Saving score to start.ng...";
      const saveRes = await submitScore(result.score, result.turnsLeft);
      if (saveRes.success) {
        boardStatusEl.textContent = `Score saved on start.ng! (Rank #${saveRes.rank || 'N/A'})`;
      } else {
        boardStatusEl.textContent = saveRes.reason || "Sign in to record your detective score on the start.ng leaderboard.";
      }

      // Load live leaderboard
      loadLeaderboard();
    });
  }

  // Load start.ng Leaderboard
  async function loadLeaderboard() {
    const boardEl = document.getElementById('leaderboard-container');
    if (!boardEl) return;

    boardEl.innerHTML = '<p style="color:var(--text-dim)">Loading top detectives from start.ng...</p>';
    const entries = await fetchLeaderboard(10);

    if (!entries || entries.length === 0) {
      boardEl.innerHTML = '<p style="color:var(--text-dim)">No entries on the start.ng board yet. Be the first to solve the case!</p>';
      return;
    }

    boardEl.innerHTML = `
      <ul class="leaderboard-list">
        ${entries
          .map(
            (e, i) => `
          <li class="leaderboard-item">
            <span>#${e.rank || i + 1} <b>${e.name || 'Detective'}</b></span>
            <span>${e.score || e.stats?.score || 0} pts</span>
          </li>
        `
          )
          .join('')}
      </ul>
    `;
  }

  // Settings / Gemini API Key
  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      const keyInput = document.getElementById('gemini-key-input');
      if (keyInput) keyInput.value = game.geminiApiKey;
      openModal('modal-settings');
    });
  }

  const formSettings = document.getElementById('form-settings');
  if (formSettings) {
    formSettings.addEventListener('submit', (e) => {
      e.preventDefault();
      const keyInput = document.getElementById('gemini-key-input');
      game.setGeminiApiKey(keyInput?.value || '');
      closeModal('modal-settings');
      showToast(
        "Settings Saved",
        game.hasGeminiKey()
          ? "Live Gemini LLM mode activated for all suspects!"
          : "Local heuristic AI engine active."
      );
    });
  }

  // Play Again Button
  const btnPlayAgain = document.getElementById('btn-play-again');
  if (btnPlayAgain) {
    btnPlayAgain.addEventListener('click', () => {
      location.reload();
    });
  }

  // Toast Helper
  function showToast(title, body) {
    const existing = document.querySelector('.clue-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'clue-toast';
    toast.innerHTML = `
      <div style="font-weight:700;color:var(--accent-gold);margin-bottom:4px;">${title}</div>
      <div style="font-size:13px;line-height:1.4;">${body}</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 4500);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
