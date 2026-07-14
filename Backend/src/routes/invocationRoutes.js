const express = require('express');
const {
  listInvocations,
  getInvocation,
  listInvocationAttempts,
} = require('../controllers/invocationController');

const invocationRouter = express.Router();

invocationRouter.get('/', listInvocations);
invocationRouter.get('/:id/attempts', listInvocationAttempts);
invocationRouter.get('/:id', getInvocation);

module.exports = {
  invocationRouter,
};
