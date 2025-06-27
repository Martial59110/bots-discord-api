import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateDiscriminatorLength1750604132262 implements MigrationInterface {
    name = 'UpdateDiscriminatorLength1750604132262'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "discord_users" DROP COLUMN "discriminator"`);
        await queryRunner.query(`ALTER TABLE "discord_users" ADD "discriminator" character varying(4) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "discord_users" DROP COLUMN "discriminator"`);
        await queryRunner.query(`ALTER TABLE "discord_users" ADD "discriminator" character varying(50) NOT NULL`);
    }

}
