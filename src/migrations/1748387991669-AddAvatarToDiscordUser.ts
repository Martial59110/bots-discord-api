import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarToDiscordUser1748387991669 implements MigrationInterface {
    name = 'AddAvatarToDiscordUser1748387991669'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discord_users"
            ADD COLUMN "avatar" varchar(255)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discord_users"
            DROP COLUMN "avatar"
        `);
    }
}
