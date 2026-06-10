import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  @IsString({ message: 'El mensaje debe ser un texto' })
  text: string;
}
