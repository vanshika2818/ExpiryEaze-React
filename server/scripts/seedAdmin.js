const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './.env' }); // Assuming we run from server/ directory
const User = require('../models/User'); // if run from scripts/ directory

const seedAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.log('No MONGO_URI, running local load');
      require('dotenv').config({ path: '../.env' });
    }
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('CRITICAL: ADMIN_EMAIL or ADMIN_PASSWORD missing from .env');
      process.exit(1);
    }

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('Admin user already exists! Email:', adminEmail);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const admin = new User({
      name: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isMedicineVerified: true,
      profileCompleted: true
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password: [SECURELY STORED - CHECK .ENV]');

  } catch (err) {
    console.error('Failed to seed admin:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

seedAdmin();
