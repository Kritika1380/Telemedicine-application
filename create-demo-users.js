// Script to create demo users in MongoDB for testing
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nabha-connect';

// Demo users data
const demoUsers = [
  {
    firstName: 'Patient',
    lastName: 'Demo',
    email: 'patient@test.com',
    password: 'test123',
    phone: '+1234567890',
    dob: new Date('1990-01-01'),
    gender: 'male',
    role: 'patient'
  },
  {
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    email: 'doctor@test.com',
    password: 'test123',
    phone: '+1234567891',
    dob: new Date('1985-05-15'),
    gender: 'female',
    role: 'doctor'
  },
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    password: 'test123',
    phone: '+1234567892',
    dob: new Date('1980-08-20'),
    gender: 'other',
    role: 'admin'
  }
];

async function createDemoUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Check if demo users already exist
    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⊘ User ${userData.email} already exists - skipping`);
      } else {
        const user = new User(userData);
        await user.save();
        console.log(`✓ Created demo user: ${userData.email} (${userData.role})`);
      }
    }

    console.log('\n✓ Demo users setup complete!');
    console.log('\nYou can now login with:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Patient: patient@test.com / test123');
    console.log('Doctor:  doctor@test.com / test123');
    console.log('Admin:   admin@test.com / test123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating demo users:', error);
    process.exit(1);
  }
}

// Run the script
createDemoUsers();
