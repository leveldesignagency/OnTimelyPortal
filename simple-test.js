console.log('Starting simple test...');

try {
  const express = require('express');
  console.log('Express loaded successfully');
  
  const cors = require('cors');
  console.log('CORS loaded successfully');
  
  const { Resend } = require('resend');
  console.log('Resend loaded successfully');
  
  console.log('All modules loaded successfully!');
} catch (error) {
  console.error('Error loading modules:', error);
} 