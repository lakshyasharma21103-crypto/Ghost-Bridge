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
    request.observer?.emit('info', 'external_agent.invocation.started', { status: 'started' });
    const parsed = await request.observer.stage('request_validation', async () =>
      invocationSchema.safeParse(request.body),
    );
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
        traceId: request.traceId,
        invocationId: request.invocationId,
        observer: request.observer,
        signal: request.runtimeAbortSignal,
      });
      if (response.writableEnded || response.destroyed) return;
      await request.observer.stage('response_serialization', async () => {
        response.json({
          response: result,
          meta: {
            traceId: request.traceId,
            requestId: request.requestId,
          },
        });
      });
      request.observer?.emit('info', 'external_agent.invocation.completed', {
        status: 'completed',
      });
    } catch (error) {
      request.observer?.emit('error', 'external_agent.invocation.failed', {
        status: 'failed',
        errorCode: error.code,
        stage: error.stage,
      });
      next(error);
    }
  });

  return router;
}

module.exports = {
  invocationSchema,
  researchRouter,
};
