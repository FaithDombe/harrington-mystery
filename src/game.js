// game.js - Core Murder Mystery Game Engine & AI Suspect Dialogues

export class MysteryGame {
  constructor() {
    this.turnsLeft = 10;
    this.maxTurns = 10;
    this.isGameOver = false;
    this.caseSolved = false;
    this.activeSuspect = 'butler';

    this.suspects = {
      butler: {
        id: 'butler',
        name: 'Arthur Pendelton',
        title: 'The Butler',
        stress: 15,
        confessed: false,
        emotion: 'nervous'
      },
      partner: {
        id: 'partner',
        name: 'Marcus Vance',
        title: 'Business Partner',
        stress: 20,
        revealedAlibi: false,
        emotion: 'defensive'
      },
      doctor: {
        id: 'doctor',
        name: 'Dr. Evelyn Sterling',
        title: 'The Doctor',
        stress: 10,
        slippedUp: false,
        emotion: 'calm'
      }
    };

    this.clues = new Set();
    this.dialogueHistory = [];
    this.geminiApiKey = localStorage.getItem('mystery_gemini_api_key') || '';
  }

  setGeminiApiKey(key) {
    this.geminiApiKey = (key || '').trim();
    if (this.geminiApiKey) {
      localStorage.setItem('mystery_gemini_api_key', this.geminiApiKey);
    } else {
      localStorage.removeItem('mystery_gemini_api_key');
    }
  }

  hasGeminiKey() {
    return Boolean(this.geminiApiKey);
  }

  addClue(clueId, clueText) {
    if (!this.clues.has(clueId)) {
      this.clues.add(clueId);
      return { isNew: true, text: clueText };
    }
    return { isNew: false, text: clueText };
  }

  // Primary questioning method
  async askQuestion(suspectId, questionText) {
    if (this.turnsLeft <= 0 || this.isGameOver) {
      return {
        reply: "You have exhausted all your interrogation turns! You must make your final accusation now.",
        newClue: null,
        stress: 100,
        emotion: 'shocked',
        turnsLeft: 0
      };
    }

    this.turnsLeft--;
    const suspect = this.suspects[suspectId];
    let reply = '';
    let newClue = null;

    // Check if live Gemini API is configured
    if (this.hasGeminiKey()) {
      try {
        const liveResult = await this.callGeminiAPI(suspectId, questionText);
        if (liveResult) {
          reply = liveResult.reply;
          if (liveResult.stressDelta) suspect.stress = Math.min(100, Math.max(0, suspect.stress + liveResult.stressDelta));
          if (liveResult.clue) {
            const added = this.addClue(liveResult.clue.id, liveResult.clue.text);
            if (added.isNew) newClue = liveResult.clue.text;
          }
          suspect.emotion = liveResult.emotion || suspect.emotion;
          return {
            reply,
            newClue,
            stress: suspect.stress,
            emotion: suspect.emotion,
            turnsLeft: this.turnsLeft
          };
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to local heuristic AI engine:', err);
      }
    }

    // Heuristic NLP Engine
    const result = this.processHeuristicAI(suspectId, questionText);
    reply = result.reply;
    newClue = result.newClue;

    this.dialogueHistory.push({
      speaker: 'detective',
      target: suspect.name,
      text: questionText,
      timestamp: Date.now()
    });

    this.dialogueHistory.push({
      speaker: suspect.name,
      target: 'detective',
      text: reply,
      timestamp: Date.now()
    });

    return {
      reply,
      newClue,
      stress: suspect.stress,
      emotion: suspect.emotion,
      turnsLeft: this.turnsLeft
    };
  }

  processHeuristicAI(suspectId, rawText) {
    const text = rawText.toLowerCase();
    const suspect = this.suspects[suspectId];
    let reply = '';
    let newClue = null;

    if (suspectId === 'butler') {
      // Suspect 1: Arthur Pendelton
      const triggers = ['pantry', 'asleep', 'sleep', 'noise', 'footsteps', 'see', 'saw', '10', '10:00', 'truth', 'lie', 'fired', 'sack', 'hall', 'study'];
      const matches = triggers.filter((t) => text.includes(t));

      if (matches.length > 0 || suspect.stress >= 50) {
        suspect.stress = Math.min(100, suspect.stress + 30);
        suspect.emotion = 'nervous';

        if (suspect.stress >= 65 || text.includes('truth') || text.includes('saw') || text.includes('10')) {
          suspect.confessed = true;
          suspect.emotion = 'shocked';
          reply = "I-I cannot carry this burden any longer, Detective! Forgive me! I lied about being asleep in the pantry—I was petrified Lord Harrington would dismiss me! At 10:00 PM, I was in the west corridor and witnessed Dr. Sterling quietly slipping out of his lordship's study! She was holding a small amber vial and trembling!";
          const c = this.addClue('butler_witness', "Arthur saw Dr. Sterling sneak out of Lord Harrington's study at 10:00 PM clutching a chemical vial.");
          if (c.isNew) newClue = c.text;
        } else {
          reply = "I... I assure you, sir, I was merely resting in the pantry! The manor was so quiet... though now that you mention it, the floorboards in the gallery did creak around ten o'clock...";
        }
      } else if (text.includes('wine') || text.includes('drink') || text.includes('glass')) {
        suspect.stress += 15;
        reply = "His lordship requested his 1895 Bordeaux decanted at eight o'clock sharp. When I cleared the evening tea at nine, the glass was barely touched. Someone else must have tampered with it later!";
        const c = this.addClue('wine_untampered_at_9', "The wine decanter was clean when Arthur inspected it at 9:00 PM.");
        if (c.isNew) newClue = c.text;
      } else if (text.includes('marcus') || text.includes('partner') || text.includes('argue')) {
        reply = "Mr. Vance was in a dreadful fury earlier, sir! I heard shouting from behind the library doors around half-past nine. He threatened to ruin his lordship!";
      } else if (text.includes('doctor') || text.includes('sterling')) {
        reply = "Dr. Sterling was attending to his lordship's gout earlier this week. She seemed awfully attentive to his private cabinet...";
      } else {
        suspect.stress += 5;
        reply = "I have served the Harrington family for thirty years, Detective. I only ever wished to protect his lordship's good name.";
      }
    } else if (suspectId === 'partner') {
      // Suspect 2: Marcus Vance
      const triggers = ['money', 'debt', 'argue', 'shout', 'bankrupt', 'shares', 'railway', 'greed', 'fight', 'kill'];
      const matches = triggers.filter((t) => text.includes(t));

      if (matches.length > 0 || suspect.stress >= 50) {
        suspect.stress = Math.min(100, suspect.stress + 25);
        suspect.emotion = 'defensive';

        if (suspect.stress >= 65 || text.includes('gate') || text.includes('leave') || text.includes('alibi')) {
          suspect.revealedAlibi = true;
          reply = "Enough of your pathetic insinuations! Yes, we screamed at each other at 9:30 PM! The sanctimonious bastard tried to freeze me out of the railway consortium! But I didn't murder him! I stormed out to my automobile at 9:40 PM sharp—the estate gatekeeper logged my car passing the main gate! And Harrington was already drinking that burgundy wine while laughing in my face!";
          const c = this.addClue('marcus_alibi', "Marcus left the estate at 9:40 PM (logged by gatekeeper) and saw Harrington drinking the wine at 9:35 PM.");
          if (c.isNew) newClue = c.text;
        } else {
          reply = "Business discussions between gentlemen get heated, Detective. That is how empires are built. If you think an angry word equates to murder, your badge is as hollow as your wits.";
        }
      } else if (text.includes('wine') || text.includes('poison')) {
        reply = "Harrington poured himself a goblet of his precious vintage right before I stormed out. Smelled strong enough to strip paint, but he drank it anyway.";
      } else if (text.includes('doctor') || text.includes('sterling')) {
        reply = "The good doctor? Cold fish, that one. Always hovering like a vulture with her medical satchel. Ask her what she was brewing in her clinic.";
      } else {
        suspect.stress += 5;
        reply = "My time is worth fifty pounds an hour, Detective. State your question concisely or get out of my sight.";
      }
    } else if (suspectId === 'doctor') {
      // Suspect 3: Dr. Evelyn Sterling (The Culprit)
      const triggers = ['poison', 'cyanide', 'almond', 'autopsy', 'toxicology', 'weak heart', 'vial', 'wine', '9:45', '10:00', 'study', 'medicine'];
      const matches = triggers.filter((t) => text.includes(t));

      if (matches.length > 0) {
        suspect.stress = Math.min(100, suspect.stress + 30);

        if (text.includes('cyanide') || text.includes('poison') || text.includes('wine') || suspect.stress >= 60) {
          suspect.slippedUp = true;
          suspect.emotion = 'shocked';
          reply = "Lord Harrington succumbed to severe respiratory arrest... The telltale scent of bitter almonds and potassium cyanide causes complete cellular suffocation in less than five minutes... Wait. I... that was purely an academic hypothesis, Detective! The official toxicology report won't be completed by Scotland Yard until tomorrow! How could anyone... I mean, you are twisting my clinical observations!";
          const c = this.addClue('doctor_cyanide_slip', "Dr. Sterling accurately identified potassium cyanide and the almond scent before any autopsy or toxicology results!");
          if (c.isNew) newClue = c.text;
        } else {
          suspect.emotion = 'calm';
          reply = "As his personal physician, I was treating his chronic hypertension. He was supposed to avoid alcohol entirely. Drinking fortified vintage wine tonight was sheer recklessness.";
        }
      } else if (text.includes('where') || text.includes('alibi') || text.includes('time')) {
        suspect.stress += 10;
        reply = "I was in the east conservatory reading the British Medical Journal from 9:15 until the screams echoed through the hallway. A tranquil setting, though quite chilly.";
      } else if (text.includes('butler') || text.includes('arthur')) {
        reply = "Poor Arthur is getting frail. His memory has been slipping of late; I wouldn't place too much stock in his jittery ramblings.";
      } else {
        suspect.stress += 5;
        reply = "This is a tragic loss for the scientific society. I am at your full disposal to provide any anatomical clarity you require, Detective.";
      }
    }

    return { reply, newClue };
  }

  // Live LLM Fallback (Calls Google Gemini 1.5/2.0 API with System Instructions)
  async callGeminiAPI(suspectId, questionText) {
    const suspect = this.suspects[suspectId];
    let systemInstruction = "";

    if (suspectId === 'butler') {
      systemInstruction = `You are Arthur Pendelton, a stiff, formal, elderly butler in a 1920s English manor. You are terrified of being blamed for Lord Harrington's murder or losing your job.
SECRET: You lied about sleeping in the pantry. At 10:00 PM you saw Dr. Evelyn Sterling sneak out of Lord Harrington's study holding a small glass vial.
RULE: If the player asks about 10 PM, the pantry, hearing footsteps, or demands the truth, break down and confess seeing Dr. Sterling with the vial! Keep answer under 3 sentences.`;
    } else if (suspectId === 'partner') {
      systemInstruction = `You are Marcus Vance, an arrogant, wealthy business partner.
SECRET: You had a furious screaming argument with Harrington at 9:30 PM about railway shares, but you left the manor at 9:40 PM (the gatekeeper saw your car leave!). Harrington was already drinking the wine at 9:35 PM.
RULE: Be haughty, defensive, and sarcastic. If accused or asked about your alibi, reveal that the gatekeeper saw you leave at 9:40 PM! Keep answer under 3 sentences.`;
    } else {
      systemInstruction = `You are Dr. Evelyn Sterling, a calm, analytical doctor.
SECRET: YOU ARE THE KILLER! You slipped potassium cyanide into Harrington's wine at 9:45 PM.
RULE: Pretend to be innocent and helpful. BUT if asked about the wine, the poison, or cause of death, make a fatal slip: mention potassium cyanide and the bitter almond scent, then panic realizing toxicology isn't back yet! Keep answer under 3 sentences.`;
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `[System Instruction: ${systemInstruction}]\n\nDetective asks: "${questionText}"` }]
        }
      ]
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Gemini API returned ${res.status}`);
    const data = await res.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Parse reactions
    const lower = replyText.toLowerCase();
    let clue = null;
    let emotion = 'calm';
    let stressDelta = 10;

    if (suspectId === 'butler' && (lower.includes('doctor') || lower.includes('vial') || lower.includes('10'))) {
      emotion = 'shocked';
      stressDelta = 35;
      clue = { id: 'butler_witness', text: "Arthur saw Dr. Sterling sneak out of Lord Harrington's study at 10:00 PM clutching a chemical vial." };
    } else if (suspectId === 'partner' && (lower.includes('gate') || lower.includes('9:40'))) {
      emotion = 'defensive';
      stressDelta = 25;
      clue = { id: 'marcus_alibi', text: "Marcus left the estate at 9:40 PM (logged by gatekeeper) and saw Harrington drinking the wine at 9:35 PM." };
    } else if (suspectId === 'doctor' && (lower.includes('cyanide') || lower.includes('almond') || lower.includes('toxicology'))) {
      emotion = 'shocked';
      stressDelta = 35;
      clue = { id: 'doctor_cyanide_slip', text: "Dr. Sterling accurately identified potassium cyanide and the almond scent before any autopsy or toxicology results!" };
    }

    return { reply: replyText, clue, emotion, stressDelta };
  }

  // Make Final Accusation
  solveCase({ culprit, weapon, motive }) {
    this.isGameOver = true;
    const isCulpritCorrect = culprit === 'doctor';
    const isWeaponCorrect = weapon === 'poisoned_wine';

    let score = 0;
    if (isCulpritCorrect && isWeaponCorrect) {
      this.caseSolved = true;
      score = 1200 + (this.turnsLeft * 150) + (this.clues.size * 100);
      return {
        success: true,
        score,
        turnsLeft: this.turnsLeft,
        title: "CASE SOLVED! MASTER DETECTIVE",
        debrief: "Outstanding deduction! Dr. Evelyn Sterling planned the murder down to the minute, poisoning the vintage wine with potassium cyanide at 9:45 PM. But Arthur's testimony and her slip regarding the toxicology report unmasked her crime."
      };
    } else {
      this.caseSolved = false;
      score = Math.max(100, (this.clues.size * 80) + (isCulpritCorrect ? 400 : 0));
      return {
        success: false,
        score,
        turnsLeft: this.turnsLeft,
        title: "WRONGFUL ACCUSATION! CASE CLOSED",
        debrief: `Your deduction collapsed in court! ${
          !isCulpritCorrect
            ? `You accused an innocent person while Dr. Evelyn Sterling boarded a midnight steamer to the Continent!`
            : `You identified Dr. Sterling, but without linking the poisoned wine, the magistrate dismissed the charges!`
        }`
      };
    }
  }
}
