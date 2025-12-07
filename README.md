# ⚔️ CF Fight — Codeforces Duel & Solo Practice Arena  
### Live at: https://cf-fight.vercel.app/

CF Fight is an interactive web platform that lets competitive programmers **duel each other on unsolved Codeforces problems** — or train in a **smart solo mode**.  
The system generates **fair**, **balanced**, and **unsolved** problems for each player based on rating range and tags.

Built with ❤️ by **[Vatsal Jain](https://www.linkedin.com/in/vatsaljain79/)**

---

## 🚀 Features

### 🔥 1. Codeforces Duel Mode (1v1 Battle)

Enter two Codeforces handles and CF Fight will automatically:

- Validate both users using Codeforces API  
- Fetch solved problem sets for each  
- Generate **unsolved problems** for *both* players  
- Support:
  - Rating range (default 800–2400)
  - Number of problems (1–7)
  - Include tags (e.g., dp, graphs, math)
  - Exclude tags (e.g., constructive algorithms, geometry)

#### 🎯 Balanced Problem Generator

- Rating range is split into even difficulty bands  
- Each band is **rounded to nearest 100** to match real CF rating buckets  
- Picks a **random problem from top 50 most-solved** in each band  
- Ensures all problems are:
  - **Unique**
  - **Within rating range**
  - **Unsolved by both players**

---

## ⚡ 2. Live Solve Tracking

Once the duel starts, CF Fight:

- Polls Codeforces submissions periodically  
- Detects AC solutions **after** the contest start time  
- Tracks per problem per player:
  - **Solved / not solved**  
  - **Time from contest start (in seconds)**  
  - **Exact solved timestamp**

You can:

- Manually **Refresh** status anytime  
- Enable **auto-refresh every 10 seconds**

---

## 🥇 3. Multiple Scoring Systems

To decide who wins, CF Fight supports multiple ranking modes:

1. **Rating Score**
   - Score = sum of problem ratings solved  
   - Higher total rating wins  

2. **Count Score**
   - Score = number of solved problems  
   - Pure count, independent of rating  

3. **Knockout Mode**
   - For each problem, whoever solves it **first** gets the point  
   - Even if both solve it, only the earlier AC gets +1  

Tie-breaker in all modes:  
➡️ **Lower total time (sum of solve times) wins.**

---

## 🎯 4. Solo Practice Mode

A dedicated mode for individual training:

- Uses same generator logic as duel  
- Only selects **unsolved problems for your handle**  
- Tracks your progress and solve times  
- Supports:
  - Rating range  
  - Number of problems  
  - Include / exclude tags  

Includes a **“New solo set”** button:

- Stays on the same page  
- Generates a fresh set with the **same settings**  
- Resets timer and solve tracking

Perfect for:

- Daily practice  
- Rating-focused training blocks  
- Topic-specific grinding with includes/excludes

---

## 🎨 5. Clean, Centered, Responsive UI

- Dark, minimal UI optimized for focus  
- Home, Duel, and Solo pages are **centered** with max-width containers  
- Problem list includes:
  - CF problem name
  - Rating
  - Rating band
  - Direct link: **Open on Codeforces**  
- Scoreboard is compact and readable even on smaller screens  
- Uses small hints and badges for clarity (elapsed time, start time, etc.)

---

## ❤️ 6. Attribution

> **Made with ❤️ by [Vatsal Jain](https://www.linkedin.com/in/vatsaljain79/)**

---

# 🧱 Tech Stack

### Frontend

- **React** (with Vite)  
- **React Router** for routing  
- **Axios** for API calls  
- Deployed on **Vercel**

### Backend

- **Node.js + Express**  
- Integrates with **Codeforces API**:
  - `user.info`
  - `user.status`
  - `problemset.problems`
- Stores rooms & solo sessions **in-memory**  
- Deployed on **Render**

---

## 🧪 Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/vatsaljain79/CF-fight
cd CF-fight
```

---

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend runs at:

```
http://localhost:4000
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## ⚠️ Limitations

### 1. Codeforces API Submission Window (Latest 10,000 submissions)

Codeforces `user.status` API only returns the **most recent ~10,000 submissions**.

Effect:

- For very high-volume users (e.g. **tourist**, **Petr**, **Benq**):
  - Some **very old** solved problems may not be visible through the API.
  - In rare cases, CF Fight might pick a problem they solved long ago but is not in the last 10k submissions.

For **normal users**, this is generally **not an issue** and the problem sets are accurate.

---

### 2. In-Memory Storage

- Rooms and solo sessions are stored **in-memory** on the backend.
- On backend restart (Render free tier sleep), all active rooms and sessions are lost.

---

### 3. Polling-Based Updates (No WebSockets Yet)

- Solve tracking uses **polling** (manual button + optional auto-refresh every 10 seconds).
- There is **no WebSocket** / push-based live update yet.

---

## 🔮 Future Scope / Ideas

### 1. Multi-Player Rooms

- Allow **3–6 players** per room  
- Modes:
  - **Everyone vs Everyone**  
  - **Team battles**

### 2. WebSocket Live Updates

- Instant scoreboard updates  
- No need for refreshing

### 3. Persistent History

- Database-backed room history  
- Duel results  
- Solo practice logs  

### 4. Leaderboards

- ELO rating  
- Weekly/monthly ladders  

### 5. Smarter Problem Recommendations

- Adaptive difficulty  
- Topic rotation  
- Personalized training plans

---

## 👨‍💻 Author

**Vatsal Jain**  
Competitive Programmer & Web Developer  
LinkedIn → https://www.linkedin.com/in/vatsaljain79/

---

## ⭐ Support

If you enjoy CF Fight:

- ⭐ Star the GitHub repo  
- Share with your friends  
- Open issues & suggestions  

**Happy Coding & May the Fastest AC Win! ⚔️**
