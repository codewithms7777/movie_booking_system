let selectedSeats = [];
let selectedMovie = '';
let selectedMoviePrice = 0;
let bookedSeats = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    showDashboard();
});

// Authentication functions
function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const userName = localStorage.getItem("userName");
    const welcomeBox = document.getElementById("welcome-msg");
    const logoutBtn = document.getElementById("logout-btn");
    const loginBtn = document.getElementById("login-btn");
    const signupBtn = document.getElementById("signup-btn");

    if (isLoggedIn && userName) {
        welcomeBox.innerHTML = `👋 Welcome, <strong>${userName}</strong>! Enjoy your movie experience 🎬`;
        welcomeBox.classList.remove("hidden");
        logoutBtn.classList.remove("hidden");
        loginBtn.classList.add("hidden");
        signupBtn.classList.add("hidden");
    } else {
        welcomeBox.classList.add("hidden");
        logoutBtn.classList.add("hidden");
        loginBtn.classList.remove("hidden");
        signupBtn.classList.remove("hidden");
    }
}

function logout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    checkAuthStatus();
    showDashboard();
    Swal.fire("Logged out", "You have been successfully logged out", "success");
}

// Navigation functions
function showDashboard() {
    hideAllSections();
    document.getElementById('dashboard-section').classList.remove('hidden');
}

function startBooking() {
    if (!isUserLoggedIn()) {
        Swal.fire({
            title: "Login Required",
            text: "Please login to book tickets",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Login",
            cancelButtonText: "Cancel"
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = "login.html";
            }
        });
        return;
    }
    hideAllSections();
    document.getElementById('movie-section').classList.remove('hidden');
}

function selectMovie(movieName, price) {
    selectedMovie = movieName;
    selectedMoviePrice = price;
    hideAllSections();
    document.getElementById('seat-section').classList.remove('hidden');
    
    document.getElementById('selected-movie-name').textContent = movieName;
    document.getElementById('summary-movie').textContent = movieName;
    document.getElementById('payment-movie').textContent = movieName;
    
    createSeatGrid();
    updateAvailableSeats();
}

function createSeatGrid() {
    const grid = document.getElementById('seats-grid');
    grid.innerHTML = '';
    const rows = ['A', 'B', 'C', 'D', 'E'];
    const cols = 8;

    rows.forEach(row => {
        for (let i = 1; i <= cols; i++) {
            const seat = document.createElement('div');
            const seatId = `${row}${i}`;
            seat.classList.add('seat', 'available');
            seat.id = `seat-${seatId}`;
            seat.textContent = i;
            seat.onclick = () => toggleSeat(seatId, seat);
            grid.appendChild(seat);
        }
    });
}

async function updateAvailableSeats() {
    const showTime = document.getElementById('show-time').value;
    
    try {
        const response = await fetch(`/api/available-seats/${encodeURIComponent(selectedMovie)}/${encodeURIComponent(showTime)}`);
        const data = await response.json();
        
        if (response.ok) {
            bookedSeats = data.bookedSeats;
            updateSeatDisplay();
        }
    } catch (error) {
        console.error('Error fetching available seats:', error);
    }
}

function updateSeatDisplay() {
    const seats = document.querySelectorAll('.seat');
    seats.forEach(seat => {
        const seatId = seat.id.replace('seat-', '');
        
        if (bookedSeats.includes(seatId)) {
            seat.classList.remove('available', 'selected');
            seat.classList.add('occupied');
        } else if (selectedSeats.includes(seatId)) {
            seat.classList.remove('available', 'occupied');
            seat.classList.add('selected');
        } else {
            seat.classList.remove('selected', 'occupied');
            seat.classList.add('available');
        }
    });
}

function toggleSeat(seatId, seatElement) {
    if (bookedSeats.includes(seatId)) {
        Swal.fire("Seat Unavailable", "This seat is already booked", "warning");
        return;
    }

    if (selectedSeats.includes(seatId)) {
        selectedSeats = selectedSeats.filter(s => s !== seatId);
        seatElement.classList.remove('selected');
        seatElement.classList.add('available');
    } else {
        if (selectedSeats.length >= 6) {
            Swal.fire("Maximum Seats", "You can select up to 6 seats", "info");
            return;
        }
        selectedSeats.push(seatId);
        seatElement.classList.remove('available');
        seatElement.classList.add('selected');
    }
    
    updateBookingSummary();
}

function updateBookingSummary() {
    const showTime = document.getElementById('show-time').value;
    const totalAmount = selectedSeats.length * selectedMoviePrice;
    
    document.getElementById('summary-seats').textContent = selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None';
    document.getElementById('summary-time').textContent = showTime;
    document.getElementById('summary-amount').textContent = totalAmount;
    
    document.getElementById('payment-seats').textContent = selectedSeats.join(', ');
    document.getElementById('payment-time').textContent = showTime;
    document.getElementById('payment-amount').textContent = totalAmount;
}

function goToPayment() {
    if (selectedSeats.length === 0) {
        Swal.fire("No Seats Selected", "Please select at least one seat", "warning");
        return;
    }
    
    hideAllSections();
    document.getElementById('payment-section').classList.remove('hidden');
    document.getElementById('amount').textContent = selectedSeats.length * selectedMoviePrice;
}

async function confirmBooking() {
    // Validate payment details
    const cardNumber = document.getElementById('card-number').value;
    const cardName = document.getElementById('card-name').value;
    const cardExpiry = document.getElementById('card-expiry').value;
    const cardCvv = document.getElementById('card-cvv').value;

    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
        Swal.fire("Incomplete Details", "Please fill all payment details", "warning");
        return;
    }

    if (cardNumber.length !== 16) {
        Swal.fire("Invalid Card", "Please enter a valid 16-digit card number", "warning");
        return;
    }

    const showTime = document.getElementById('show-time').value;
    const totalAmount = selectedSeats.length * selectedMoviePrice;
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');

    if (!isUserLoggedIn()) {
        Swal.fire("Login Required", "Please login to confirm booking", "error");
        window.location.href = "login.html";
        return;
    }

    const bookingData = {
        userName,
        userEmail,
        movieName: selectedMovie,
        seats: selectedSeats,
        showTime: showTime,
        totalAmount: totalAmount,
    };

    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData),
        });
        
        const result = await response.json();

        if (response.ok) {
            showConfirmation(result.booking, result.bookingId);
        } else {
            Swal.fire("Booking Failed", result.message || "Error confirming booking", "error");
        }
    } catch (error) {
        Swal.fire("Error", "Network error. Please try again.", "error");
        console.error('Booking error:', error);
    }
}

function showConfirmation(booking, bookingId) {
    hideAllSections();
    document.getElementById('confirmation-section').classList.remove('hidden');
    
    document.getElementById('confirm-movie').textContent = booking.movieName;
    document.getElementById('confirm-seats').textContent = booking.seats.join(', ');
    document.getElementById('confirm-time').textContent = booking.showTime;
    document.getElementById('confirm-amount').textContent = booking.totalAmount;
    document.getElementById('confirm-email').textContent = booking.userEmail;
    document.getElementById('confirm-booking-id').textContent = bookingId;
}

async function viewBookings() {
    const userEmail = localStorage.getItem('userEmail');
    
    if (!userEmail) {
        Swal.fire("Error", "Please login to view bookings", "error");
        return;
    }

    try {
        const response = await fetch(`/api/bookings/${userEmail}`);
        const bookings = await response.json();

        hideAllSections();
        document.getElementById('bookings-section').classList.remove('hidden');
        
        const bookingsList = document.getElementById('bookings-list');
        bookingsList.innerHTML = '';

        if (bookings.length === 0) {
            bookingsList.innerHTML = '<p>No bookings found</p>';
            return;
        }

        bookings.forEach(booking => {
            const bookingItem = document.createElement('div');
            bookingItem.className = 'booking-item';
            bookingItem.innerHTML = `
                <h3>${booking.movieName}</h3>
                <p>Seats: ${booking.seats.join(', ')}</p>
                <p>Time: ${booking.showTime}</p>
                <p>Amount: ₹${booking.totalAmount}</p>
                <p>Date: ${new Date(booking.bookingDate).toLocaleDateString()}</p>
                <p>Booking ID: ${booking.bookingId}</p>
            `;
            bookingsList.appendChild(bookingItem);
        });

    } catch (error) {
        console.error('Error fetching bookings:', error);
        Swal.fire("Error", "Failed to load bookings", "error");
    }
}

// Utility functions
function hideAllSections() {
    const sections = document.querySelectorAll('main > section');
    sections.forEach(section => section.classList.add('hidden'));
}

function isUserLoggedIn() {
    return localStorage.getItem("isLoggedIn") === "true";
}

// Navigation back functions
function goBackToDashboard() {
    showDashboard();
}

function goBackToMovies() {
    hideAllSections();
    document.getElementById('movie-section').classList.remove('hidden');
}

function goBackToSeats() {
    hideAllSections();
    document.getElementById('seat-section').classList.remove('hidden');
}

function goToDashboard() {
    showDashboard();
}