# Blogger Suite Pro - Interactive Quiz Engine (No Database)

A lightweight, high-performance, and database-free educational quiz engine designed specifically for hosting on **GitHub Pages** and embedding directly inside **Blogger / WordPress** posts.

![Blogger Suite Pro](https://img.shields.io/badge/Blogger%20Suite%20Pro-Quiz%20Engine-4f46e5?style=for-the-badge)
![Zero Database](https://img.shields.io/badge/Database-None%20(Client--Side)-16a34a?style=for-the-badge)
![Vanilla JS](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-f59e0b?style=for-the-badge)

---

## 🌟 Key Features

- **Google Material 3 & Duolingo Aesthetics**: Rounded-2xl cards, tactile 3D interactive buttons, smooth animations, and a slide-up feedback drawer.
- **Embedded Audio Synthesizer**: Native Web Audio API generates responsive chimes for correct answers, errors, flips, and completion (no external audio files required).
- **Mobile-First & Iframe Ready**: Tuned specifically for seamless embedding within Blogger posts (standard iframe height `500px` - `620px`).
- **Zero Database Required**: Quizzes can be loaded dynamically via Base64 URL parameters or remote JSON files.
- **Top Progress & Live Stats**: Real-time progress bar, question counter, star score badge, and sound toggle.
- **Final Result Screen**: Score summary, accuracy percentage badge, question-by-question breakdown, and a retake quiz button.

---

## 🧩 Supported Question Types

1. **MCQ (Multiple Choice)**: 4 tactile choice pills with instant visual and audio verification.
2. **Fill-in-the-Blank**: Text input with case-insensitive whitespace-normalized comparison and correct answer revelation.
3. **Flashcard**: 3D perspective flip card (Term on front, Definition on back) with *"I Know This"* and *"Review Again"* scoring actions.
4. **Match the Pair**: Interactive 2-column matching with bidirectional selection, green success lock-in, and tactile error shake.

---

## 🚀 Live Blogger Embed Instructions

Add an `<iframe>` directly into your Blogger post in **HTML View**:

```html
<!-- Embed via hosted JSON file -->
<iframe 
  src="https://ravikhillare.github.io/RK_Quizmaker_nodatabase/quiz-player.html?file=quizzes/sample-quiz.json"
  width="100%" 
  height="600" 
  style="border: none; border-radius: 24px; max-width: 680px; display: block; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.06);"
  loading="lazy">
</iframe>
```

Or embed directly with Base64 encoded quiz data:
```html
<iframe 
  src="https://ravikhillare.github.io/RK_Quizmaker_nodatabase/quiz-player.html?data=<BASE64_ENCODED_JSON>"
  width="100%" 
  height="600" 
  style="border: none; border-radius: 24px; max-width: 680px; display: block; margin: 0 auto;"
  loading="lazy">
</iframe>
```

---

## 📂 Project Structure

```text
RK_Quizmaker_nodatabase/
├── index.html           # Redirect / entry landing page for GitHub Pages
├── quiz-player.html     # Core self-contained Quiz Player
├── quizzes/
│   └── sample-quiz.json # Sample quiz data
└── README.md            # Documentation & setup guide
```

---

## 📄 License

MIT License. Free to use, customize, and embed for educational content.
