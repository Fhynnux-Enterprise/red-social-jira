import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotConversation } from './entities/chatbot-conversation.entity';
import { JobOffer } from '../jobs/entities/job-offer.entity';
import { StoreProduct } from '../store/entities/store-product.entity';
import { City } from '../cities/entities/city.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatbotConversation, JobOffer, StoreProduct, City]),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
