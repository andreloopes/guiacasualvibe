import { z } from 'zod';

export const RestaurantSchema = z.object({
  rank: z
    .number()
    .int()
    .min(1, 'O ranking deve ser maior ou igual a 1')
    .max(100, 'O ranking deve ser menor ou igual a 100'),
  name: z.string().min(1, 'O nome do restaurante não pode estar vazio'),
  city: z.string().min(1, 'A cidade não pode estar vazia'),
  votes: z.number().int().min(0).nullable().optional(),
  description: z.string().min(1, 'A descrição é obrigatória'),
  service: z.string().min(1, 'O endereço e horários de funcionamento são obrigatórios'),
  imageUrl: z.string().url('O link da imagem deve ser uma URL válida').or(z.string().min(1)),
  cuisine: z.string().min(1, 'A culinária principal deve ser informada'),
  price: z.enum(['$', '$$', '$$$', '$$$$'], {
    message: 'A faixa de preço deve ser de $ a $$$$',
  }),
  neighborhood: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
});

export type Restaurant = z.infer<typeof RestaurantSchema>;
export const RestaurantListSchema = z.array(RestaurantSchema);
