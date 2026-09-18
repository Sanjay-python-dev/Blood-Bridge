import jwt from 'jsonwebtoken';
import { db } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'bloodbridge-jwt-hospital-secret-key-2026';

export function authenticateHospitalToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token required.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const hospital = db.findHospitalById(decoded.hospitalId);

    if (!hospital || !hospital.is_active) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or inactive hospital account.'
      });
    }

    // Attach safe hospital to request
    req.hospital = {
      id: hospital.id,
      hospital_name: hospital.hospital_name,
      name: hospital.hospital_name,
      district: hospital.district,
      location: hospital.location,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      user_key: hospital.user_key
    };
    req.token = token;

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired session token.'
    });
  }
}
