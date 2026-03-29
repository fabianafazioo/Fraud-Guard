# FraudGuard AI

This version improves the design and the fraud detection logic.

Deployed version : https://fraud-guard-ruby.vercel.app

## Features:

- cleaner homepage with a more elegant tech look
- larger and better-looking **Run Analysis** button
- removed the extra logic card from the homepage
- uses the **actual file name** instead of generic names like Sheet 1 when possible
- improved results section so the user can see **where the suspicious activity really is**
- better mobile responsiveness
- footer added: **Created by Fabiana Fazio**
- **real Python Isolation Forest** with scikit-learn, so the detection matches your notebook much more closely
- export button now says **Save as a PDF**

## Install

### 1. Install Node packages

```bash
npm install
```

### 2. Create and activate a Python environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Run the project

```bash
npm run dev
```

Open your local browser at:

```bash
http://localhost:3000
```

## Important

This app now depends on Python because the backend calls `python/analyze.py` to run the actual fraud model.
