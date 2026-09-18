/**
 * BloodBridge Hierarchical Location System
 * Structured to support Country -> State / Province -> District / Region -> City.
 * Prepared for multi-country expansion in the future.
 */

export const TAMIL_NADU_DISTRICTS = [
  'Ariyalur',
  'Chengalpattu',
  'Chennai',
  'Coimbatore',
  'Cuddalore',
  'Dharmapuri',
  'Dindigul',
  'Erode',
  'Kallakurichi',
  'Kancheepuram',
  'Karur',
  'Krishnagiri',
  'Madurai',
  'Mayiladuthurai',
  'Nagapattinam',
  'Namakkal',
  'Nilgiris',
  'Perambalur',
  'Pudukkottai',
  'Ramanathapuram',
  'Ranipet',
  'Salem',
  'Sivaganga',
  'Tenkasi',
  'Thanjavur',
  'Theni',
  'Thoothukudi',
  'Tiruchirappalli',
  'Tirunelveli',
  'Tirupathur',
  'Tiruppur',
  'Tiruvallur',
  'Tiruvarur',
  'Vellore',
  'Viluppuram',
  'Virudhunagar'
];

export const locationData = [
  {
    country: 'India',
    code: 'IN',
    states: [
      {
        name: 'Tamil Nadu',
        code: 'TN',
        districts: TAMIL_NADU_DISTRICTS
      },
      {
        name: 'Karnataka',
        code: 'KA',
        districts: [
          'Bengaluru Urban',
          'Bengaluru Rural',
          'Mysuru',
          'Mangaluru (Dakshina Kannada)',
          'Hubballi-Dharwad',
          'Belagavi',
          'Ballari',
          'Tumakuru',
          'Shivamogga',
          'Udupi',
          'Davangere',
          'Kalaburagi',
          'Kolar'
        ]
      },
      {
        name: 'Kerala',
        code: 'KL',
        districts: [
          'Thiruvananthapuram',
          'Ernakulam (Kochi)',
          'Kozhikode',
          'Thrissur',
          'Kollam',
          'Palakkad',
          'Kannur',
          'Alappuzha',
          'Kottayam',
          'Malappuram',
          'Wayanad',
          'Idukki',
          'Kasaragod',
          'Pathanamthitta'
        ]
      },
      {
        name: 'Maharashtra',
        code: 'MH',
        districts: [
          'Mumbai City',
          'Mumbai Suburban',
          'Pune',
          'Nagpur',
          'Thane',
          'Nashik',
          'Chhatrapati Sambhajinagar',
          'Solapur',
          'Kolhapur',
          'Amravati',
          'Navi Mumbai'
        ]
      },
      {
        name: 'Delhi (NCT)',
        code: 'DL',
        districts: [
          'Central Delhi',
          'New Delhi',
          'North Delhi',
          'South Delhi',
          'East Delhi',
          'West Delhi',
          'North East Delhi',
          'South West Delhi',
          'Shahdara'
        ]
      },
      {
        name: 'Andhra Pradesh',
        code: 'AP',
        districts: [
          'Visakhapatnam',
          'Vijayawada (NTR)',
          'Guntur',
          'Tirupati',
          'Kurnool',
          'Nellore',
          'Kakinada',
          'Anantapur'
        ]
      },
      {
        name: 'Telangana',
        code: 'TG',
        districts: [
          'Hyderabad',
          'Rangareddy',
          'Medchal-Malkajgiri',
          'Warangal',
          'Nizamabad',
          'Karimnagar',
          'Khammam'
        ]
      },
      {
        name: 'Gujarat',
        code: 'GJ',
        districts: [
          'Ahmedabad',
          'Surat',
          'Vadodara',
          'Rajkot',
          'Bhavnagar',
          'Jamnagar',
          'Gandhinagar',
          'Junagadh'
        ]
      },
      {
        name: 'West Bengal',
        code: 'WB',
        districts: [
          'Kolkata',
          'North 24 Parganas',
          'South 24 Parganas',
          'Howrah',
          'Hooghly',
          'Darjeeling',
          'Siliguri',
          'Paschim Bardhaman'
        ]
      },
      {
        name: 'Uttar Pradesh',
        code: 'UP',
        districts: [
          'Lucknow',
          'Kanpur Nagar',
          'Varanasi',
          'Noida (Gautam Buddha Nagar)',
          'Ghaziabad',
          'Agra',
          'Prayagraj',
          'Meerut',
          'Gorakhpur',
          'Bareilly'
        ]
      },
      {
        name: 'Rajasthan',
        code: 'RJ',
        districts: [
          'Jaipur',
          'Jodhpur',
          'Udaipur',
          'Kota',
          'Bikaner',
          'Ajmer',
          'Alwar',
          'Bhilwara'
        ]
      },
      {
        name: 'Punjab',
        code: 'PB',
        districts: [
          'Ludhiana',
          'Amritsar',
          'Jalandhar',
          'Patiala',
          'SAS Nagar (Mohali)',
          'Bathinda'
        ]
      },
      {
        name: 'Madhya Pradesh',
        code: 'MP',
        districts: [
          'Indore',
          'Bhopal',
          'Jabalpur',
          'Gwalior',
          'Ujjain',
          'Sagar'
        ]
      },
      {
        name: 'Bihar',
        code: 'BR',
        districts: [
          'Patna',
          'Gaya',
          'Bhagalpur',
          'Muzaffarpur',
          'Darbhanga',
          'Purnia'
        ]
      },
      {
        name: 'Odisha',
        code: 'OD',
        districts: [
          'Bhubaneswar (Khurda)',
          'Cuttack',
          'Rourkela (Sundargarh)',
          'Puri',
          'Sambalpur',
          'Ganjam'
        ]
      },
      {
        name: 'Haryana',
        code: 'HR',
        districts: [
          'Gurugram',
          'Faridabad',
          'Panipat',
          'Ambala',
          'Karnal',
          'Hisar',
          'Rohtak'
        ]
      },
      {
        name: 'Assam',
        code: 'AS',
        districts: [
          'Kamrup Metropolitan (Guwahati)',
          'Dibrugarh',
          'Silchar (Cachar)',
          'Jorhat',
          'Nagaon'
        ]
      },
      {
        name: 'Jharkhand',
        code: 'JH',
        districts: [
          'Ranchi',
          'East Singhbhum (Jamshedpur)',
          'Dhanbad',
          'Bokaro',
          'Hazaribagh'
        ]
      },
      {
        name: 'Chhattisgarh',
        code: 'CG',
        districts: [
          'Raipur',
          'Durg-Bhilai',
          'Bilaspur',
          'Korba',
          'Rajnandgaon'
        ]
      },
      {
        name: 'Uttarakhand',
        code: 'UK',
        districts: [
          'Dehradun',
          'Haridwar',
          'Nainital',
          'Udham Singh Nagar',
          'Rishikesh'
        ]
      },
      {
        name: 'Himachal Pradesh',
        code: 'HP',
        districts: [
          'Shimla',
          'Kangra (Dharamshala)',
          'Mandi',
          'Solan',
          'Kullu'
        ]
      },
      {
        name: 'Goa',
        code: 'GA',
        districts: [
          'North Goa (Panaji)',
          'South Goa (Margao)'
        ]
      },
      {
        name: 'Jammu & Kashmir',
        code: 'JK',
        districts: [
          'Srinagar',
          'Jammu',
          'Anantnag',
          'Baramulla',
          'Udhampur'
        ]
      },
      {
        name: 'Chandigarh (UT)',
        code: 'CH',
        districts: ['Chandigarh']
      },
      {
        name: 'Puducherry (UT)',
        code: 'PY',
        districts: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam']
      },
      {
        name: 'Ladakh (UT)',
        code: 'LA',
        districts: ['Leh', 'Kargil']
      },
      {
        name: 'Tripura',
        code: 'TR',
        districts: ['West Tripura (Agartala)', 'South Tripura', 'North Tripura']
      },
      {
        name: 'Meghalaya',
        code: 'ML',
        districts: ['East Khasi Hills (Shillong)', 'West Garo Hills', 'Ri-Bhoi']
      },
      {
        name: 'Manipur',
        code: 'MN',
        districts: ['Imphal West', 'Imphal East', 'Churachandpur']
      },
      {
        name: 'Nagaland',
        code: 'NL',
        districts: ['Kohima', 'Dimapur', 'Mokokchung']
      },
      {
        name: 'Mizoram',
        code: 'MZ',
        districts: ['Aizawl', 'Lunglei', 'Champhai']
      },
      {
        name: 'Sikkim',
        code: 'SK',
        districts: ['East Sikkim (Gangtok)', 'West Sikkim', 'South Sikkim', 'North Sikkim']
      },
      {
        name: 'Arunachal Pradesh',
        code: 'AR',
        districts: ['Papum Pare (Itanagar)', 'Changlang', 'West Kameng']
      },
      {
        name: 'Andaman & Nicobar Islands (UT)',
        code: 'AN',
        districts: ['South Andaman (Port Blair)', 'North and Middle Andaman', 'Nicobar']
      },
      {
        name: 'Dadra and Nagar Haveli and Daman and Diu (UT)',
        code: 'DN',
        districts: ['Daman', 'Diu', 'Dadra and Nagar Haveli']
      },
      {
        name: 'Lakshadweep (UT)',
        code: 'LD',
        districts: ['Kavaratti', 'Agatti', 'Amini']
      }
    ]
  }
];

export const defaultCountry = 'India';
export const defaultState = 'Tamil Nadu';
export const defaultDistrict = 'Karur';
