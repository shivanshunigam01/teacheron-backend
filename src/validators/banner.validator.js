import { z } from 'zod';
export const createSchema=z.object({body:z.record(z.any())});
export const updateSchema=z.object({body:z.record(z.any()),params:z.record(z.any()).optional()});
