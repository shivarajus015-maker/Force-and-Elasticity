(function (global) {
  'use strict';

  const HookeLab = (global.HookeLab = global.HookeLab || {});

  HookeLab.CONFIG = {
    CLIP_MASS_G: 5.0,
    GRAVITY: 9.8,
    FORCE_PER_CLIP_N: 5.0 * 0.001 * 9.8, // 0.049 N
    EXT_PER_CLIP_CM: 1.5,
    SPRING_K_N_PER_M: (5.0 * 0.001 * 9.8) / 0.015, // ~3.267 N/m
    MAX_SAFE_CLIPS: 8,
    CM_TO_WORLD: 0.3,
    TOP_HOOK_Y: 8.2,
    BAND_REST_LEN: 1.8,
    REST_BOTTOM_Y: 6.4, // 8.2 - 1.8 -> 0 cm on 3D ruler
    HARNESS_HEIGHT: 0.95,
    CUP_HEIGHT: 1.25,
    RULER_X: 1.32,
    PEDESTAL_TOP_Y: 0.0
  };

  HookeLab.STATUS_TEXT = {
    normal: {
      badge: 'LINEAR • ರೇಖೀಯ',
      en: "Hooke's Law Linear Region",
      kn: 'ಹುಕ್‌ನ ನಿಯಮ: ರೇಖೀಯ ವಲಯ'
    },
    warning: {
      badge: 'NEAR LIMIT • ಎಚ್ಚರಿಕೆ',
      en: 'Approaching Elastic Limit!',
      kn: 'ಸ್ಥಿತಿಸ್ಥಾಪಕ ಮಿತಿಗೆ ಹತ್ತಿರದಲ್ಲಿದೆ!'
    },
    snapped: {
      badge: 'SNAPPED • ತುಂಡಾಗಿದೆ',
      en: 'Elastic Limit Exceeded — Band Snapped!',
      kn: 'ಸ್ಥಿತಿಸ್ಥಾಪಕ ಮಿತಿ ಮೀರಿದೆ — ತುಂಡಾಗಿದೆ!'
    }
  };

  HookeLab.QUIZ_BANK = [
    {
      qEn: 'If 3 paperclips stretch a rubber band by 3 cm, how many paperclips are needed to stretch it by 9 cm (within the elastic limit)?',
      qKn: '3 ಪೇಪರ್‌ಕ್ಲಿಪ್‌ಗಳು ರಬ್ಬರ್ ಬ್ಯಾಂಡ್ ಅನ್ನು 3 cm ಹಿಗ್ಗಿಸಿದರೆ, ಅದನ್ನು 9 cm ಹಿಗ್ಗಿಸಲು ಎಷ್ಟು ಪೇಪರ್‌ಕ್ಲಿಪ್‌ಗಳು ಬೇಕಾಗುತ್ತವೆ (ಸ್ಥಿತಿಸ್ಥಾಪಕ ಮಿತಿಯೊಳಗೆ)?',
      options: [
        { en: '6 paperclips', kn: '6 ಪೇಪರ್‌ಕ್ಲಿಪ್‌ಗಳು' },
        { en: '9 paperclips', kn: '9 ಪೇಪರ್‌ಕ್ಲಿಪ್‌ಗಳು' },
        { en: '12 paperclips', kn: '12 ಪೇಪರ್‌ಕ್ಲಿಪ್‌ಗಳು' },
        { en: '3 paperclips', kn: '3 ಪೇಪರ್‌ಕ್ಲಿಪ್‌ಗಳು' }
      ],
      correctIndex: 1,
      expEn: "By Hooke's Law, extension is directly proportional to force (weight). Since 3 clips produce 3 cm (1 cm per clip), 9 cm requires 9 clips.",
      expKn: 'ಹುಕ್‌ನ ನಿಯಮದ ಪ್ರಕಾರ ಹಿಗ್ಗುವಿಕೆಯು ಬಲಕ್ಕೆ ನೇರ ಅನುಪಾತದಲ್ಲಿರುತ್ತದೆ. 3 ಕ್ಲಿಪ್ = 3 cm (1 ಕ್ಲಿಪ್ = 1 cm) ಆದ್ದರಿಂದ 9 cm ಗೆ 9 ಕ್ಲಿಪ್‌ಗಳು ಬೇಕು.'
    },
    {
      qEn: 'In this virtual lab, 1 paperclip (5 g) stretches the rubber band by 1.5 cm. What will the total extension be with 4 paperclips?',
      qKn: 'ಈ ಪ್ರಯೋಗಾಲಯದಲ್ಲಿ 1 ಪೇಪರ್‌ಕ್ಲಿಪ್ (5 g) ರಬ್ಬರ್ ಬ್ಯಾಂಡ್ ಅನ್ನು 1.5 cm ಹಿಗ್ಗಿಸುತ್ತದೆ. ಹಾಗಾದರೆ 4 ಪೇಪರ್‌ಕ್ಲಿಪ್‌ಗಳಿಗೆ ಒಟ್ಟು ಹಿಗ್ಗುವಿಕೆ ಎಷ್ಟು?',
      options: [
        { en: '4.5 cm', kn: '4.5 cm' },
        { en: '6.0 cm', kn: '6.0 cm' },
        { en: '7.5 cm', kn: '7.5 cm' },
        { en: '3.0 cm', kn: '3.0 cm' }
      ],
      correctIndex: 1,
      expEn: 'Extension = 4 × 1.5 cm = 6.0 cm. Doubling the clips from 2 (3.0 cm) to 4 doubles the stretch to 6.0 cm!',
      expKn: 'ಹಿಗ್ಗುವಿಕೆ = 4 × 1.5 cm = 6.0 cm. ತೂಕವು ದ್ವಿಗುಣಗೊಂಡಾಗ ಹಿಗ್ಗುವಿಕೆಯೂ ದ್ವಿಗುಣಗೊಳ್ಳುತ್ತದೆ.'
    },
    {
      qEn: "What shape does the Force vs. Extension graph produce while the rubber band obeys Hooke's Law?",
      qKn: 'ರಬ್ಬರ್ ಬ್ಯಾಂಡ್ ಹುಕ್‌ನ ನಿಯಮವನ್ನು ಪಾಲಿಸುವಾಗ "ಬಲ vs ಹಿಗ್ಗುವಿಕೆ" ಗ್ರಾಫ್ ಯಾವ ಆಕಾರದಲ್ಲಿರುತ್ತದೆ?',
      options: [
        { en: 'A straight line through the origin', kn: 'ಮೂಲಬಿಂದುವಿನ ಮೂಲಕ ಹಾದುಹೋಗುವ ಸರಳ ರೇಖೆ' },
        { en: 'A circular loop', kn: 'ವೃತ್ತಾಕಾರದ ರೇಖೆ' },
        { en: 'A flat horizontal line', kn: 'ಸಮತಲ ರೇಖೆ' },
        { en: 'A downward zig-zag curve', kn: 'ಕೆಳಮುಖ ವಕ್ರರೇಖೆ' }
      ],
      correctIndex: 0,
      expEn: 'Because F = k · Δx is a linear equation with constant slope k, Force vs. Extension forms a straight line starting at (0, 0).',
      expKn: 'F = k · Δx ಎಂಬುದು ರೇಖೀಯ ಸಮೀಕರಣವಾಗಿರುವುದರಿಂದ, ಬಲ ಮತ್ತು ಹಿಗ್ಗುವಿಕೆಯ ನಕ್ಷೆಯು (0, 0) ನಿಂದ ಪ್ರಾರಂಭವಾಗುವ ಸರಳ ರೇಖೆಯಾಗಿರುತ್ತದೆ.'
    },
    {
      qEn: 'What happens if you load the rubber band beyond its elastic limit (more than 8 paperclips in this lab)?',
      qKn: 'ರಬ್ಬರ್ ಬ್ಯಾಂಡ್‌ನ ಸ್ಥಿತಿಸ್ಥಾಪಕ ಮಿತಿಗಿಂತ ಹೆಚ್ಚು ಭಾರವನ್ನು ಹಾಕಿದಾಗ (8 ಕ್ಕಿಂತ ಹೆಚ್ಚು ಕ್ಲಿಪ್‌ಗಳು) ಏನಾಗುತ್ತದೆ?',
      options: [
        { en: 'It stops obeying Hooke’s Law and snaps/deforms', kn: 'ಹುಕ್‌ನ ನಿಯಮ ಮುರಿಯುತ್ತದೆ ಮತ್ತು ತುಂಡಾಗುತ್ತದೆ/ವಿರೂಪಗೊಳ್ಳುತ್ತದೆ' },
        { en: 'It shrinks back to 0 cm', kn: '0 cm ಗೆ ಕುಗ್ಗುತ್ತದೆ' },
        { en: 'The paperclips become weightless', kn: 'ಪೇಪರ್‌ಕ್ಲಿಪ್‌ಗಳ ತೂಕ ಶೂನ್ಯವಾಗುತ್ತದೆ' },
        { en: 'The spring constant becomes infinite', kn: 'ಸ್ಥಿರಾಂಕ k ಅನಂತವಾಗುತ್ತದೆ' }
      ],
      correctIndex: 0,
      expEn: "Beyond the elastic limit, molecular chains can no longer recover elastically—Hooke's Law breaks down and the band snaps!",
      expKn: 'ಸ್ಥಿತಿಸ್ಥಾಪಕ ಮಿತಿಯನ್ನು ಮೀರಿದಾಗ ರಬ್ಬರ್ ಬ್ಯಾಂಡ್ ತನ್ನ ಮೂಲ ಆಕಾರಕ್ಕೆ ಮರಳಲಾರದೆ ತುಂಡಾಗುತ್ತದೆ.'
    },
    {
      qEn: "In Hooke's Law equation F = k · Δx, what does the constant 'k' represent?",
      qKn: 'ಹುಕ್‌ನ ನಿಯಮದ ಸಮೀಕರಣ F = k · Δx ನಲ್ಲಿ "k" ಏನನ್ನು ಸೂಚಿಸುತ್ತದೆ?',
      options: [
        { en: 'Stiffness / Spring constant of the band', kn: 'ರಬ್ಬರ್ ಬ್ಯಾಂಡ್‌ನ ಬಿಗಿತ / ಸ್ಪ್ರಿಂಗ್ ಸ್ಥಿರಾಂಕ' },
        { en: 'Total height of the ruler', kn: 'ಸ್ಕೇಲ್‌ನ ಒಟ್ಟು ಎತ್ತರ' },
        { en: 'Volume of the plastic cup', kn: 'ಪ್ಲಾಸ್ಟಿಕ್ ಕಪ್‌ನ ಗಾತ್ರ' },
        { en: 'Speed of falling clips', kn: 'ಕ್ಲಿಪ್ ಬೀಳುವ ವೇಗ' }
      ],
      correctIndex: 0,
      expEn: "The spring constant k measures stiffness (Newtons per meter or N/cm). Stiffer bands have a higher k and steeper graph slope!",
      expKn: 'ಸ್ಪ್ರಿಂಗ್ ಸ್ಥಿರಾಂಕ k ವಸ್ತುವಿನ ಬಿಗಿತವನ್ನು (stiffness) ಅಳೆಯುತ್ತದೆ. ಹೆಚ್ಚು ಬಿಗಿಯಾದ ಬ್ಯಾಂಡ್‌ಗೆ ಹೆಚ್ಚಿನ k ಮೌಲ್ಯವಿರುತ್ತದೆ.'
    }
  ];
})(window);
