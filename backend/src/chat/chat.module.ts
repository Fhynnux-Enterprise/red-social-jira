import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Participant } from './entities/participant.entity';
import { Message } from './entities/message.entity';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Participant, Message, User]),
  ],
  providers: [ChatService, ChatResolver],
  exports: [TypeOrmModule],
})
export class ChatModule {}
