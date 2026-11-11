(function (global) {
  'use strict';

  const HookeLab = (global.HookeLab = global.HookeLab || {});

  class ChallengeController {
    constructor(onLockChange) {
      this.onLockChange = onLockChange;
      this.questions = HookeLab.QUIZ_BANK;
      this.currentIndex = 0;
      this.score = 0;
      this.answered = false;
      this.isOpen = false;

      this.modal = document.getElementById('challenge-modal');
      this.qEnEl = document.getElementById('quiz-q-en');
      this.qKnEl = document.getElementById('quiz-q-kn');
      this.optionsEl = document.getElementById('quiz-options');
      this.feedbackEl = document.getElementById('quiz-feedback');
      this.fbTitleEl = document.getElementById('quiz-fb-title');
      this.fbEnEl = document.getElementById('quiz-fb-en');
      this.fbKnEl = document.getElementById('quiz-fb-kn');
      this.progressEl = document.getElementById('quiz-progress');
      this.scoreEl = document.getElementById('quiz-score');
      this.nextBtn = document.getElementById('btn-quiz-next');
      this.exitBtn = document.getElementById('btn-quiz-exit');
      this.closeBtn = document.getElementById('btn-close-challenge');

      this._bind();
    }

    _bind() {
      this.closeBtn.addEventListener('click', () => this.close());
      this.exitBtn.addEventListener('click', () => this.close());
      this.nextBtn.addEventListener('click', () => this._next());

      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });

      global.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    }

    open() {
      this.isOpen = true;
      this.currentIndex = 0;
      this.score = 0;
      this.answered = false;
      this.modal.classList.remove('hidden');
      if (this.onLockChange) this.onLockChange(true);
      this._renderQuestion();
    }

    close() {
      this.isOpen = false;
      this.modal.classList.add('hidden');
      if (this.onLockChange) this.onLockChange(false);
    }

    _renderQuestion() {
      const q = this.questions[this.currentIndex];
      this.answered = false;
      this.progressEl.textContent = `Q ${this.currentIndex + 1} / ${this.questions.length}`;
      this.scoreEl.textContent = `Score: ${this.score}`;
      this.qEnEl.textContent = q.qEn;
      this.qKnEl.textContent = q.qKn;

      this.feedbackEl.classList.add('hidden');
      this.feedbackEl.classList.remove('fb-ok', 'fb-err');
      this.nextBtn.classList.add('hidden');

      this.optionsEl.innerHTML = '';
      q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt-btn';
        btn.innerHTML = `
          <span class="opt-en">${String.fromCharCode(65 + idx)}. ${opt.en}</span>
          <span class="opt-kn">${opt.kn}</span>
        `;
        btn.addEventListener('click', () => this._handleSelect(idx, btn));
        this.optionsEl.appendChild(btn);
      });
    }

    _handleSelect(selectedIdx, btnEl) {
      if (this.answered) return;
      this.answered = true;

      const q = this.questions[this.currentIndex];
      const allBtns = Array.from(this.optionsEl.querySelectorAll('.quiz-opt-btn'));
      allBtns.forEach((b) => (b.disabled = true));

      const isCorrect = selectedIdx === q.correctIndex;
      if (isCorrect) {
        this.score += 1;
        btnEl.classList.add('opt-correct');
        this.fbTitleEl.textContent = '✓ CORRECT! • ಸರಿ ಉತ್ತರ!';
        this.fbTitleEl.style.color = '#22f59a';
        this.feedbackEl.classList.add('fb-ok');
      } else {
        btnEl.classList.add('opt-wrong');
        allBtns[q.correctIndex].classList.add('opt-correct');
        this.fbTitleEl.textContent = '✕ NOT QUITE • ತಪ್ಪು ಉತ್ತರ';
        this.fbTitleEl.style.color = '#ff7b93';
        this.feedbackEl.classList.add('fb-err');
      }

      HookeLab.audio.playQuizChime(isCorrect);
      this.scoreEl.textContent = `Score: ${this.score}`;
      this.fbEnEl.textContent = q.expEn;
      this.fbKnEl.textContent = q.expKn;
      this.feedbackEl.classList.remove('hidden');

      const isLast = this.currentIndex >= this.questions.length - 1;
      const nextMain = this.nextBtn.querySelector('span:first-child');
      const nextKn = this.nextBtn.querySelector('.kn-sub');
      if (isLast) {
        nextMain.textContent = 'View Final Score';
        nextKn.textContent = 'ಫಲಿತಾಂಶ ನೋಡಿ';
      } else {
        nextMain.textContent = 'Next Question';
        nextKn.textContent = 'ಮುಂದಿನ ಪ್ರಶ್ನೆ';
      }
      this.nextBtn.classList.remove('hidden');
    }

    _next() {
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex += 1;
        this._renderQuestion();
      } else {
        this._renderSummary();
      }
    }

    _renderSummary() {
      const total = this.questions.length;
      const pct = Math.round((this.score / total) * 100);
      this.progressEl.textContent = 'COMPLETE';
      this.qEnEl.textContent = `Challenge Complete! You scored ${this.score} out of ${total} (${pct}%).`;
      this.qKnEl.textContent = `ಸವಾಲು ಪೂರ್ಣಗೊಂಡಿದೆ! ನೀವು ${total} ರಲ್ಲಿ ${this.score} ಅಂಕಗಳನ್ನು (${pct}%) ಪಡೆದಿದ್ದೀರಿ.`;

      this.optionsEl.innerHTML = '';
      this.feedbackEl.classList.remove('hidden', 'fb-err');
      this.feedbackEl.classList.add('fb-ok');
      this.fbTitleEl.textContent =
        pct >= 80
          ? '★ MASTER OF ELASTICITY! • ಸ್ಥಿತಿಸ್ಥಾಪಕತ್ವ ಪರಿಣಿತ!'
          : 'KEEP EXPERIMENTING! • ಪ್ರಯೋಗ ಮುಂದುವರಿಸಿ!';
      this.fbTitleEl.style.color = '#22e6ff';
      this.fbEnEl.textContent =
        'Try testing different clip loads in the 3D lab or replay the challenge to sharpen your Hooke’s Law mastery.';
      this.fbKnEl.textContent =
        '3D ಪ್ರಯೋಗಾಲಯದಲ್ಲಿ ವಿವಿಧ ಕ್ಲಿಪ್ ತೂಕಗಳನ್ನು ಪರೀಕ್ಷಿಸಿ ಅಥವಾ ಮತ್ತೆ ಸವಾಲು ಪ್ರಯತ್ನಿಸಿ.';

      this.nextBtn.classList.add('hidden');
    }
  }

  HookeLab.ChallengeController = ChallengeController;
})(window);
