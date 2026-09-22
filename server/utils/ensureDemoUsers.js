import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AreaManager from '../models/AreaManager.js';
import Dealer from '../models/Dealer.js';
import Settings from '../models/Settings.js';

const hash = (plain) => bcrypt.hash(plain, 10);

const upsertUser = async ({ name, email, password, role, extra = {} }) => {
  const passwordHash = await hash(password);
  const normalized = String(email).toLowerCase().trim();
  let user = await User.findOne({ email: normalized });
  if (!user) {
    user = await User.create({
      name,
      email: normalized,
      password: passwordHash,
      role,
      status: 'active',
      ...extra,
    });
    return user;
  }

  user.name = name;
  user.role = role;
  user.status = 'active';
  user.password = passwordHash;
  Object.assign(user, extra);
  await user.save();
  return user;
};

const ensureAmRecord = async ({ employeeId, name, email, mobile, state, district, password }) => {
  const user = await upsertUser({
    name,
    email,
    password,
    role: 'area_manager',
  });

  let am = await AreaManager.findOne({ $or: [{ email }, { employeeId }] });
  if (!am) {
    am = await AreaManager.create({
      employeeId,
      name,
      email,
      mobile,
      state,
      district,
      user: user._id,
      status: 'active',
    });
  } else {
    am.user = user._id;
    am.status = 'active';
    await am.save();
  }

  user.areaManagerRef = am._id;
  await user.save();
  return am;
};

const ensureDealerRecord = async (fields) => {
  let dealer = await Dealer.findOne({ dealerCode: fields.dealerCode });
  if (!dealer) {
    dealer = await Dealer.create(fields);
  } else {
    let changed = false;
    if (fields.email && dealer.email !== fields.email) {
      dealer.email = fields.email;
      changed = true;
    }
    if (!dealer.areaManager && fields.areaManager) {
      dealer.areaManager = fields.areaManager;
      changed = true;
    }
    if (changed) await dealer.save();
  }
  return dealer;
};

const dealerLoginEmail = (dealer) => {
  if (dealer.email) return String(dealer.email).toLowerCase().trim();
  const code = String(dealer.dealerCode || dealer._id).toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `${code}@vastora.com`;
};

const ensureDealerLogin = async (dealer, password = 'dealer123') => {
  let user = await User.findOne({ dealerRef: dealer._id, role: 'dealer' });
  if (user) {
    user.status = 'active';
    await user.save();
    return user;
  }

  let email = dealerLoginEmail(dealer);
  const taken = await User.findOne({ email });
  if (taken && String(taken.dealerRef) !== String(dealer._id)) {
    email = `${String(dealer.dealerCode).toLowerCase()}.login@vastora.com`;
  }

  user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: dealer.contactPerson || dealer.dealerName,
      email,
      password: await hash(password),
      role: 'dealer',
      status: 'active',
      dealerRef: dealer._id,
    });
  } else {
    user.role = 'dealer';
    user.status = 'active';
    user.dealerRef = dealer._id;
    await user.save();
  }

  if (!dealer.email) {
    dealer.email = email;
    await dealer.save();
  }
  return user;
};

const ensureAmLogin = async (am, password = 'manager123') => {
  let user = am.user ? await User.findById(am.user) : null;
  if (!user) user = await User.findOne({ email: String(am.email).toLowerCase() });
  if (!user) {
    user = await User.create({
      name: am.name,
      email: String(am.email).toLowerCase(),
      password: await hash(password),
      role: 'area_manager',
      status: 'active',
      areaManagerRef: am._id,
    });
  } else {
    user.role = 'area_manager';
    user.status = 'active';
    user.areaManagerRef = am._id;
    await user.save();
  }
  if (String(am.user || '') !== String(user._id)) {
    am.user = user._id;
    await am.save();
  }
  return user;
};

export const ensureDemoUsers = async () => {
  const superAdmin = await upsertUser({
    name: 'Super Admin',
    email: 'superadmin@vastora.com',
    password: 'super123',
    role: 'super_admin',
  });

  await upsertUser({
    name: 'Head Office Admin',
    email: 'admin@vastora.com',
    password: 'admin123',
    role: 'admin',
  });

  const areaManager = await ensureAmRecord({
    employeeId: 'AM001',
    name: 'Rajesh Kumar',
    email: 'rajesh@vastora.com',
    mobile: '9876543210',
    state: 'Punjab',
    district: 'Ludhiana',
    password: 'manager123',
  });

  const areaManager2 = await ensureAmRecord({
    employeeId: 'AM002',
    name: 'Suresh Singh',
    email: 'suresh@vastora.com',
    mobile: '9876543211',
    state: 'Haryana',
    district: 'Karnal',
    password: 'manager123',
  });

  const dealer = await ensureDealerRecord({
    dealerName: 'Swaraj Tractors Ludhiana',
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
  });

  await ensureDealerRecord({
    dealerName: 'Swaraj Karnal',
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
  });

  await ensureDealerRecord({
    dealerName: 'Swaraj Agro Dealers',
    dealerCode: 'DLR003',
    contactPerson: 'Harpreet Kaur',
    mobile: '9812345680',
    email: 'harpreet@vastora.com',
    address: 'Ferozepur Road, Ludhiana',
    state: 'Punjab',
    district: 'Ludhiana',
    city: 'Ludhiana',
    pincode: '141002',
    preferredLanguage: 'Punjabi',
    areaManager: areaManager._id,
    status: 'active',
  });

  const allAms = await AreaManager.find();
  for (const am of allAms) {
    await ensureAmLogin(am);
  }

  const allDealers = await Dealer.find();
  for (const row of allDealers) {
    await ensureDealerLogin(row);
  }

  const d1 = await Dealer.findOne({ dealerCode: 'DLR001' });
  const d2 = await Dealer.findOne({ dealerCode: 'DLR002' });
  const d3 = await Dealer.findOne({ dealerCode: 'DLR003' });
  if (d1) await upsertUser({ name: 'Amit Sharma', email: 'amit@vastora.com', password: 'dealer123', role: 'dealer', extra: { dealerRef: d1._id } });
  if (d2) await upsertUser({ name: 'Vikram Singh', email: 'vikram@vastorakarnal.com', password: 'dealer123', role: 'dealer', extra: { dealerRef: d2._id } });
  if (d3) await upsertUser({ name: 'Harpreet Kaur', email: 'harpreet@vastora.com', password: 'dealer123', role: 'dealer', extra: { dealerRef: d3._id } });

  await Settings.findOneAndUpdate(
    {},
    {
      companyName: 'Swaraj',
      companyEmail: 'info@swarajtractors.com',
      companyPhone: '1800 425 0735',
      companyAddress: 'Swaraj Division, Mahindra & Mahindra Ltd., Phase IV, Industrial Area, S.A.S Nagar (Mohali), Punjab - 160055',
      theme: { primaryColor: '#0078D4', secondaryColor: '#1B365D' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { superAdmin, areaManager, dealer };
};
