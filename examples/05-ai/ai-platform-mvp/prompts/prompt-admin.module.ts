import { Module, PromptModule } from '@dangao/bun-server';
import { PromptAdminController } from './prompt-admin.controller';

@Module({
  imports: [PromptModule],
  controllers: [PromptAdminController],
  providers: [],
})
export class PromptAdminModule {}
