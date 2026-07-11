const express = require('express');
const { z } = require('zod');
const { authenticateRuntime } = require('../middleware/authenticateRuntime');
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

function researchRouter(runtimeToken, researchService) {
  const router = express.Router();

  router.post('/invoke', authenticateRuntime(runtimeToken), async (request, response, next) => {
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

    try {
      const result = await researchService.researchTopic({
        topic: parsed.data.topic,
        requestId: request.requestId,
        signal: request.runtimeAbortSignal,
      });
      if (response.writableEnded || response.destroyed) return;
      response.json({
        response: result,
        meta: {
          requestId: request.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  invocationSchema,
  researchRouter,
};
