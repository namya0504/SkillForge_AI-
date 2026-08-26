import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: 'refresh' }, config.refreshTokenSecret, {
    expiresIn: config.refreshTokenExpiresIn,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.refreshTokenSecret);
};

export const getCookieOptions = () => {
  const isProduction = config.nodeEnv === 'production';
  
  // Parse maxAge from jwtExpiresIn (assuming simple format like '30m')
  let maxAge = 30 * 60 * 1000; // 30 mins default
  if (config.jwtExpiresIn.endsWith('m')) {
    maxAge = parseInt(config.jwtExpiresIn) * 60 * 1000;
  } else if (config.jwtExpiresIn.endsWith('h')) {
    maxAge = parseInt(config.jwtExpiresIn) * 60 * 60 * 1000;
  } else if (config.jwtExpiresIn.endsWith('d')) {
    maxAge = parseInt(config.jwtExpiresIn) * 24 * 60 * 60 * 1000;
  }

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: maxAge,
    path: '/',
  };
};

export const getRefreshCookieOptions = () => {
  const isProduction = config.nodeEnv === 'production';
  
  let maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days default
  const expiresIn = config.refreshTokenExpiresIn;
  if (expiresIn.endsWith('d')) {
    maxAge = parseInt(expiresIn) * 24 * 60 * 60 * 1000;
  } else if (expiresIn.endsWith('h')) {
    maxAge = parseInt(expiresIn) * 60 * 60 * 1000;
  }

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: maxAge,
    path: '/',
  };
};
