import { Column, Entity } from 'typeorm';

@Entity('account_pairs', { schema: 'public' })
export class AccountPairs {
    @Column('varchar', { name: 'substrate', length: 128, primary: true })
    substrate: string;

    @Column('varchar', { name: 'ethereum', length: 128, primary: true })
    ethereum: string;
}
