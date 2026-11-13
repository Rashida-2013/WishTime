
# PART 1: BACKEND COMMANDS


**Step 1. Enter backend folder**

```
cd "E:\Users\HP V\Downloads\wish_time (2)\wish_time\API!\backend"
```

**Step 2. Create virtual environment (first time only)**

```
python -m venv .venv
```

**Step 3. Activate virtual environment**

```
.\.venv\Scripts\Activate.ps1
```

**Step 4. Upgrade pip (first time)**

```
python -m pip install --upgrade pip
```

**Step 5. Install backend dependencies (first time)**

```
python -m pip install -r requirements.txt
```

**Step 6. Set Google OAuth environment variable**

```
$env:OAUTHLIB_INSECURE_TRANSPORT="1"
```

**Step 7. Run backend server**

```
python -m uvicorn main:app --reload
```

(Backend started)

Backend URL: http\://127.0.0.1:8000

API documentation: http\://127.0.0.1:8000/docs

Keep this terminal running.

---

# PART 2: FRONTEND COMMANDS

(Terminal 2 – Frontend)

Open another terminal:

**Terminal → New Terminal**

Execute these commands.

**Step 1. Enter frontend folder**

```
cd "E:\Users\HP V\Downloads\wish_time (2)\wish_time\API!\frontend"
```

**Step 2. Install frontend dependencies (first time)**

```
npm install
```

**Step 3. Start frontend**

```
npm run dev
```

(Frontend started)

Frontend URL: http\://localhost:5173

Open this URL in Chrome to access your WishTime website.

---

# PART 3: FINAL RUNNING STATUS

**Backend** (Running)

# Port 8000

http\://127.0.0.1:8000

---

**Frontend** (Running)

# Port 5173

http\://localhost:5173

---

**Your WishTime application**

Open WishTime Website

