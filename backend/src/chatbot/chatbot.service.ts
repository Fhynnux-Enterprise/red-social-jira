import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ChatbotConversation } from './entities/chatbot-conversation.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { StoreProduct } from '../store/entities/store-product.entity';
import { User } from '../auth/entities/user.entity';
import { City } from '../cities/entities/city.entity';

@Injectable()
export class ChatbotService {
  private readonly apiKey = process.env.DEEPSEEK_API_KEY || 'PLACEHOLDER';
  private readonly apiUrl = 'https://api.deepseek.com/v1/chat/completions';

  constructor(
    @InjectRepository(ChatbotConversation)
    private readonly conversationRepository: Repository<ChatbotConversation>,
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
    @InjectRepository(StoreProduct)
    private readonly storeProductRepository: Repository<StoreProduct>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  async handleMessage(userId: string, user: User, text: string): Promise<string> {
    // 0. Obtener detalles de la ciudad de manera dinámica
    let cityName = 'Chunchi';
    try {
      const city = await this.cityRepository.findOne({ where: { id: user.cityId } });
      if (city) {
        cityName = city.name;
      }
    } catch (err) {
      console.error('Error al consultar la ciudad en Chatbot:', err);
    }
    const appName = `${cityName} City App`;

    // 1. Obtener o crear conversación
    let conversation = await this.conversationRepository.findOne({ where: { userId } });
    if (!conversation) {
      conversation = this.conversationRepository.create({ userId, messages: [] });
    }

    // 2. Añadir el nuevo mensaje del usuario
    conversation.messages.push({ role: 'user', content: text });

    // 3. Limitar historial a los últimos 15 mensajes
    if (conversation.messages.length > 15) {
      conversation.messages = conversation.messages.slice(-15);
    }

    // 4. Preparar el System Prompt personalizado con el nombre de la App, de la Ciudad y detalles del usuario
    const systemPrompt = {
      role: 'system',
      content: `Te llamas 'FynnuX' y eres el Asistente Oficial de Inteligencia Artificial de la aplicación '${appName}'. Tu propósito es ayudar a los usuarios de la comunidad de ${cityName} de forma directa y concisa.
Responde siempre en español. Tus respuestas deben ser cortas e instructivas, con un límite máximo de unas 100 palabras. No extiendas tus respuestas innecesariamente, pero si una consulta requiere más detalle (como al listar empleos o servicios), sé lo suficientemente explicativo para ser útil dentro de ese límite.
Usa siempre un tono muy amable y cercano. Estás conversando con ${user.firstName} ${user.lastName}. Su biografía es: "${user.bio || 'Sin biografía'}". Usa estos datos de forma sutil, cercana y natural para personalizar tus respuestas (ej. llamándole por su nombre si es apropiado), pero no los repitas de forma forzada o redundante.
Tienes acceso a herramientas para buscar ofertas de empleo y servicios o productos locales en ${cityName}; úsalas cuando el usuario te lo solicite. No des rodeos. Si la información solicitada no tiene que ver con la comunidad o las herramientas disponibles, responde de forma educada indicando tus límites.`
    };

    // 5. Definición de herramientas (tools) para DeepSeek
    const tools = [
      {
        type: 'function',
        function: {
          name: 'buscar_empleos',
          description: 'Busca ofertas de empleo activas en la plataforma según un término de búsqueda (ej. carpintero, plomero, etc.).',
          parameters: {
            type: 'object',
            properties: {
              termino: {
                type: 'string',
                description: 'El término o profesión a buscar.'
              }
            },
            required: ['termino']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'buscar_servicios',
          description: 'Busca productos o servicios disponibles en la tienda de la plataforma (ej. plomería, comida, clases, etc.).',
          parameters: {
            type: 'object',
            properties: {
              termino: {
                type: 'string',
                description: 'El término o servicio a buscar.'
              }
            },
            required: ['termino']
          }
        }
      }
    ];

    try {
      // 6. Primera llamada a DeepSeek
      const payload: any = {
        model: 'deepseek-chat',
        messages: [systemPrompt, ...conversation.messages],
        tools: tools,
        temperature: 0.7,
      };

      let response = await this.callDeepSeek(payload);
      let responseMessage = response.choices[0].message;

      // 7. Manejar Tool Calls (Function Calling) si DeepSeek solicita invocar herramientas
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Guardamos el mensaje de la llamada a la herramienta en el historial
        conversation.messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let functionResult = '';

          if (functionName === 'buscar_empleos') {
            functionResult = await this.executeSearchJobs(args.termino, user.cityId);
          } else if (functionName === 'buscar_servicios') {
            functionResult = await this.executeSearchServices(args.termino, user.cityId);
          }

          // Añadir el resultado de la herramienta al contexto
          conversation.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: functionName,
            content: functionResult
          } as any);
        }

        // Segunda llamada a DeepSeek con el resultado de la herramienta
        const secondPayload = {
          model: 'deepseek-chat',
          messages: [systemPrompt, ...conversation.messages],
          temperature: 0.7,
        };

        response = await this.callDeepSeek(secondPayload);
        responseMessage = response.choices[0].message;
      }

      // 8. Añadir la respuesta final de la IA al historial
      conversation.messages.push({ role: 'assistant', content: responseMessage.content });

      // Volver a recortar a los últimos 15 si es necesario
      if (conversation.messages.length > 15) {
        conversation.messages = conversation.messages.slice(-15);
      }

      // 9. Guardar conversación en la base de datos
      await this.conversationRepository.save(conversation);

      return responseMessage.content;
    } catch (error) {
      console.error('Error en ChatbotService:', error);
      throw new HttpException(
        'Error al comunicarse con el asistente de Inteligencia Artificial',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async callDeepSeek(payload: any): Promise<any> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private async executeSearchJobs(termino: string, cityId: string): Promise<string> {
    try {
      const palabrasGenericas = ['reciente', 'recientes', 'ultimo', 'ultimos', 'todos', 'todo', 'empleo', 'empleos', 'trabajo', 'trabajos', 'vacante', 'vacantes', 'chunchi', 'alausi'];
      const esGenerico = palabrasGenericas.some(p => termino.toLowerCase().includes(p)) || termino.trim().length <= 2;

      let jobs: JobOffer[] = [];
      if (!esGenerico) {
        jobs = await this.jobOfferRepository.find({
          where: [
            { title: ILike(`%${termino}%`), cityId },
            { description: ILike(`%${termino}%`), cityId }
          ],
          take: 5,
          order: { createdAt: 'DESC' }
        });
      }

      if (jobs.length === 0 || esGenerico) {
        const fallbackJobs = await this.jobOfferRepository.find({
          where: { cityId },
          take: 3,
          order: { createdAt: 'DESC' }
        });
        
        if (fallbackJobs.length === 0) {
          return `No hay ninguna oferta de empleo publicada actualmente en la ciudad.`;
        }

        if (esGenerico) {
          return JSON.stringify(
            fallbackJobs.map(j => ({
              titulo: j.title,
              ubicacion: j.location,
              salario: j.salary || 'No especificado',
              contacto: j.contactPhone || 'No especificado',
              descripcion: j.description.substring(0, 100) + '...',
              enlace: `/jobs/${j.id}`
            }))
          );
        }
        
        return JSON.stringify({
          mensaje: `No se encontraron ofertas específicas de empleo para "${termino}".`,
          sugerencias_recientes: fallbackJobs.map(j => ({
            titulo: j.title,
            ubicacion: j.location,
            salario: j.salary || 'No especificado',
            contacto: j.contactPhone || 'No especificado',
            descripcion: j.description.substring(0, 100) + '...',
            enlace: `/jobs/${j.id}`
          }))
        });
      }

      return JSON.stringify(
        jobs.map(j => ({
          titulo: j.title,
          ubicacion: j.location,
          salario: j.salary || 'No especificado',
          contacto: j.contactPhone || 'No especificado',
          descripcion: j.description.substring(0, 100) + '...',
          enlace: `/jobs/${j.id}`
        }))
      );
    } catch (err) {
      console.error('Error buscando empleos en Chatbot:', err);
      return 'Error al buscar ofertas de empleo en la base de datos.';
    }
  }

  private async executeSearchServices(termino: string, cityId: string): Promise<string> {
    try {
      const palabrasGenericas = ['reciente', 'recientes', 'ultimo', 'ultimos', 'todos', 'todo', 'servicio', 'servicios', 'producto', 'productos', 'tienda', 'venta', 'vende', 'chunchi', 'alausi'];
      const esGenerico = palabrasGenericas.some(p => termino.toLowerCase().includes(p)) || termino.trim().length <= 2;

      let products: StoreProduct[] = [];
      if (!esGenerico) {
        products = await this.storeProductRepository.find({
          where: [
            { title: ILike(`%${termino}%`), cityId, isAvailable: true },
            { description: ILike(`%${termino}%`), cityId, isAvailable: true }
          ],
          take: 5,
          order: { createdAt: 'DESC' }
        });
      }

      if (products.length === 0 || esGenerico) {
        const fallbackProducts = await this.storeProductRepository.find({
          where: { cityId, isAvailable: true },
          take: 3,
          order: { createdAt: 'DESC' }
        });

        if (fallbackProducts.length === 0) {
          return `No hay productos ni servicios disponibles en la tienda actualmente.`;
        }

        if (esGenerico) {
          return JSON.stringify(
            fallbackProducts.map(p => ({
              titulo: p.title,
              precio: `${p.price} ${p.currency || 'USD'}`,
              contacto: p.contactPhone || 'No especificado',
              descripcion: p.description.substring(0, 100) + '...',
              enlace: `/store/${p.id}`
            }))
          );
        }

        return JSON.stringify({
          mensaje: `No se encontraron productos o servicios específicos para "${termino}".`,
          sugerencias_recientes: fallbackProducts.map(p => ({
            titulo: p.title,
            precio: `${p.price} ${p.currency || 'USD'}`,
            contacto: p.contactPhone || 'No especificado',
            descripcion: p.description.substring(0, 100) + '...',
            enlace: `/store/${p.id}`
          }))
        });
      }

      return JSON.stringify(
        products.map(p => ({
          titulo: p.title,
          precio: `${p.price} ${p.currency || 'USD'}`,
          contacto: p.contactPhone || 'No especificado',
          descripcion: p.description.substring(0, 100) + '...',
          enlace: `/store/${p.id}`
        }))
      );
    } catch (err) {
      console.error('Error buscando servicios en Chatbot:', err);
      return 'Error al buscar servicios/productos en la base de datos.';
    }
  }

  async getConversation(userId: string): Promise<ChatbotConversation | null> {
    return this.conversationRepository.findOne({ where: { userId } });
  }

  async deleteMessage(userId: string, content: string, role: string): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne({ where: { userId } });
    if (conversation) {
      const index = conversation.messages.findIndex(m => m.role === role && m.content === content);
      if (index !== -1) {
        conversation.messages.splice(index, 1);
        await this.conversationRepository.save(conversation);
        return true;
      }
    }
    return false;
  }

  async deleteMessagesBulk(userId: string, messagesToDelete: { content: string; role: string }[]): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne({ where: { userId } });
    if (conversation) {
      let modified = false;
      for (const toDelete of messagesToDelete) {
        const index = conversation.messages.findIndex(m => m.role === toDelete.role && m.content === toDelete.content);
        if (index !== -1) {
          conversation.messages.splice(index, 1);
          modified = true;
        }
      }
      if (modified) {
        await this.conversationRepository.save(conversation);
        return true;
      }
    }
    return false;
  }

  async clearConversation(userId: string): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne({ where: { userId } });
    if (conversation) {
      conversation.messages = [];
      await this.conversationRepository.save(conversation);
    }
    return true;
  }
}
