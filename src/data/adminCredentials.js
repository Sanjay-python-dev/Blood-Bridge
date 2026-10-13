/**
 * BloodBridge Official Administrator Roster & Credentials
 * Strictly limited to the 10 authorized administrator accounts specified in the Admin Portal specification.
 * 
 * Password Format: First 3 letters of admin name + # + 4-digit sequence number.
 */

export const ADMIN_ACCOUNTS = [
  {
    sNo: 1,
    id: 'admin-manick-001',
    name: 'Manick',
    username: 'manick_admin',
    email: 'manick_admin@bloodbridge.org',
    password: 'Man#1001',
    role: 'ADMIN',
    designation: 'Senior System Administrator',
    department: 'Central Blood Operations',
  },
  {
    sNo: 2,
    id: 'admin-sanjayraj-002',
    name: 'Sanjay Raj',
    username: 'sanjayraj_admin',
    email: 'sanjayraj_admin@bloodbridge.org',
    password: 'San#1002',
    role: 'ADMIN',
    designation: 'Lead Platform Administrator',
    department: 'Technical & System Architecture',
  },
  {
    sNo: 3,
    id: 'admin-kumaravel-003',
    name: 'Kumaravel',
    username: 'kumaravel_admin',
    email: 'kumaravel_admin@bloodbridge.org',
    password: 'Kum#1003',
    role: 'ADMIN',
    designation: 'Operations Administrator',
    department: 'Donor Registry Management',
  },
  {
    sNo: 4,
    id: 'admin-murugavel-004',
    name: 'Murugavel',
    username: 'murugavel_admin',
    email: 'murugavel_admin@bloodbridge.org',
    password: 'Mur#1004',
    role: 'ADMIN',
    designation: 'Hospital Logistics Administrator',
    department: 'Clinical Verification Desk',
  },
  {
    sNo: 5,
    id: 'admin-prabhakaran-005',
    name: 'Prabhakaran',
    username: 'prabhakaran_admin',
    email: 'prabhakaran_admin@bloodbridge.org',
    password: 'Pra#1005',
    role: 'ADMIN',
    designation: 'Emergency Triage Administrator',
    department: 'Critical Blood Dispatch',
  },
  {
    sNo: 6,
    id: 'admin-dhinesh-006',
    name: 'Dhinesh',
    username: 'dhinesh_admin',
    email: 'dhinesh_admin@bloodbridge.org',
    password: 'Dhi#1006',
    role: 'ADMIN',
    designation: 'Regional Coordinator Admin',
    department: 'District Blood Bank Network',
  },
  {
    sNo: 7,
    id: 'admin-kumar-007',
    name: 'Kumar',
    username: 'kumar_admin',
    email: 'kumar_admin@bloodbridge.org',
    password: 'Kum#1007',
    role: 'ADMIN',
    designation: 'Verification Administrator',
    department: 'Clinical Eligibility Oversight',
  },
  {
    sNo: 8,
    id: 'admin-jenisha-008',
    name: 'Jenisha',
    username: 'jenisha_admin',
    email: 'jenisha_admin@bloodbridge.org',
    password: 'Jen#1008',
    role: 'ADMIN',
    designation: 'Rare Phenotype Administrator',
    department: 'Bombay Blood Group Protocol Desk',
  },
  {
    sNo: 9,
    id: 'admin-sobana-009',
    name: 'Nagarani (alias Sobana)',
    username: 'sobana_admin',
    email: 'sobana_admin@bloodbridge.org',
    password: 'Nag#1009',
    role: 'ADMIN',
    designation: 'Quality & Audit Administrator',
    department: 'Compliance & Data Protection',
  },
  {
    sNo: 10,
    id: 'admin-apunitha-010',
    name: 'A. Punitha',
    username: 'apunitha_admin',
    email: 'apunitha_admin@bloodbridge.org',
    password: 'Pun#1010',
    role: 'ADMIN',
    designation: 'Security & Access Administrator',
    department: 'Administrative Security Operations',
  },
];

/**
 * Normalizes an identifier string (username or email).
 */
export const normalizeIdentifier = (identifier) => {
  if (!identifier) return '';
  const clean = String(identifier).trim().toLowerCase();
  // If email format, get username prefix if it matches an admin username
  if (clean.includes('@')) {
    return clean.split('@')[0];
  }
  return clean;
};

/**
 * Finds an admin account strictly by username or email.
 */
export const findAdminAccount = (identifier) => {
  if (!identifier) return null;
  const rawClean = String(identifier).trim().toLowerCase();
  const usernamePart = normalizeIdentifier(identifier);

  return (
    ADMIN_ACCOUNTS.find(
      (acc) =>
        acc.username.toLowerCase() === rawClean ||
        acc.username.toLowerCase() === usernamePart ||
        acc.email.toLowerCase() === rawClean
    ) || null
  );
};

/**
 * Verifies credentials strictly against the authorized 10 admin accounts.
 * Throws a descriptive error if invalid, or returns the sanitized admin profile.
 */
export const verifyAdminCredentials = (identifier, password) => {
  if (!identifier || !String(identifier).trim()) {
    throw new Error('Please enter Administrator Username or Email.');
  }

  if (!password || !String(password).trim()) {
    throw new Error('Please enter Administrator Password.');
  }

  const account = findAdminAccount(identifier);

  if (!account) {
    throw new Error(
      'Access Denied: Unrecognized administrator. Only the 10 authorized administrator accounts can access this console.'
    );
  }

  const cleanPassword = String(password).trim();
  if (account.password !== cleanPassword) {
    throw new Error('Access Denied: Incorrect password for administrator ' + account.name + '.');
  }

  return {
    id: account.id,
    sNo: account.sNo,
    name: account.name,
    username: account.username,
    email: account.email,
    role: account.role,
    designation: account.designation,
    department: account.department,
  };
};
