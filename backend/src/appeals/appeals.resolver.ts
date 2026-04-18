import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { Appeal } from './entities/appeal.entity';
import { CreateAppealInput, ResolveAppealInput } from './dto/appeal.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { User } from '../auth/entities/user.entity';

@Resolver(() => Appeal)
export class AppealsResolver {
    constructor(private readonly appealsService: AppealsService) {}

    @Mutation(() => Appeal)
    @UseGuards(GqlAuthGuard)
    createAppeal(
        @Args('input') input: CreateAppealInput,
        @CurrentUser() user: User,
    ): Promise<Appeal> {
        return this.appealsService.createAppeal(user.id, input);
    }

    @Query(() => [Appeal], { name: 'getPendingAppeals' })
    @UseGuards(GqlAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MODERATOR)
    getPendingAppeals(
        @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
        @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    ): Promise<Appeal[]> {
        return this.appealsService.getPendingAppeals(limit, offset);
    }

    @Mutation(() => Appeal)
    @UseGuards(GqlAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MODERATOR)
    resolveAppeal(
        @Args('input') input: ResolveAppealInput,
        @CurrentUser() user: User,
    ): Promise<Appeal> {
        return this.appealsService.resolveAppeal(input, user);
    }
}
