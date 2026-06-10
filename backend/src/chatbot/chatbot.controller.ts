import { Controller, Get, Post, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtRestGuard } from '../auth/guards/jwt-rest.guard';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('conversation')
  @UseGuards(JwtRestGuard)
  async getConversation(@Req() req: any) {
    const conversation = await this.chatbotService.getConversation(req.user.id);
    return conversation || { messages: [] };
  }

  @Post('message')
  @UseGuards(JwtRestGuard)
  async sendMessage(@Req() req: any, @Body() body: SendMessageDto) {
    const user = req.user;
    const responseText = await this.chatbotService.handleMessage(user.id, user, body.text);
    return { response: responseText };
  }

  @Delete('message')
  @UseGuards(JwtRestGuard)
  async deleteMessage(@Req() req: any, @Body() body: { text: string; sender: 'user' | 'bot' }) {
    const role = body.sender === 'user' ? 'user' : 'assistant';
    const success = await this.chatbotService.deleteMessage(req.user.id, body.text, role);
    return { success };
  }

  @Delete('messages/bulk')
  @UseGuards(JwtRestGuard)
  async deleteMessagesBulk(@Req() req: any, @Body() body: { messages: { text: string; sender: 'user' | 'bot' }[] }) {
    const messagesToDelete = body.messages.map(m => ({
      content: m.text,
      role: m.sender === 'user' ? 'user' : 'assistant'
    }));
    const success = await this.chatbotService.deleteMessagesBulk(req.user.id, messagesToDelete);
    return { success };
  }

  @Delete('conversation')
  @UseGuards(JwtRestGuard)
  async clearConversation(@Req() req: any) {
    await this.chatbotService.clearConversation(req.user.id);
    return { success: true };
  }
}
