# Printsy — Module-by-Module Code Explanation

This document explains every module of the Printsy Online Printing System in simple words. Each section tells you **what the module does**, **which files are involved**, and **how the main code works step by step**.

---

## Table of Contents

1. [Authentication Module](#1-authentication-module)
2. [File Upload Module](#2-file-upload-module)
3. [Order Management Module](#3-order-management-module)
4. [Customer Dashboard & File Preview](#4-customer-dashboard--file-preview)
5. [Dynamic Pricing Module](#5-dynamic-pricing-module)
6. [Shop Owner Dashboard](#6-shop-owner-dashboard)
7. [Admin Dashboard](#7-admin-dashboard)
8. [Rider Delivery Module](#8-rider-delivery-module)
9. [Email Notification Module](#9-email-notification-module)
10. [File Conversion Module](#10-file-conversion-module)
11. [Auto-Deletion Module](#11-auto-deletion-module)
12. [Reports Module](#12-reports-module)
13. [Theme & Global State](#13-theme--global-state)

---

## 1. Authentication Module

**What it does:** Lets users register (sign up), log in, and access only the pages they are allowed to see based on their role (customer, shop owner, admin, rider).

**Files involved:**
- `backend/controllers/authController.js`
- `backend/models/User.js`
- `backend/routes/authRoutes.js`
- `backend/middleware/authMiddleware.js`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Signup.jsx`
- `frontend/src/context/AuthContext.jsx`

### How it works — Step by Step

**Step 1 — User fills the Signup form**
The user enters their name, email, password, and picks a role (Customer or Shop Owner). If they choose Shop Owner, they also fill in their shop name and address.

**Step 2 — Backend saves the user**
The `register` function in `authController.js` does this:
```
1. Check if the email already exists → if yes, return error
2. Hash the password using bcryptjs (so it is never stored as plain text)
3. If the role is shop_owner, set shopStatus = 'pending' (needs admin approval)
4. Save the new user to the database
5. If customer → create a JWT token and send it back
   If shop_owner → do NOT send a token (they must wait for approval)
```

**Step 3 — User fills the Login form**
The user enters email and password.

**Step 4 — Backend checks credentials**
```
1. Find the user by email in the database
2. Use bcryptjs.compare() to check if the password matches
3. If shop_owner and shopStatus is NOT 'approved' → return 403 error
4. Create a JWT token (valid for 30 days) and return it
```

**Step 5 — Frontend stores the token**
`AuthContext.jsx` saves the token and user info in `localStorage`. Every API request then sends this token in the `Authorization` header.

**Step 6 — Protected routes**
`authMiddleware.js` runs before any protected API. It:
```
1. Reads the token from the Authorization header
2. Verifies the token using the JWT_SECRET
3. If valid → adds user info to the request and continues
4. If invalid/missing → returns 401 Unauthorized
```

**Step 7 — Role-based navigation**
In `App.jsx`, after login the user is redirected based on their role:
- `customer` → `/dashboard`
- `shop_owner` → `/shop-dashboard`
- `admin` → `/admin-dashboard`
- `rider` → `/rider-dashboard`

---

## 2. File Upload Module

**What it does:** Lets customers upload their document (PDF, Word, or image) so it can be printed.

**Files involved:**
- `backend/server.js` (multer configuration)
- `backend/controllers/orderController.js`
- `backend/uploads/` (where files are saved)

### How it works — Step by Step

**Step 1 — Frontend sends the file**
When a customer selects a file and clicks "Place Order", the form is submitted as `multipart/form-data` (a special format for sending files over HTTP).

**Step 2 — Multer receives the file**
`multer` is a Node.js middleware that handles file uploads. It is configured in `server.js`:
```
- Storage: files are saved to the backend/uploads/ folder
- Filename: a UUID (random ID) is added to the filename to avoid conflicts
- Allowed types: only .pdf, .docx, .png, .jpg files are accepted
- Max size: 10MB
```

**Step 3 — File is saved on disk**
The file is physically stored in `backend/uploads/`. For example:
```
uploads/a3b9c1d2-report.pdf
```

**Step 4 — File URL is saved in the Order**
The order record in the database stores `fileUrl` — the path to the uploaded file. This is later used for printing or conversion.

**Step 5 — Serving the file**
The backend serves the uploads folder as static files:
```js
app.use('/uploads', express.static('uploads'));
```
So the file can be accessed at `http://localhost:5000/uploads/filename.pdf`.

---

## 3. Order Management Module

**What it does:** Handles placing new orders, viewing orders, updating order status, and cancelling orders.

**Files involved:**
- `backend/controllers/orderController.js`
- `backend/models/Order.js`
- `backend/routes/orderRoutes.js`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/OrderHistory.jsx`

### The Order Data Structure (Order.js)

Each order in the database has these fields:

| Field | What it stores |
|-------|---------------|
| `user` | Who placed the order (customer ID) |
| `fileName` | Original name of the uploaded file |
| `fileUrl` | Path to the saved file |
| `printType` | `black-white` or `color` |
| `paperSize` | `A4`, `A3`, `Letter` |
| `copies` | Number of copies |
| `printSides` | `single` or `double` |
| `paperType` | `normal`, `glossy`, or `matte` |
| `binding` | `none`, `staple`, or `spiral` |
| `totalPrice` | Calculated price in Rs. |
| `status` | `pending`, `processing`, `completed`, `cancelled` |
| `deliveryAddress` | Where to deliver |
| `rider` | Assigned rider ID |
| `deliveryStatus` | `assigned`, `picked_up`, `delivered` |

### How it works — Step by Step

**Step 1 — Customer fills the order form (Dashboard.jsx)**
The customer uploads a file, selects print options (color, paper size, copies, etc.), enters their delivery address, and clicks "Place Order".

**Step 2 — Price is calculated on the frontend**
Before submitting, the `calculatePrice()` function runs:
```
1. Get the per-page price based on printType + paperType (from live pricing)
2. Multiply by number of pages × copies
3. If double-sided: add 60% surcharge per page
4. If binding is selected: add flat binding fee
5. Show the total to the customer
```

**Step 3 — Backend creates the order**
`createOrder` in `orderController.js`:
```
1. Get the uploaded file info from multer
2. Read all print options from the request body
3. Recalculate the total price on the server (security check)
4. Save the new order to the database with status = 'pending'
5. Send a confirmation email to the customer
```

**Step 4 — Customer views order history (OrderHistory.jsx)**
The `GET /api/orders/my-orders` endpoint returns all orders belonging to the logged-in customer.

**Step 5 — Customer cancels an order**
The customer clicks "Cancel Order" — only allowed if the order status is still `pending`.
```
1. Backend checks the order belongs to this customer
2. Checks status === 'pending'
3. Changes status to 'cancelled'
4. Sends a cancellation email
```

---

## 4. Customer Dashboard & File Preview

**What it does:** Shows the order form to the customer and lets them preview their uploaded file before submitting.

**Files involved:**
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Dashboard.css`

### How it works — Step by Step

**Step 1 — Page loads and fetches live pricing**
When the Dashboard page opens, it immediately calls `GET /api/pricing` to get the latest print prices set by the shop owner.

**Step 2 — Customer selects a file**
When the customer picks a file, the `handleFileChange` function runs:
```
1. Save the file to state
2. If the file is a PDF → create a temporary browser URL (createObjectURL)
3. If the file is an image (JPG/PNG) → create a temporary browser URL
4. If the file is a Word document (.docx) → just show a document icon
5. Display the preview panel on the right side of the screen
```

**Step 3 — File preview is shown**
- **PDF files:** displayed in an `<iframe>` so the customer can scroll through pages
- **Images:** displayed as a `<img>` thumbnail
- **Word files:** shows a blue card with the filename and a document icon (Word files cannot be previewed directly in the browser)

**Step 4 — Price updates live**
Every time the customer changes any print option (color, copies, paper type, etc.), the `calculatePrice()` function re-runs and updates the displayed price immediately.

**Step 5 — Form is submitted**
When the customer clicks "Place Order", all form fields + the file are sent to the backend as a multipart form.

---

## 5. Dynamic Pricing Module

**What it does:** Lets the shop owner set their own per-page prices for different print types. These prices are then used when customers place orders.

**Files involved:**
- `backend/models/PrintPricing.js`
- `backend/controllers/pricingController.js`
- `backend/routes/pricingRoutes.js`
- `frontend/src/pages/ShopDashboard.jsx` (Pricing tab)
- `frontend/src/pages/Dashboard.jsx` (reads prices)

### Default Prices (Rs.)

| Print Type | Paper | Price per page |
|------------|-------|---------------|
| Black & White | Normal | Rs. 3 |
| Black & White | Glossy | Rs. 5 |
| Black & White | Matte | Rs. 5 |
| Color | Normal | Rs. 10 |
| Color | Glossy | Rs. 15 |
| Color | Matte | Rs. 15 |
| Staple Binding | — | Rs. 10 (flat) |
| Spiral Binding | — | Rs. 30 (flat) |

### How it works — Step by Step

**Step 1 — Shop owner opens the Pricing tab**
The ShopDashboard loads the current prices from `GET /api/pricing/my` (their own pricing record).

**Step 2 — Shop owner changes the prices**
Each price field is an input box. When a value is changed, `handlePricingChange` updates the local state.

**Step 3 — Shop owner saves the prices**
On "Save Prices", a `PUT /api/pricing/my` request is sent to the backend with all prices.
```
Backend does:
1. Find the pricing record for this shop owner (by their user ID)
2. If a record exists → update it
3. If no record exists → create a new one (upsert)
4. Return the saved prices
```

**Step 4 — Customer sees updated prices**
When a customer opens the Dashboard, it calls `GET /api/pricing` (public endpoint) which returns the current shop prices. The price calculator then uses these real values.

---

## 6. Shop Owner Dashboard

**What it does:** Shows the shop owner their incoming order queue, lets them update order status, set print prices, and view earnings reports.

**Files involved:**
- `frontend/src/pages/ShopDashboard.jsx`
- `backend/controllers/orderController.js` (getAllOrders, updateOrderStatus)

### Four Tabs

**Overview Tab**
- Shows total orders, pending count, completed count, and total revenue as stat cards
- Shows a bar chart (Chart.js) of orders by status

**Queue Tab**
- Lists all customer orders with their details
- The shop owner can change an order's status:
  - `pending` → `processing` (we started printing)
  - `processing` → `completed` (printing done, ready for delivery)
- Clicking an order opens a detail modal with the full order info

**Pricing Tab**
- Shows input fields for each price category
- Shop owner types new prices and clicks "Save Prices"
- See Module 5 above for details

**Earnings Report Tab**
- Shop owner picks a date range (From / To)
- Clicks "Generate Report"
- The app filters all orders within that date range
- Shows summary cards: total orders, completed, pending, total earnings
- Shows a table of each individual order
- A "Export CSV" button downloads the data as a spreadsheet

---

## 7. Admin Dashboard

**What it does:** Gives the administrator full control — view all orders, manage all users, approve or disable shop owners, and generate system-wide reports.

**Files involved:**
- `frontend/src/pages/AdminDashboard.jsx`
- `backend/controllers/authController.js` (approveShop, disableShop)
- `backend/controllers/orderController.js` (getAllOrders)

### Five Tabs

**Overview Tab**
- Total orders, users, revenue stat cards
- Line chart of orders over the last 7 days

**Orders Tab**
- Table of all orders in the system (with pagination)
- Admin can search by customer name
- Clicking an order shows full details and lets the admin assign a rider

**Shop Approvals Tab**
- Lists all users with the role `shop_owner`
- Shows their shop name, address, and current status (pending/approved/disabled)
- Two action buttons:
  - **Approve** → sets shopStatus to `approved`, shop owner can now log in
  - **Disable** → sets shopStatus to `disabled`, blocks login

**Manage Users Tab**
- Lists all registered users
- Admin can delete a user account

**Reports Tab**
- Same as the shop earnings report but covers ALL orders from ALL shops
- Admin picks a date range → sees total orders, completed, cancelled, total revenue
- Can export to CSV

### How Shop Approval Works — Step by Step
```
1. Shop owner registers → their account is saved with shopStatus = 'pending'
2. They see a "pending approval" message, cannot log in yet
3. Admin opens the "Shop Approvals" tab and sees the pending shop
4. Admin clicks "Approve"
5. Backend sets shopStatus = 'approved' for that user
6. Shop owner can now log in normally
```

---

## 8. Rider Delivery Module

**What it does:** Lets riders see orders assigned to them and update the delivery status as they deliver.

**Files involved:**
- `frontend/src/pages/RiderDashboard.jsx`
- `backend/controllers/orderController.js` (assignRider, updateDeliveryStatus)

### How it works — Step by Step

**Step 1 — Admin assigns a rider**
When the admin views an order, they see a dropdown of available riders. They select one and click "Assign". The backend:
```
1. Sets order.rider = selected rider's ID
2. Sets order.deliveryStatus = 'assigned'
3. The order now appears in the rider's dashboard
```

**Step 2 — Rider opens their dashboard**
`GET /api/orders/my-deliveries` returns all orders assigned to the logged-in rider.

**Step 3 — Rider updates delivery status**
As the rider progresses, they update the status:
- **Assigned** → means the order is ready for pickup from the shop
- **Picked Up** → rider has collected the printed order from the shop
- **Delivered** → rider has delivered to the customer's address

**Step 4 — Customer gets a notification**
Each status change triggers an email notification to the customer.

---

## 9. Email Notification Module

**What it does:** Sends automatic emails to users when important events happen (order placed, status changed, password reset, etc.).

**Files involved:**
- `backend/utils/sendEmail.js` (or inside controllers using nodemailer directly)
- Uses the `nodemailer` npm package

### How it works — Step by Step

**Step 1 — A controller needs to send an email**
For example, when an order is placed, `createOrder` calls `sendEmail()`.

**Step 2 — sendEmail creates a transporter**
```js
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});
```

**Step 3 — Email is sent**
```js
transporter.sendMail({
  from: EMAIL_USER,
  to: customer.email,
  subject: 'Order Confirmation',
  html: '<p>Your order has been placed!</p>'
});
```

**Step 4 — Graceful fallback**
If no email credentials are set in `.env`, instead of crashing the server, the email is simply printed to the console (so development works without Gmail setup).

### Emails that are sent
- Order placed confirmation
- Order status changed (processing, completed)
- Order cancelled
- Delivery status updates (picked up, delivered)
- Password reset link

---

## 10. File Conversion Module

**What it does:** Automatically converts uploaded Word (.docx) files into PDF format so they can be printed properly.

**Files involved:**
- `backend/controllers/orderController.js` (conversion logic)
- Uses `mammoth` and `puppeteer-core` npm packages

### How it works — Step by Step

**Step 1 — Customer uploads a .docx file**
The file is saved to `backend/uploads/` by multer.

**Step 2 — Mammoth converts DOCX to HTML**
```
mammoth reads the Word file and converts it to HTML text
Result: <h1>Title</h1><p>Content...</p>
```
Mammoth preserves most formatting — headings, bold, italic, tables, etc.

**Step 3 — Puppeteer converts HTML to PDF**
```
Puppeteer launches a headless Chrome browser (invisible browser)
It loads the HTML content
It "prints" the page to a PDF file
The PDF is saved to backend/uploads/ with a new filename
```

**Step 4 — Order record is updated**
```
order.fileUrl = path to the new PDF
order.converted = true
```

**Step 5 — The PDF is now ready for printing**
The shop owner can download or view the PDF version of the original Word document.

---

## 11. Auto-Deletion Module

**What it does:** Automatically deletes old completed and cancelled orders (and their uploaded files) every day at 2:00 AM to keep the database and storage clean.

**Files involved:**
- `backend/server.js` (cron job setup)
- Uses `node-cron` npm package

### How it works — Step by Step

**Step 1 — Server starts a scheduled task**
When the backend server starts, `node-cron` registers a job:
```js
cron.schedule('0 2 * * *', cleanupOldOrders);
// Runs every day at 2:00 AM
```

**Step 2 — At 2:00 AM, the cleanup function runs**
```
1. Find all orders with status 'completed' or 'cancelled'
   that were last updated more than 30 days ago
2. For each order:
   a. Delete the uploaded file from the uploads/ folder
   b. Delete the order record from the database
3. Log how many orders were cleaned up
```

**Step 3 — Files are removed from disk**
```js
fs.unlink(filePath, callback)
```
This permanently deletes the file from the server's hard drive.

**Why this is important:**
- Prevents unlimited storage growth
- Keeps the database lean and fast
- Removes user files after a reasonable time (privacy)

---

## 12. Reports Module

**What it does:** Lets shop owners see their earnings and lets the admin see system-wide statistics for any selected date range.

**Files involved:**
- `frontend/src/pages/ShopDashboard.jsx` (Earnings tab)
- `frontend/src/pages/AdminDashboard.jsx` (Reports tab)
- `backend/controllers/orderController.js` (getAllOrders)

### How it works — Step by Step

**Step 1 — User picks a date range**
Two date input fields: "From" and "To". The user selects the start and end dates.

**Step 2 — Fetch all orders**
The frontend calls `GET /api/orders/all` which returns all orders in the system (up to 1000).

**Step 3 — Filter by date on the frontend**
```js
const filtered = orders.filter(order => {
  const date = new Date(order.createdAt);
  return date >= new Date(fromDate) && date <= new Date(toDate);
});
```

**Step 4 — Calculate summary statistics**
```
- Total orders = filtered.length
- Completed = orders where status === 'completed'
- Cancelled = orders where status === 'cancelled'
- Revenue = sum of totalPrice for completed orders only
```

**Step 5 — Display results**
- Summary stat cards (animated)
- A table listing every individual order with status and price

**Step 6 — Export to CSV**
The "Export CSV" button creates a text file in CSV format:
```
Order ID,Customer,Print Type,Copies,Status,Total,Date
abc123,Ali Ahmed,color,2,completed,450,2025-04-15
...
```
A download link is created in the browser and the file saves automatically.

---

## 13. Theme & Global State

**What it does:** Manages two global pieces of state that every page needs: (1) who is logged in, and (2) whether dark or light mode is active.

**Files involved:**
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/context/ThemeContext.jsx`
- `frontend/src/index.css` (CSS variables)

### AuthContext — How it works

**What it stores:**
- `user` — the logged-in user object `{ id, name, email, role }`
- `token` — the JWT string

**On page load:**
```
1. Check localStorage for a saved token
2. If found → decode it and restore the user session
3. If not found → user is logged out
```

**On login:**
```
1. Backend returns user + token
2. AuthContext saves both to state and localStorage
3. App.jsx re-renders and redirects to the correct dashboard
```

**On logout:**
```
1. Clear user and token from state
2. Remove from localStorage
3. Redirect to login page
```

### ThemeContext — How it works

**What it stores:** `isDark` — true for dark mode, false for light mode

**Switching themes:**
```
1. User clicks the moon/sun icon in the Navbar
2. ThemeContext toggles isDark
3. Saves preference to localStorage
4. A `data-theme` attribute is set on the <html> element
```

**CSS Variables switch automatically:**
```css
:root {
  --bg-primary: #ffffff;   /* light mode */
  --text-primary: #1a1a2e;
}

[data-theme="dark"] {
  --bg-primary: #0d1117;   /* dark mode */
  --text-primary: #e6edf3;
}
```
Every color in the app uses these CSS variables, so the entire theme switches instantly with one toggle.

---

## Summary — How Everything Connects

```
Customer signs up / logs in
         ↓
AuthContext saves the token
         ↓
Customer goes to Dashboard
         ↓
Fetches live prices from /api/pricing
         ↓
Customer uploads a file → multer saves it
         ↓
Customer fills options → calculatePrice() shows total
         ↓
Customer clicks "Place Order" → backend creates Order record
         ↓
If .docx file → mammoth + puppeteer converts to PDF
         ↓
Shop Owner sees new order in Queue tab
         ↓
Shop Owner changes status → customer gets email
         ↓
Admin assigns a Rider to the order
         ↓
Rider picks up and delivers → customer gets email
         ↓
Order is completed
         ↓
After 30 days → node-cron auto-deletes the order + file
```
