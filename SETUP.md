# Printsy — Setup & Run Guide

This guide explains step by step how to set up MongoDB Atlas, configure the project, install dependencies, and run both the backend and frontend servers.

---

## What You Need First (Prerequisites)

Install these tools on your computer before starting:

| Tool | Why You Need It | Download |
|------|----------------|----------|
| **Node.js v18+** | Runs the backend server | https://nodejs.org |
| **npm** | Installs packages (comes with Node.js) | — |
| **Git** | Version control | https://git-scm.com |
| **Browser** | Chrome or Edge to view the app | — |

To check if Node.js is already installed, open a terminal and type:
```bash
node --version
```

---

## Step 1 — Set Up MongoDB Atlas (Cloud Database)

Printsy uses **MongoDB Atlas** — a free cloud database. You do NOT need to install MongoDB on your computer.

### 1.1 Create a Free Account
1. Go to https://www.mongodb.com/atlas
2. Click **"Try Free"** → sign up with your email

### 1.2 Create a Cluster (Your Database Server)
1. After logging in, click **"Build a Database"**
2. Choose **Free (M0 Sandbox)** — it is always free
3. Select **AWS** as the provider, pick any region near you
4. Click **"Create Cluster"** and wait about 1–2 minutes

### 1.3 Create a Database User
1. In the left sidebar, click **"Database Access"**
2. Click **"Add New Database User"**
3. Choose **"Password"** as the authentication method
4. Enter a username (e.g. `printsy_user`) and a password (write it down!)
5. Under "Built-in Role", select **"Atlas Admin"**
6. Click **"Add User"**

### 1.4 Allow Your IP Address (Network Access)
1. In the left sidebar, click **"Network Access"**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** → this adds `0.0.0.0/0`
4. Click **"Confirm"**

> This allows your computer to connect to the database.

### 1.5 Get Your Connection String
1. Go to **Database** → click **"Connect"** on your cluster
2. Choose **"Drivers"**
3. Select **Node.js** as the driver, version **5.5 or later**
4. Copy the connection string — it looks like this:
   ```
   mongodb+srv://printsy_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password from Step 1.3

---

## Step 2 — Configure the Environment File

The backend uses a `.env` file to store secret configuration values.

1. Open the file: `backend/.env`
2. Replace its content with:

```env
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?appName=Cluster0
JWT_SECRET=printsy_super_secret_key_change_this
NODE_ENV=development
```

> Replace `YOUR_USERNAME` and `YOUR_PASSWORD` with your Atlas credentials from Step 1.3 and 1.5.

### Optional — Email Notifications
If you want email confirmations and password-reset emails to work, also add:

```env
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

> **How to get a Gmail App Password:**
> 1. Go to your Google Account → Security
> 2. Enable **2-Step Verification** (if not already)
> 3. Go to **App Passwords** → Generate a new one
> 4. Copy the 16-character password into `EMAIL_PASS`

---

## Step 3 — Install Backend Dependencies

Open a terminal in the project root:

```bash
cd backend
npm install
```

This downloads all backend packages including:
- `express` — web server framework
- `mongoose` — connects to MongoDB
- `bcryptjs` — securely hashes passwords
- `jsonwebtoken` — creates login tokens
- `multer` — handles file uploads
- `nodemailer` — sends emails
- `mammoth` — converts Word (.docx) to HTML
- `puppeteer-core` — converts HTML to PDF
- `node-cron` — runs scheduled cleanup tasks

---

## Step 4 — Install Frontend Dependencies

Open a **new terminal**:

```bash
cd frontend
npm install
```

This downloads React, Vite, React Router, Axios, Framer Motion, Chart.js, and React Icons.

---

## Step 5 — Run the Backend Server

```bash
cd backend
node server.js
```

You should see these two messages:
```
Server running on port 5000
MongoDB Connected: ac-xxxxxxx.mongodb.net
```

> The backend API is now available at **http://localhost:5000**

> **Note:** The project already has a DNS fix applied in `backend/config/db.js` that forces Google DNS (`8.8.8.8`) for MongoDB Atlas SRV lookups. This is needed on some Windows networks where the default DNS blocks Atlas connections. No action required on your end — it works automatically.

---

## Step 6 — Run the Frontend

Keep the backend terminal open. Open a **second terminal**:

```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x  ready in xxx ms
  ➜  Local:   http://localhost:3000/
```

Open **http://localhost:3000** in your browser — the app will load.

---

## Step 7 — Create the First Admin Account

There is no admin sign-up page (by design, for security). A ready-made script is included at `backend/createAdmin.js`.

**Make sure the backend server is running first (Step 5), then open a second terminal:**

```bash
cd backend
node createAdmin.js
```

Expected output:
```
MongoDB Connected: ...
Admin created successfully: admin@printsy.com
```

If it says **"Admin already exists"** — the account is already in the database, skip this step.

Log in at **http://localhost:3000/login** with:

| Field | Value |
|-------|-------|
| Email | `admin@printsy.com` |
| Password | `Admin@123` |

> After logging in, go to the Admin Dashboard → Users tab to change the password.

---

## Project Folder Structure

```
Online-Printing-System/
│
├── backend/
│   ├── .env                    ← secret config (MongoDB URI, JWT secret)
│   ├── server.js               ← starts the Express server
│   ├── config/
│   │   └── db.js               ← connects to MongoDB
│   ├── models/
│   │   ├── User.js             ← user data schema
│   │   ├── Order.js            ← order data schema
│   │   └── PrintPricing.js     ← pricing data schema
│   ├── controllers/
│   │   ├── authController.js   ← register, login, admin actions
│   │   ├── orderController.js  ← place, update, cancel orders
│   │   └── pricingController.js← get/set print prices
│   ├── routes/
│   │   ├── authRoutes.js       ← /api/auth/...
│   │   ├── orderRoutes.js      ← /api/orders/...
│   │   └── pricingRoutes.js    ← /api/pricing/...
│   ├── middleware/
│   │   └── authMiddleware.js   ← checks JWT tokens on protected routes
│   └── uploads/                ← uploaded files stored here (auto-created)
│
└── frontend/
    ├── index.html
    ├── vite.config.js          ← Vite dev server config (port 3000)
    └── src/
        ├── App.jsx             ← all page routes defined here
        ├── main.jsx            ← React app entry point
        ├── index.css           ← global CSS variables and base styles
        ├── components/
        │   └── Navbar.jsx      ← top navigation bar
        ├── context/
        │   ├── AuthContext.jsx ← stores logged-in user info globally
        │   └── ThemeContext.jsx← dark/light mode toggle
        └── pages/
            ├── Landing.jsx     ← home page (public)
            ├── Login.jsx       ← login form
            ├── Signup.jsx      ← register form
            ├── Dashboard.jsx   ← customer: upload & place order
            ├── OrderHistory.jsx← customer: view & cancel orders
            ├── ShopDashboard.jsx  ← shop owner: queue, pricing, earnings
            ├── AdminDashboard.jsx ← admin: orders, users, shops, reports
            └── RiderDashboard.jsx ← rider: delivery assignments
```

---

## Common Problems & Fixes

| Problem | Solution |
|---------|----------|
| `MongoServerError: bad auth` | Wrong username or password in `MONGODB_URI` |
| `querySrv ECONNREFUSED` | Windows DNS blocking Atlas SRV — already fixed in `db.js` via Google DNS. If still failing, check your internet connection. |
| `ENOTFOUND cluster0...` | No internet, or IP not whitelisted in Atlas Network Access — add `0.0.0.0/0` |
| `Port 5000 already in use` | Run `npx kill-port 5000` or change `PORT=5001` in `backend/.env` |
| `Cannot find module '...'` | Run `npm install` inside the `backend/` folder |
| Frontend shows blank page | Make sure the backend is running on port 5000 first |
| File upload fails | The `backend/uploads/` folder must exist (it is auto-created on first run) |
| Email not sending | Add `EMAIL_USER` and `EMAIL_PASS` to `.env` (see Step 2 above) |
| Admin can't log in | Run `node createAdmin.js` from the `backend/` folder |

---

## API Endpoints Reference (for Testing with Postman)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get a JWT token |
| GET | `/api/orders/my-orders` | Get customer's own orders |
| POST | `/api/orders` | Place a new order (with file upload) |
| PUT | `/api/orders/:id/cancel` | Cancel a pending order |
| GET | `/api/orders/all` | Get all orders (admin/shop) |
| GET | `/api/pricing` | Get current print prices (public) |
| PUT | `/api/pricing/my` | Shop owner updates their prices |

All protected endpoints require an `Authorization: Bearer <token>` header.

---

## Quick Start (Summary)

```bash
# Terminal 1 — Install & start backend
cd backend
npm install
node server.js
# Expected: "Server running on port 5000" + "MongoDB Connected: ..."

# Terminal 2 — Create admin account (first time only)
cd backend
node createAdmin.js
# Expected: "Admin created successfully: admin@printsy.com"

# Terminal 3 — Install & start frontend
cd frontend
npm install
npm run dev
# Expected: "Local: http://localhost:3000/"
```

Then open **http://localhost:3000** in your browser.

**Default Admin Login:**
- Email: `admin@printsy.com`
- Password: `Admin@123`
   - Theme toggle (light/dark mode)
   - Responsive design

2. **Authentication**
   - Sign up new user
   - Login existing user
   - Protected routes

3. **Dashboard**
   - File upload
   - Print options selection
   - Price calculation
   - Order placement

4. **Order History**
   - View all orders
   - Order details modal
   - Status tracking

## Next Steps

After basic testing:
1. Implement file upload to cloud storage
2. Add payment gateway
3. Build admin panel
4. Add email notifications

Happy Coding! 🚀
