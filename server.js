const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect('mongodb+srv://mscorp7:mscorp7777@mscorp1.d5y2q.mongodb.net/TicketBooking', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

// Booking Schema
const bookingSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  movieName: { type: String, required: true },
  seats: [{ type: String, required: true }],
  showTime: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  bookingDate: { type: Date, default: Date.now },
  bookingId: { type: String, unique: true }
});

const User = mongoose.model('User', userSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// Generate unique booking ID
function generateBookingId() {
  return 'BK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Auth Middleware (simple version)
const requireAuth = (req, res, next) => {
  const { userEmail } = req.body;
  if (!userEmail) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Routes

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });
    await user.save();
    
    res.json({ message: 'Signup successful', user: { name, email } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    res.json({ 
      message: 'Login successful', 
      name: user.name, 
      email: user.email 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get user bookings
app.get('/api/bookings/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    const bookings = await Booking.find({ userEmail }).sort({ bookingDate: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// Create booking
app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { userName, userEmail, movieName, seats, showTime, totalAmount } = req.body;

    if (!userName || !userEmail || !movieName || !seats || !showTime || !totalAmount) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if seats are already booked
    const existingBookings = await Booking.find({ movieName, showTime });
    const bookedSeats = existingBookings.flatMap(booking => booking.seats);
    
    const alreadyBooked = seats.filter(seat => bookedSeats.includes(seat));
    if (alreadyBooked.length > 0) {
      return res.status(400).json({ 
        message: `Seats ${alreadyBooked.join(', ')} are already booked` 
      });
    }

    const bookingId = generateBookingId();
    const newBooking = new Booking({
      userName,
      userEmail,
      movieName,
      seats,
      showTime,
      totalAmount,
      bookingId
    });

    await newBooking.save();
    
    res.status(201).json({ 
      message: 'Booking confirmed successfully', 
      booking: newBooking,
      bookingId 
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ message: 'Error creating booking' });
  }
});

// Get available seats for a movie and showtime
app.get('/api/available-seats/:movieName/:showTime', async (req, res) => {
  try {
    const { movieName, showTime } = req.params;
    const bookings = await Booking.find({ movieName, showTime });
    const bookedSeats = bookings.flatMap(booking => booking.seats);
    res.json({ bookedSeats });
  } catch (error) {
    console.error('Available seats error:', error);
    res.status(500).json({ message: 'Error fetching available seats' });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});