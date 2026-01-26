# Quick Start Guide - Online Printing System

## Step 1: Install Dependencies

### Backend
```powershell
cd backend
npm install
```

### Frontend
```powershell
cd frontend
npm install
```

## Step 2: Setup MongoDB

### Option 1: Local MongoDB
1. Install MongoDB from https://www.mongodb.com/try/download/community
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/online-printing`

### Option 2: MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string and update in backend/.env

## Step 3: Configure Environment

Update `backend/.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/online-printing
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

## Step 4: Run the Application

### Terminal 1 - Backend
```powershell
cd backend
npm run dev
```
Backend runs on: http://localhost:5000

### Terminal 2 - Frontend
```powershell
cd frontend
npm run dev
```
Frontend runs on: http://localhost:3000

## Step 5: Test the Application

1. Open browser and go to http://localhost:3000
2. Click "Sign Up" to create a new account
3. Login with your credentials
4. Upload a document and place an order
5. Check "My Orders" to see order history

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check connection string in .env file
- For Windows, start MongoDB service from Services

### Port Already in Use
- Change PORT in backend/.env
- Change port in frontend/vite.config.js

### Dependencies Error
- Delete node_modules folder
- Delete package-lock.json
- Run `npm install` again

## Development Tips

### Backend API Testing
Use Postman or Thunder Client to test API endpoints:
- POST http://localhost:5000/api/auth/register
- POST http://localhost:5000/api/auth/login
- GET http://localhost:5000/api/orders/my-orders (with Bearer token)

### Frontend Development
- Hot reload is enabled
- Changes reflect automatically
- Check browser console for errors

## Features to Test

1. **Landing Page**
   - Smooth scrolling
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
