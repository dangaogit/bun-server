import { Module } from '@dangao/bun-server';
import { PromptAdminController } from './prompt-admin.controller';

@Module({
  imports: [],
  controllers: [PromptAdminController],
  providers: [],
})
export class PromptAdminModule {}
