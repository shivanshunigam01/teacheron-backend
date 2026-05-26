import { z } from 'zod';
export const idParam=z.object({params:z.object({id:z.string().min(1)})});
export const anyBody=z.object({body:z.record(z.any()).default({}),query:z.record(z.any()).optional(),params:z.record(z.any()).optional()});
