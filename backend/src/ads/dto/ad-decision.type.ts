import { ObjectType, Field } from '@nestjs/graphql';
import { LocalAd } from '../../advertisers/entities/local-ad.entity';

@ObjectType()
export class AdDecision {
  @Field()
  type: string; // 'LOCAL' | 'ADMOB'

  @Field(() => LocalAd, { nullable: true })
  localAd?: LocalAd;
}
