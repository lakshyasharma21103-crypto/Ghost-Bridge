import type { AgentPassport } from '@ghostbridge/protocol-core';
import { createGhostBridgeAgent } from '@ghostbridge/native-agent';

declare const passport: AgentPassport;

const agent = createGhostBridgeAgent({ passport });

agent
  .configureAuthorization(async ({ organizationScope }) => ({
    allowed: organizationScope === 'org_demo',
  }))
  .configureLogger({
    info(message, fields) {
      void message;
      void fields;
    },
  })
  .registerCapability<{ name: string; template: string }, { applicationId: string }>('codeforge.create_app', {
    inputContract: {
      type: 'object',
      required: ['name', 'template'],
      properties: { name: { type: 'string' }, template: { type: 'string' } },
      additionalProperties: false,
    },
    outputContract: {
      type: 'object',
      required: ['applicationId'],
      properties: { applicationId: { type: 'string' } },
      additionalProperties: false,
    },
    capabilityVersion: '1.0.0',
    riskCategory: 'low',
    sideEffectCategory: 'none',
    cancellation: true,
    handler: async ({ input, context }) => {
      context.logger.info('Creating a bounded application', {
        invocationId: context.invocationId,
      });
      if (context.signal.aborted) throw new Error('cancelled');
      return {
        outcome: 'completed',
        output: { applicationId: `app-${input.name.toLowerCase().replaceAll(' ', '-')}` },
      };
    },
  });

void agent.listen({ host: '127.0.0.1', port: 8787 });
