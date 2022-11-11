import {
    IsEmail,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Validate,
} from 'class-validator';
import { EpochValidator } from '../../../../modules/common/validator/epoch.validator';
import { ResponseMessage } from '../../../../utils/enum';
import { AddRewardType, RewardType } from '../../../payment/common/payment.enums';
import { UUIDDto } from '../../../common/dtos/index.dtos';

export class RewardUserHistoryDTO {
    @IsString()
    @IsOptional()
    email: string;

    @IsString()
    @IsOptional()
    nickName: string;

    @IsString()
    @IsOptional()
    adminEmail: string;

    @IsEnum(RewardType)
    @IsOptional()
    type: string;
}

export class SaveRewardDTO extends UUIDDto {
    @IsEnum(AddRewardType)
    type: string;

    @Validate(EpochValidator, {
        message: `${ResponseMessage.INVALID_PARAMETER} som`,
    })
    som: string;

    @IsString()
    reason: string;
}
