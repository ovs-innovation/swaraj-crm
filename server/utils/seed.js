import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AreaManager from '../models/AreaManager.js';
import Dealer from '../models/Dealer.js';
import Settings from '../models/Settings.js';

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vastora-crm');
  console.log('Connected to MongoDB');

  await Promise.all([
    User.deleteMany(),
    AreaManager.deleteMany(),
    Dealer.deleteMany(),
    Settings.deleteMany(),
  ]);

  try {
    await Dealer.collection.dropIndexes();
  } catch {
    // collection may not exist yet
  }

  const superPassword = await bcrypt.hash('super123', 10);
  await User.create({
    name: 'Super Admin',
    email: 'superadmin@vastora.com',
    password: superPassword,
    role: 'super_admin',
    status: 'active',
  });

  const adminPassword = await bcrypt.hash('admin123', 10);
  await User.create({
    name: 'Head Office Admin',
    email: 'admin@vastora.com',
    password: adminPassword,
    role: 'admin',
    status: 'active',
  });

  const amPassword = await bcrypt.hash('manager123', 10);
  const amUser = await User.create({
    name: 'Rajesh Kumar',
    email: 'rajesh@vastora.com',
    password: amPassword,
    role: 'area_manager',
    status: 'active',
  });

  const areaManager = await AreaManager.create({
    employeeId: 'AM001',
    name: 'Rajesh Kumar',
    email: 'rajesh@vastora.com',
    mobile: '9876543210',
    state: 'Punjab',
    district: 'Ludhiana',
    user: amUser._id,
  });

  amUser.areaManagerRef = areaManager._id;
  await amUser.save();

  const am2Password = await bcrypt.hash('manager123', 10);
  const am2User = await User.create({
    name: 'Suresh Singh',
    email: 'suresh@vastora.com',
    password: am2Password,
    role: 'area_manager',
    status: 'active',
  });

  const areaManager2 = await AreaManager.create({
    employeeId: 'AM002',
    name: 'Suresh Singh',
    email: 'suresh@vastora.com',
    mobile: '9876543211',
    state: 'Haryana',
    district: 'Karnal',
    user: am2User._id,
  });

  am2User.areaManagerRef = areaManager2._id;
  await am2User.save();

  await Dealer.insertMany([
    {
      dealerName: 'Vastora Tractors Ludhiana',
      dealerCode: 'DLR001',
      contactPerson: 'Amit Sharma',
      mobile: '9812345678',
      email: 'amit@vastora.com',
      address: 'GT Road, Ludhiana',
      state: 'Punjab',
      district: 'Ludhiana',
      city: 'Ludhiana',
      pincode: '141001',
      preferredLanguage: 'Punjabi',
      areaManager: areaManager._id,
      status: 'active',
    },
    {
      dealerName: 'Vastora Karnal',
      dealerCode: 'DLR002',
      contactPerson: 'Vikram Singh',
      mobile: '9812345679',
      email: 'vikram@vastorakarnal.com',
      address: 'NH-44, Karnal',
      state: 'Haryana',
      district: 'Karnal',
      city: 'Karnal',
      pincode: '132001',
      preferredLanguage: 'Hindi',
      areaManager: areaManager2._id,
      status: 'active',
    },
    {
      dealerName: 'Punjab Agro Dealers',
      dealerCode: 'DLR003',
      contactPerson: 'Harpreet Kaur',
      mobile: '9812345680',
      address: 'Ferozepur Road, Ludhiana',
      state: 'Punjab',
      district: 'Ludhiana',
      city: 'Ludhiana',
      pincode: '141002',
      preferredLanguage: 'Punjabi',
      areaManager: areaManager._id,
      status: 'active',
    },
  ]);

  const firstDealer = await Dealer.findOne({ dealerCode: 'DLR001' });
  const dealerPassword = await bcrypt.hash('dealer123', 10);
  await User.create({
    name: 'Amit Sharma',
    email: 'amit@vastora.com',
    password: dealerPassword,
    role: 'dealer',
    dealerRef: firstDealer._id,
  });

  await Settings.create({
    companyName: 'Vastora',
    companyEmail: 'info@vastora.com',
    companyPhone: '1800-XXX-XXXX',
  });

  console.log('Seed data created successfully!');
  console.log('\n--- Login Credentials ---');
  console.log('Super Admin: superadmin@vastora.com / super123');
  console.log('Admin: admin@vastora.com / admin123');
  console.log('Area Manager 1: rajesh@vastora.com / manager123');
  console.log('Area Manager 2: suresh@vastora.com / manager123');
  console.log('Dealer: amit@vastora.com / dealer123');

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
