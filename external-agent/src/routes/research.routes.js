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

function responseChannelAvailable(response) {
  return (
    response.destroyed !== true && response.writableEnded !== true && response.writable !== false
  );
}

function researchRouter(runtimeToken, researchService, lifecycle) {
  const router = express.Router();

  router.post('/invoke', authenticateRuntime(runtimeToken), async (request, response, next) => {
    let activeRequest;
    try {
      activeRequest = lifecycle?.register({
        invocationId: request.invocationId,
        requestId: request.requestId,
        traceId: request.traceId,
      });
    } catch (error) {
      next(error);
      return;
    }
    request.observer?.emit('info', 'external_agent.invocation.started', { status: 'started' });
    let parsed;
    try {
      parsed = await request.observer.stage('request_validation', async () =>
        invocationSchema.safeParse(request.body),
      );
    } catch (error) {
      activeRequest?.complete();
      next(error);
      return;
    }
    if (!parsed.success) {
      activeRequest?.complete();
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
      const providerSignals = [request.runtimeAbortSignal, activeRequest?.signal].filter(Boolean);
      const providerSignal =
        providerSignals.length > 1 ? AbortSignal.any(providerSignals) : providerSignals[0];
      providerSignal?.throwIfAborted();
      const result = await researchService.researchTopic({
        topic: parsed.data.topic,
        requestId: request.requestId,
        traceId: request.traceId,
        invocationId: request.invocationId,
        observer: request.observer,
        signal: providerSignal,
      });
      providerSignal?.throwIfAborted();
      if (!responseChannelAvailable(response)) return;
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
      if (error?.code === 'REQUEST_CANCELLED') {
        request.observer?.emit('info', 'external_agent.invocation.cancelled', {
          status: 'cancelled',
          errorCode: 'REQUEST_CANCELLED',
          reason: 'CLIENT_DISCONNECTED',
          stage: error.stage,
        });
      } else {
        request.observer?.emit('error', 'external_agent.invocation.failed', {
          status: 'failed',
          errorCode: error.code,
          stage: error.stage,
        });
      }
      if (!responseChannelAvailable(response)) return;
      next(error);
    } finally {
      activeRequest?.complete();
    }
  });

  return router;
}

module.exports = {
  invocationSchema,
  researchRouter,
};
