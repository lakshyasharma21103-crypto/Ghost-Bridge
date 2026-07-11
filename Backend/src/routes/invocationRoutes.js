const express = require('express');
const { listInvocations, getInvocation } = require('../controllers/invocationController');

const invocationRouter = express.Router();

invocationRouter.get('/', listInvocations);
invocationRouter.get('/:id', getInvocation);

module.exports = {
  invocationRouter,
};
