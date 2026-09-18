/**
 * Fictional Authorized Hospitals Dataset
 * Used for hospital authorization workflow, Hospital Portal, and Hospital Dashboard.
 */

export const fictionalHospitalsDataset = [
  {
    id: 'hosp-101',
    hospitalId: 'HOSP-TN-KAR-01',
    name: 'Apollo Speciality Hospitals',
    licenseNumber: 'TN-MED-4491-KAR',
    district: 'Karur',
    state: 'Tamil Nadu',
    country: 'India',
    address: 'Trichy Main Road, Karur, Tamil Nadu 639005',
    nodalOfficer: 'Dr. R. Vignesh (Chief Blood Transfusion Officer)',
    contactPhone: '+91 4324 245000',
    email: 'bloodbank.karur@apollo-demo.org',
    authorizationStatus: 'AUTHORIZED',
    authorizedDate: '2026-01-15',
    bloodRequirements: [
      { id: 'br-1', bloodGroup: 'O+', unitsNeeded: 3, urgency: 'Critical', patientCase: 'Acute Cardiac Trauma' },
      { id: 'br-2', bloodGroup: 'B-', unitsNeeded: 2, urgency: 'Urgent', patientCase: 'Orthopedic Fracture' }
    ],
    inventoryStatus: { 'A+': 14, 'A-': 4, 'B+': 10, 'B-': 2, 'AB+': 5, 'AB-': 1, 'O+': 16, 'O-': 3 }
  },
  {
    id: 'hosp-102',
    hospitalId: 'HOSP-TN-CHE-02',
    name: 'MIOT International',
    licenseNumber: 'TN-MED-8812-CHE',
    district: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    address: '4/112, Mount Poonamallee Road, Manapakkam, Chennai 600089',
    nodalOfficer: 'Dr. Sunita Raman (Hematology Director)',
    contactPhone: '+91 44 4200 2288',
    email: 'transfusion@miot-demo.org',
    authorizationStatus: 'AUTHORIZED',
    authorizedDate: '2026-02-01',
    bloodRequirements: [
      { id: 'br-3', bloodGroup: 'A-', unitsNeeded: 2, urgency: 'Critical', patientCase: 'Pediatric ICU' },
      { id: 'br-4', bloodGroup: 'O-', unitsNeeded: 4, urgency: 'Critical', patientCase: 'Organ Transplant Recipient' }
    ],
    inventoryStatus: { 'A+': 22, 'A-': 6, 'B+': 18, 'B-': 4, 'AB+': 8, 'AB-': 2, 'O+': 25, 'O-': 5 }
  },
  {
    id: 'hosp-103',
    hospitalId: 'HOSP-TN-CBE-03',
    name: 'GEM Hospital & Research Centre',
    licenseNumber: 'TN-MED-7719-CBE',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    country: 'India',
    address: '45, Pankaja Mill Road, Ramanathapuram, Coimbatore 641045',
    nodalOfficer: 'Dr. Anand Kumar (Blood Bank In-Charge)',
    contactPhone: '+91 422 232 5100',
    email: 'blooddesk@gem-demo.org',
    authorizationStatus: 'AUTHORIZED',
    authorizedDate: '2026-02-18',
    bloodRequirements: [
      { id: 'br-5', bloodGroup: 'B+', unitsNeeded: 2, urgency: 'Urgent', patientCase: 'Gastroenterology Surgery' }
    ],
    inventoryStatus: { 'A+': 18, 'A-': 5, 'B+': 14, 'B-': 3, 'AB+': 6, 'AB-': 2, 'O+': 19, 'O-': 4 }
  },
  {
    id: 'hosp-104',
    hospitalId: 'HOSP-TN-TRY-04',
    name: 'Kauvery Hospital',
    licenseNumber: 'TN-MED-3312-TRY',
    district: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    country: 'India',
    address: 'No. 1, K.C. Road, Tennur, Trichy 620017',
    nodalOfficer: 'Dr. Preetha Chandran',
    contactPhone: '+91 431 407 7777',
    email: 'bloodbank@kauvery-demo.org',
    authorizationStatus: 'AUTHORIZED',
    authorizedDate: '2026-03-05',
    bloodRequirements: [
      { id: 'br-6', bloodGroup: 'AB+', unitsNeeded: 2, urgency: 'Normal', patientCase: 'Joint Replacement' }
    ],
    inventoryStatus: { 'A+': 12, 'A-': 3, 'B+': 11, 'B-': 2, 'AB+': 4, 'AB-': 1, 'O+': 15, 'O-': 2 }
  },
  {
    id: 'hosp-105',
    hospitalId: 'HOSP-TN-SLM-05',
    name: 'Manipal Hospital Salem',
    licenseNumber: 'TN-MED-9923-SLM',
    district: 'Salem',
    state: 'Tamil Nadu',
    country: 'India',
    address: 'Dalmia Board, Bangalore Highway, Salem 636012',
    nodalOfficer: 'Dr. Sivakumar K (Trauma Care Lead)',
    contactPhone: '+91 427 234 6600',
    email: 'emergency.salem@manipal-demo.org',
    authorizationStatus: 'AUTHORIZED',
    authorizedDate: '2026-03-20',
    bloodRequirements: [
      { id: 'br-7', bloodGroup: 'A+', unitsNeeded: 3, urgency: 'Urgent', patientCase: 'Severe Anemia' }
    ],
    inventoryStatus: { 'A+': 9, 'A-': 2, 'B+': 8, 'B-': 1, 'AB+': 3, 'AB-': 1, 'O+': 12, 'O-': 2 }
  },
  {
    id: 'hosp-106',
    hospitalId: 'HOSP-TN-KAR-06',
    name: 'Government Medical College Hospital, Karur',
    licenseNumber: 'TN-GOV-1021-KAR',
    district: 'Karur',
    state: 'Tamil Nadu',
    country: 'India',
    address: 'Gandhigramam, Karur, Tamil Nadu 639004',
    nodalOfficer: 'Dr. K. Senthil Nathan (Resident Medical Officer)',
    contactPhone: '+91 4324 220011',
    email: 'gmch.karur@tn-gov-demo.in',
    authorizationStatus: 'AUTHORIZED',
    authorizedDate: '2026-01-01',
    bloodRequirements: [
      { id: 'br-8', bloodGroup: 'O+', unitsNeeded: 5, urgency: 'Critical', patientCase: 'Maternity Ward Triage' },
      { id: 'br-9', bloodGroup: 'B+', unitsNeeded: 3, urgency: 'Urgent', patientCase: 'Emergency Trauma Unit' }
    ],
    inventoryStatus: { 'A+': 20, 'A-': 5, 'B+': 16, 'B-': 3, 'AB+': 7, 'AB-': 2, 'O+': 22, 'O-': 4 }
  }
];
