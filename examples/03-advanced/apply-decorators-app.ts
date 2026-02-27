import {
  Application,
  Controller,
  GET,
  applyDecorators,
  ApiOperation,
  Roles,
  Module,
} from '@dangao/bun-server';

// Compose decorators into reusable combinations
const AdminOnly = applyDecorators(
  Roles('admin'),
  ApiOperation({ summary: 'Admin only endpoint' }),
);

const PublicEndpoint = applyDecorators(
  ApiOperation({ summary: 'Public endpoint' }),
);

@Controller('/api/demo')
class DemoController {
  @GET('/admin')
  @AdminOnly
  public getAdminData(): object {
    return { message: 'Admin data', timestamp: Date.now() };
  }

  @GET('/public')
  @PublicEndpoint
  public getPublicData(): object {
    return { message: 'Public data' };
  }
}

@Module({
  controllers: [DemoController],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);
await app.listen();
console.log('Apply Decorators example running at http://localhost:3000');
