import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

@Entity({
    name: 'users_respect_policy',
})
export class UserRespectPolicy {
    @PrimaryGeneratedColumn('uuid')
    uuid: string;

    @Column({
        type: 'boolean',
        default: false,
    })
    infoReward: boolean;

    @Column({
        type: 'boolean',
        default: false,
    })
    infoPoints: boolean;

    @Column({ nullable: true })
    tenAttendanceExpiry: number;

    @Column({ nullable: true })
    tenParticipationExpiry: number;

    @OneToOne(() => User, (user) => user.respectPolicy, {
        onDelete: 'CASCADE',
    })
    user: User;
}
