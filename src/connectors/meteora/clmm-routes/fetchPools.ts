import { Type } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';

import { Solana } from '../../../chains/solana/solana';
import {
  PoolInfo,
  PoolInfoSchema,
  FetchPoolsRequest,
  FetchPoolsRequestType,
} from '../../../schemas/clmm-schema';
import { logger } from '../../../services/logger';
import { Meteora } from '../meteora';
// Using Fastify's native error handling

export const fetchPoolsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: FetchPoolsRequestType;
    Reply: PoolInfo[];
  }>('/fetch-pools', {
    schema: {
      description: 'Fetch info about Meteora pools',
      tags: ['meteora/clmm'],
      querystring: {
        ...FetchPoolsRequest,
        properties: {
          network: { type: 'string', default: 'mainnet-beta' },
          limit: { type: 'number', minimum: 1, default: 10 },
          tokenA: { type: 'string', examples: ['So11111111111111111111111111111111111111112'] },
          tokenB: { type: 'string', examples: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'] },
        },
      },
      response: {
        200: Type.Array(PoolInfoSchema),
      },
    },
    handler: async (request, _reply) => {
      try {
        const { limit, tokenA, tokenB } = request.query;
        const network = request.query.network || 'mainnet-beta';
        logger.info(`Fetching pools for tokenA: ${tokenA}, tokenB: ${tokenB}, network: ${network}`);

        const meteora = await Meteora.getInstance(network);
        const solana = await Solana.getInstance(network);

        const tokenMintA = tokenA;
        const tokenMintB = tokenB;
        
        logger.info(`Using token mint addresses directly - tokenMintA: ${tokenMintA}, tokenMintB: ${tokenMintB}`);

        logger.info(`Calling meteora.getPools with limit: ${limit}, tokenMintA: ${tokenMintA}, tokenMintB: ${tokenMintB}`);
        const pairs = await meteora.getPools(limit, tokenMintA, tokenMintB);
        if (!Array.isArray(pairs)) {
          logger.error('No matching Meteora pools found - pairs is not an array');
          return [];
        }
        logger.info(`Found ${pairs.length} pairs before filtering`);

        const poolInfos = await Promise.all(
          pairs
            .filter((pair) => pair?.publicKey?.toString)
            .map(async (pair) => {
              try {
                return await meteora.getPoolInfo(pair.publicKey.toString());
              } catch (error) {
                logger.error(
                  `Failed to get pool info for ${pair.publicKey.toString()}: ${error.message}`,
                );
                throw fastify.httpErrors.notFound(
                  `Pool not found: ${pair.publicKey.toString()}`,
                );
              }
            }),
        );

        return poolInfos.filter(Boolean);
      } catch (e) {
        logger.error('Error in fetch-pools:', e);
        if (e.statusCode) throw e;
        throw fastify.httpErrors.internalServerError(
          'Error processing the request',
        );
      }
    },
  });
};

export default fetchPoolsRoute;
