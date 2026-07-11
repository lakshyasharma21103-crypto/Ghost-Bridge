const express = require('express');
const { z } = require('zod');
const { authenticateRuntime } = require('../middleware/authenticateRuntime');
const { researchTopic } = require('../services/research.service');
const { RuntimeError } = require('../utils/errors');

const invocationSchema = z
  .object({
    topic: z.string().trim().min(3).max(1000),
  })
  .strict();

function validationDetails(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

function researchRouter(runtimeToken) {
  const router = express.Router();

  router.post('/invoke', authenticateRuntime(runtimeToken), (request, response, next) => {
    const parsed = invocationSchema.safeParse(request.body);
    if (!parsed.success) {
      next(
        new RuntimeError(
          400,
          'VALIDATION_ERROR',
          'Request validation failed.',
          validationDetails(parsed.error),
        ),
      );
      return;
    }

    response.json({
      response: researchTopic(parsed.data.topic),
      meta: {
        requestId: request.requestId,
      },
    });
  });

  return router;
}

module.exports = {
  invocationSchema,
  researchRouter,
};
