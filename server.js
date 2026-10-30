const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

// Import models
const User = require('./models/User');
const Consultation = require('./models/Consultation');
const Appointment = require('./models/Appointment');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nabha-connect';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✓ MongoDB connected successfully'))
.catch(err => console.error('✗ MongoDB connection error:', err));

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ ok: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Serve static site files
const staticDir = path.join(__dirname);
app.use(express.static(staticDir));

// Login endpoint with MongoDB
app.post('/api/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      console.log('Login failed: missing credentials');
      return res.json({ ok: false, message: 'Email and password required' });
    }

    // Find user in database
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('Login failed: user not found');
      return res.json({ ok: false, message: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.json({ ok: false, message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      console.log('Login failed: invalid password');
      return res.json({ ok: false, message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Login successful:', { email: user.email, role: user.role });
    
    return res.json({ 
      ok: true, 
      token, 
      role: user.role, 
      name: user.firstName,
      userId: user._id
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ ok: false, message: 'Server error during login' });
  }
})

app.post('/api/logout', (req,res)=>{
  return res.json({ ok:true })
})

app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, dob, gender, role } = req.body || {};
    
    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      return res.json({ ok: false, message: 'Please fill all required fields' });
    }
    
    if (password.length < 6) {
      return res.json({ ok: false, message: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      return res.json({ ok: false, message: 'Email already registered' });
    }

    // Create new user (password will be hashed by the pre-save hook)
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      phone,
      dob: dob ? new Date(dob) : undefined,
      gender,
      role: role || 'patient'
    });

    await newUser.save();
    
    console.log('New registration successful:', { 
      firstName, 
      lastName, 
      email: newUser.email, 
      role: newUser.role 
    });
    
    return res.json({ 
      ok: true, 
      message: 'Registration successful',
      userId: newUser._id
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      return res.json({ ok: false, message: 'Email already registered' });
    }
    
    return res.status(500).json({ 
      ok: false, 
      message: 'Server error during registration' 
    });
  }
})

app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    
    // Fetch user details
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }
  
  // DOCTOR DASHBOARD
  if (role === 'doctor') {
    // Fetch real data from database
    const pendingConsultations = await Consultation.find({ 
      doctor: userId, 
      status: 'pending' 
    })
    .populate('patient', 'firstName lastName')
    .limit(5);
    
    const completedConsultations = await Consultation.find({ 
      doctor: userId, 
      status: 'completed' 
    })
    .populate('patient', 'firstName lastName')
    .sort({ completedAt: -1 })
    .limit(10);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayConsults = await Consultation.countDocuments({
      doctor: userId,
      status: 'completed',
      completedAt: { $gte: todayStart }
    });
    
    const scheduledAppointments = await Appointment.countDocuments({
      doctor: userId,
      status: 'scheduled',
      scheduledDate: { $gte: new Date() }
    });
    const mainHtml = `
      <div style="margin-top:1.5rem;">
        <h3 style="margin-bottom:1rem;">Patient Queue</h3>
        <div style="display:grid;gap:1rem;">
          <div class="card" style="padding:1rem;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h4 style="margin:0;color:#0f172a;">John Doe <span style="background:#fef3c7;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.8rem;color:#92400e;margin-left:0.5rem;">Urgent</span></h4>
              <p style="margin:0.25rem 0;color:#6b7280;">Age: 45 | Symptoms: Fever, Cough, Body Ache</p>
              <p style="margin:0.25rem 0;font-size:0.85rem;color:#6b7280;">Waiting for: 15 mins</p>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-primary" style="font-size:0.9rem;" onclick="window.startVideoCall && window.startVideoCall('John Doe')">
                <i class="fas fa-video"></i> Start Call
              </button>
              <button class="btn btn-secondary" style="font-size:0.9rem;" onclick="window.viewPatientRecords && window.viewPatientRecords('John Doe')">
                <i class="fas fa-file-medical"></i> View Records
              </button>
            </div>
          </div>
          <div class="card" style="padding:1rem;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h4 style="margin:0;color:#0f172a;">Sarah Miller <span style="background:#dbeafe;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.8rem;color:#1e3a8a;margin-left:0.5rem;">Routine</span></h4>
              <p style="margin:0.25rem 0;color:#6b7280;">Age: 32 | Symptoms: Headache, Fatigue</p>
              <p style="margin:0.25rem 0;font-size:0.85rem;color:#6b7280;">Waiting for: 8 mins</p>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-primary" style="font-size:0.9rem;" onclick="window.startVideoCall && window.startVideoCall('Sarah Miller')">
                <i class="fas fa-video"></i> Start Call
              </button>
              <button class="btn btn-secondary" style="font-size:0.9rem;" onclick="window.viewPatientRecords && window.viewPatientRecords('Sarah Miller')">
                <i class="fas fa-file-medical"></i> View Records
              </button>
            </div>
          </div>
        </div>

        <h3 style="margin-top:2rem;margin-bottom:1rem;">Recent Consultations</h3>
        <div class="card" style="padding:1rem;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="text-align:left;border-bottom:1px solid #e5e7eb;">
                <th style="padding:0.5rem;">Patient</th>
                <th style="padding:0.5rem;">Date</th>
                <th style="padding:0.5rem;">Diagnosis</th>
                <th style="padding:0.5rem;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:0.5rem;">Emily Davis</td>
                <td style="padding:0.5rem;">Nov 18, 2025</td>
                <td style="padding:0.5rem;">Common Cold</td>
                <td style="padding:0.5rem;"><span style="background:#dcfce7;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.85rem;color:#166534;">Completed</span></td>
              </tr>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:0.5rem;">Michael Brown</td>
                <td style="padding:0.5rem;">Nov 18, 2025</td>
                <td style="padding:0.5rem;">Hypertension Follow-up</td>
                <td style="padding:0.5rem;"><span style="background:#dcfce7;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.85rem;color:#166534;">Completed</span></td>
              </tr>
              <tr>
                <td style="padding:0.5rem;">Lisa Anderson</td>
                <td style="padding:0.5rem;">Nov 17, 2025</td>
                <td style="padding:0.5rem;">Allergic Reaction</td>
                <td style="padding:0.5rem;"><span style="background:#dcfce7;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.85rem;color:#166534;">Completed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `
    return res.json({ 
      ok: true,
      role: 'doctor', 
      stats: [
        { icon: 'fas fa-users', value: pendingConsultations.length, label: 'Patients Waiting' },
        { icon: 'fas fa-check-circle', value: todayConsults, label: "Today's Consults" },
        { icon: 'fas fa-clock', value: scheduledAppointments, label: 'Scheduled' },
        { icon: 'fas fa-star', value: '4.8', label: 'Rating' }
      ], 
      mainHtml 
    });
  }
  
  // ADMIN DASHBOARD
  if (role === 'admin') {
    // Fetch real statistics
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const totalConsultations = await Consultation.countDocuments();
    const activeConsultations = await Consultation.countDocuments({ status: 'in-progress' });
    const patientsWaiting = await Consultation.countDocuments({ status: 'pending' });
    
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName email role createdAt isActive');
    const mainHtml = `
      <div style="margin-top:1.5rem;">
        <h3 style="margin-bottom:1rem;">System Overview</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem;">
          <div class="card" style="padding:1rem;text-align:center;">
            <i class="fas fa-video fa-2x" style="color:#1e90ff;margin-bottom:0.5rem;"></i>
            <h4 style="margin:0.5rem 0;">24</h4>
            <p style="margin:0;color:#6b7280;font-size:0.9rem;">Active Consultations</p>
          </div>
          <div class="card" style="padding:1rem;text-align:center;">
            <i class="fas fa-user-clock fa-2x" style="color:#f59e0b;margin-bottom:0.5rem;"></i>
            <h4 style="margin:0.5rem 0;">15</h4>
            <p style="margin:0;color:#6b7280;font-size:0.9rem;">Patients Waiting</p>
          </div>
          <div class="card" style="padding:1rem;text-align:center;">
            <i class="fas fa-user-check fa-2x" style="color:#10b981;margin-bottom:0.5rem;"></i>
            <h4 style="margin:0.5rem 0;">42</h4>
            <p style="margin:0;color:#6b7280;font-size:0.9rem;">Doctors Online</p>
          </div>
          <div class="card" style="padding:1rem;text-align:center;">
            <i class="fas fa-dollar-sign fa-2x" style="color:#7c3aed;margin-bottom:0.5rem;"></i>
            <h4 style="margin:0.5rem 0;">$12,450</h4>
            <p style="margin:0;color:#6b7280;font-size:0.9rem;">Today's Revenue</p>
          </div>
        </div>

        <h3 style="margin-bottom:1rem;">Recent User Registrations</h3>
        <div class="card" style="padding:1rem;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="text-align:left;border-bottom:1px solid #e5e7eb;">
                <th style="padding:0.5rem;">Name</th>
                <th style="padding:0.5rem;">Email</th>
                <th style="padding:0.5rem;">Role</th>
                <th style="padding:0.5rem;">Joined</th>
                <th style="padding:0.5rem;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:0.5rem;">Jennifer Smith</td>
                <td style="padding:0.5rem;">jennifer.s@email.com</td>
                <td style="padding:0.5rem;"><span style="background:#dbeafe;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.85rem;">Patient</span></td>
                <td style="padding:0.5rem;">Nov 19, 2025</td>
                <td style="padding:0.5rem;"><span style="background:#dcfce7;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.85rem;color:#166534;">Active</span></td>
              </tr>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:0.5rem;">Dr. Robert Chen</td>
                <td style="padding:0.5rem;">r.chen@email.com</td>
                <td style="padding:0.5rem;"><span style="background:#fce7f3;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.85rem;">Doctor</span></td>
                <td style="padding:0.5rem;">Nov 18, 2025</td>
                <td style="padding:0.5rem;"><span style="background:#dcfce7;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.85rem;color:#166534;">Active</span></td>
              </tr>
              <tr>
                <td style="padding:0.5rem;">Lisa Anderson</td>
                <td style="padding:0.5rem;">lisa.a@email.com</td>
                <td style="padding:0.5rem;"><span style="background:#dbeafe;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.85rem;">Patient</span></td>
                <td style="padding:0.5rem;">Nov 17, 2025</td>
                <td style="padding:0.5rem;"><span style="background:#dcfce7;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.85rem;color:#166534;">Active</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `
    return res.json({ 
      ok: true,
      role: 'admin', 
      stats: [
        { icon: 'fas fa-users', value: totalPatients, label: 'Total Patients' },
        { icon: 'fas fa-user-md', value: totalDoctors, label: 'Active Doctors' },
        { icon: 'fas fa-video', value: totalConsultations, label: 'Total Consultations' },
        { icon: 'fas fa-dollar-sign', value: '$45,890', label: 'Monthly Revenue' }
      ], 
      mainHtml 
    });
  }
  
  // PATIENT DASHBOARD
  const upcomingAppointments = await Appointment.find({
    patient: userId,
    status: 'scheduled',
    scheduledDate: { $gte: new Date() }
  })
  .populate('doctor', 'firstName lastName')
  .sort({ scheduledDate: 1 })
  .limit(5);
  
  const consultationHistory = await Consultation.find({
    patient: userId,
    status: 'completed'
  })
  .populate('doctor', 'firstName lastName')
  .sort({ completedAt: -1 })
  .limit(5);
  
  const totalConsults = await Consultation.countDocuments({ 
    patient: userId, 
    status: 'completed' 
  });
  
  const upcomingCount = await Appointment.countDocuments({
    patient: userId,
    status: 'scheduled',
    scheduledDate: { $gte: new Date() }
  });
  
  const patientMainHtml = `
    <div style="margin-top:1.5rem;">
      <h3 style="margin-bottom:1rem;">Quick Actions</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem;">
        <div class="card" style="padding:1.5rem;text-align:center;cursor:pointer;" onclick="window.startVideoCall && window.startVideoCall('Available Doctor')">
          <i class="fas fa-video fa-2x" style="color:#1e90ff;margin-bottom:0.5rem;"></i>
          <h4 style="margin:0.5rem 0;font-size:1rem;">Start Consultation</h4>
          <p style="margin:0;color:#6b7280;font-size:0.85rem;">Connect with a doctor now</p>
        </div>
        <div class="card" style="padding:1.5rem;text-align:center;cursor:pointer;" onclick="window.openAppointmentModal && window.openAppointmentModal()">
          <i class="fas fa-calendar-plus fa-2x" style="color:#10b981;margin-bottom:0.5rem;"></i>
          <h4 style="margin:0.5rem 0;font-size:1rem;">Book Appointment</h4>
          <p style="margin:0;color:#6b7280;font-size:0.85rem;">Schedule for later</p>
        </div>
        <div class="card" style="padding:1.5rem;text-align:center;cursor:pointer;" onclick="alert('Viewing medical records...')">
          <i class="fas fa-folder-open fa-2x" style="color:#f59e0b;margin-bottom:0.5rem;"></i>
          <h4 style="margin:0.5rem 0;font-size:1rem;">Medical Records</h4>
          <p style="margin:0;color:#6b7280;font-size:0.85rem;">View your history</p>
        </div>
        <div class="card" style="padding:1.5rem;text-align:center;cursor:pointer;" onclick="window.NC && window.NC.showDiseaseMap && window.NC.showDiseaseMap()">
          <i class="fas fa-map-marked-alt fa-2x" style="color:#ef4444;margin-bottom:0.5rem;"></i>
          <h4 style="margin:0.5rem 0;font-size:1rem;">Disease Hotspots</h4>
          <p style="margin:0;color:#6b7280;font-size:0.85rem;">View outbreak map</p>
        </div>
      </div>

      <h3 style="margin-bottom:1rem;">Upcoming Appointments</h3>
      <div style="display:grid;gap:1rem;margin-bottom:2rem;">
        <div class="card" style="padding:1rem;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;gap:1rem;align-items:center;">
            <div style="background:#dbeafe;width:60px;height:60px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <span style="font-size:1.5rem;font-weight:700;color:#1e3a8a;">22</span>
              <span style="font-size:0.75rem;color:#1e3a8a;">NOV</span>
            </div>
            <div>
              <h4 style="margin:0;color:#0f172a;">Dr. Sarah Johnson</h4>
              <p style="margin:0.25rem 0;color:#6b7280;">General Physician • Video Consultation</p>
              <p style="margin:0.25rem 0;font-size:0.9rem;color:#6b7280;"><i class="fas fa-clock"></i> 10:30 AM</p>
            </div>
          </div>
          <button class="btn btn-primary" onclick="window.startVideoCall && window.startVideoCall('Dr. Sarah Johnson')">Join Now</button>
        </div>
        <div class="card" style="padding:1rem;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;gap:1rem;align-items:center;">
            <div style="background:#fef3c7;width:60px;height:60px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <span style="font-size:1.5rem;font-weight:700;color:#92400e;">25</span>
              <span style="font-size:0.75rem;color:#92400e;">NOV</span>
            </div>
            <div>
              <h4 style="margin:0;color:#0f172a;">Dr. Michael Chen</h4>
              <p style="margin:0.25rem 0;color:#6b7280;">Cardiologist • Follow-up</p>
              <p style="margin:0.25rem 0;font-size:0.9rem;color:#6b7280;"><i class="fas fa-clock"></i> 2:00 PM</p>
            </div>
          </div>
          <button class="btn btn-secondary" onclick="window.openAppointmentModal && window.openAppointmentModal()">Manage</button>
        </div>
      </div>

      <h3 style="margin-bottom:1rem;">Recent Consultations</h3>
      <div class="card" style="padding:1rem;">
        <div style="border-bottom:1px solid #f3f4f6;padding:1rem 0;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
              <h4 style="margin:0;color:#0f172a;">Dr. Sarah Johnson</h4>
              <p style="margin:0.25rem 0;color:#6b7280;font-size:0.9rem;">General Physician</p>
              <p style="margin:0.25rem 0;color:#6b7280;font-size:0.85rem;"><i class="fas fa-calendar"></i> Nov 14, 2025</p>
            </div>
            <div style="text-align:right;">
              <span style="background:#dcfce7;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.85rem;color:#166534;display:inline-block;margin-bottom:0.5rem;">Completed</span>
              <button class="btn btn-ghost" style="font-size:0.85rem;" onclick="alert('Viewing details...')">View Details</button>
            </div>
          </div>
        </div>
        <div style="padding:1rem 0;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
              <h4 style="margin:0;color:#0f172a;">Dr. Michael Chen</h4>
              <p style="margin:0.25rem 0;color:#6b7280;font-size:0.9rem;">Cardiologist</p>
              <p style="margin:0.25rem 0;color:#6b7280;font-size:0.85rem;"><i class="fas fa-calendar"></i> Nov 10, 2025</p>
            </div>
            <div style="text-align:right;">
              <span style="background:#dcfce7;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.85rem;color:#166534;display:inline-block;margin-bottom:0.5rem;">Completed</span>
              <button class="btn btn-ghost" style="font-size:0.85rem;" onclick="alert('Viewing details...')">View Details</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  return res.json({ 
    ok: true,
    role: 'patient', 
    stats: [
      { icon: 'fas fa-calendar-check', value: totalConsults, label: 'Total Consultations' },
      { icon: 'fas fa-clock', value: upcomingCount, label: 'Upcoming Appointments' },
      { icon: 'fas fa-prescription', value: 3, label: 'Active Prescriptions' },
      { icon: 'fas fa-file-medical-alt', value: 12, label: 'Medical Reports' }
    ], 
    mainHtml: patientMainHtml 
  });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ 
      ok: false, 
      message: 'Error loading dashboard data' 
    });
  }
});

app.post('/api/symptom', authenticateToken, async (req, res) => {
  try {
    const payload = req.body || {};
    const userId = req.user.userId;
    
    console.log('Symptom submission:', payload);
    
    // Create new consultation
    const consultation = new Consultation({
      patient: userId,
      symptoms: {
        description: payload.description || payload.desc,
        urgency: payload.urgency || 'routine'
      },
      status: 'pending'
    });
    
    await consultation.save();
    
    return res.json({ 
      ok: true, 
      consultId: consultation._id,
      message: 'Consultation request submitted successfully'
    });
  } catch (error) {
    console.error('Symptom submission error:', error);
    return res.status(500).json({ 
      ok: false, 
      message: 'Error submitting consultation request' 
    });
  }
});

app.get('/api/disease-hotspots', (req,res)=>{
  const { lat, lng } = req.query
  // In production, this would query a real disease database
  // For demo, return mock data
  const hotspots = [
    {disease:'Influenza',cases:47,risk:'high',lat:parseFloat(lat)+0.02,lng:parseFloat(lng)-0.01,distance:'2.3 km',direction:'North',trend:'increasing'},
    {disease:'Flu Outbreak',cases:32,risk:'high',lat:parseFloat(lat)+0.015,lng:parseFloat(lng)+0.015,distance:'1.9 km',direction:'Northeast',trend:'stable'},
    {disease:'Dengue',cases:18,risk:'medium',lat:parseFloat(lat)-0.025,lng:parseFloat(lng)+0.01,distance:'3.5 km',direction:'South',trend:'increasing'},
    {disease:'COVID-19 Variant',cases:12,risk:'medium',lat:parseFloat(lat)+0.01,lng:parseFloat(lng)+0.03,distance:'4.1 km',direction:'East',trend:'decreasing'},
    {disease:'Common Cold',cases:8,risk:'low',lat:parseFloat(lat)-0.02,lng:parseFloat(lng)-0.02,distance:'5.8 km',direction:'Northwest',trend:'stable'}
  ]
  return res.json({ ok:true, hotspots, userLocation:{lat,lng} })
})

// Appointment Management Endpoints

// Get user's appointments
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let query = {};
    if (role === 'patient') {
      query.patient = userId;
    } else if (role === 'doctor') {
      query.doctor = userId;
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor', 'firstName lastName email')
      .sort({ scheduledDate: 1 });

    // Format appointments for frontend
    const formattedAppointments = appointments.map(appt => ({
      _id: appt._id,
      doctorName: appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : 'Doctor',
      patientName: appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : 'Patient',
      scheduledDate: appt.scheduledDate,
      type: appt.type,
      status: appt.status,
      reason: appt.reason
    }));

    return res.json({ ok: true, appointments: formattedAppointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return res.status(500).json({ ok: false, message: 'Error loading appointments' });
  }
});

// Book new appointment
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { doctor, type, date, time, reason } = req.body;

    if (!doctor || !type || !date || !time || !reason) {
      return res.json({ ok: false, message: 'All fields are required' });
    }

    // Combine date and time
    const scheduledDate = new Date(`${date}T${time}`);

    // For demo, assign a random doctor from database or use mock ID
    const doctors = await User.find({ role: 'doctor' }).limit(1);
    const doctorId = doctors.length > 0 ? doctors[0]._id : userId; // Fallback to self if no doctors

    const appointment = new Appointment({
      patient: userId,
      doctor: doctorId,
      scheduledDate,
      type,
      status: 'scheduled',
      reason
    });

    await appointment.save();

    return res.json({ 
      ok: true, 
      message: 'Appointment booked successfully',
      appointmentId: appointment._id 
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    return res.status(500).json({ ok: false, message: 'Error booking appointment' });
  }
});

// Cancel appointment
app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const appointmentId = req.params.id;

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.json({ ok: false, message: 'Appointment not found' });
    }

    // Check if user is authorized to cancel
    if (appointment.patient.toString() !== userId && appointment.doctor.toString() !== userId) {
      return res.status(403).json({ ok: false, message: 'Not authorized to cancel this appointment' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    return res.json({ ok: true, message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return res.status(500).json({ ok: false, message: 'Error cancelling appointment' });
  }
});

// Update appointment status
app.patch('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { status } = req.body;

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.json({ ok: false, message: 'Appointment not found' });
    }

    appointment.status = status;
    await appointment.save();

    return res.json({ ok: true, message: 'Appointment updated successfully' });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return res.status(500).json({ ok: false, message: 'Error updating appointment' });
  }
});

const PORT = process.env.PORT || 3000
app.listen(PORT, ()=> console.log(`Nabha Connect demo server running on http://localhost:${PORT}`))
