const express = require('express');
const { runMockAgent } = require('../controllers/demoController');

const demoRouter = express.Router();

demoRouter.post('/mock-agent/run', runMockAgent);

module.exports = {
  demoRouter,
};
