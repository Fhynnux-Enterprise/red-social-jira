import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBlocksService } from './user-blocks.service';
import { UserBlocksResolver } from './user-blocks.resolver';
import { UserBlock } from './entities/user-block.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserBlock, User])],
  providers: [UserBlocksService, UserBlocksResolver],
  exports: [UserBlocksService],
})
export class UserBlocksModule {}
